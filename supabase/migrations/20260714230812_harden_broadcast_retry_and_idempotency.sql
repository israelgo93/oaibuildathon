alter table public.broadcast_recipients
  add column retryable boolean not null default true,
  add column idempotency_key text,
  add column last_status_code integer;

update public.broadcast_recipients
set
  idempotency_key = 'broadcast/v2/' || campaign_id::text || '/' || batch_number::text,
  retryable = case
    when status = 'sent' then false
    when status = 'failed' and (
      last_error_code = 'validation_error'
      or last_error_code = 'max_attempts'
      or last_error_code like 'invalid_%'
      or last_error_code like 'missing_%'
      or last_error_code like 'restricted_%'
    ) then false
    else true
  end;

alter table public.broadcast_recipients
  alter column idempotency_key set not null,
  add constraint broadcast_recipients_idempotency_key_check
    check (char_length(idempotency_key) between 1 and 200),
  add constraint broadcast_recipients_last_status_code_check
    check (last_status_code is null or last_status_code between 100 and 599);

create index broadcast_recipients_retryable_idx
  on public.broadcast_recipients (campaign_id, batch_number, batch_position)
  where retryable and attempts < 20 and status in ('pending', 'processing', 'failed');

create or replace function public.create_broadcast_campaign(
  p_event_id uuid,
  p_created_by uuid,
  p_request_id uuid,
  p_subject text,
  p_message_text text,
  p_cta_key text,
  p_recipients jsonb
)
returns public.broadcast_campaigns
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.broadcast_campaigns;
  v_recipient_count integer;
begin
  if jsonb_typeof(p_recipients) <> 'array' then
    raise exception 'recipient_list_invalid';
  end if;

  select count(*)::integer
  into v_recipient_count
  from jsonb_array_elements_text(p_recipients);

  if v_recipient_count < 1 or v_recipient_count > 500 then
    raise exception 'recipient_count_invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_request_id::text, 0)
  );

  select *
  into v_campaign
  from public.broadcast_campaigns
  where request_id = p_request_id;

  if found then
    return v_campaign;
  end if;

  insert into public.broadcast_campaigns (
    event_id,
    created_by,
    request_id,
    subject,
    message_text,
    cta_key,
    recipient_count
  ) values (
    p_event_id,
    p_created_by,
    p_request_id,
    p_subject,
    p_message_text,
    p_cta_key,
    v_recipient_count
  )
  returning * into v_campaign;

  insert into public.broadcast_recipients (
    campaign_id,
    email,
    batch_number,
    batch_position,
    idempotency_key
  )
  select
    v_campaign.id,
    recipient.email,
    ((recipient.ordinality - 1) / 100)::integer,
    ((recipient.ordinality - 1) % 100)::smallint,
    'broadcast/v2/' || v_campaign.id::text || '/' ||
      (((recipient.ordinality - 1) / 100)::integer)::text
  from jsonb_array_elements_text(p_recipients) with ordinality as recipient(email, ordinality);

  return v_campaign;
end;
$$;

create or replace function public.resume_broadcast_campaign(p_campaign_id uuid)
returns public.broadcast_campaigns
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.broadcast_campaigns;
  v_eligible_count integer := 0;
  v_sent_count integer := 0;
  v_failed_count integer := 0;
  v_final_status text;
begin
  select *
  into v_campaign
  from public.broadcast_campaigns
  where id = p_campaign_id
  for update;

  if not found then
    return null;
  end if;

  if v_campaign.status = 'queued' then
    update public.broadcast_recipients
    set
      status = 'failed',
      retryable = false,
      last_error_code = 'max_attempts',
      last_status_code = null,
      provider_id = null,
      sent_at = null
    where campaign_id = v_campaign.id
      and status = 'pending'
      and (not retryable or attempts >= 20);

    update public.broadcast_recipients
    set
      status = 'processing',
      attempts = attempts + 1,
      provider_id = null,
      last_error_code = null,
      last_status_code = null,
      sent_at = null
    where campaign_id = v_campaign.id
      and status = 'pending'
      and retryable
      and attempts < 20;
  elsif v_campaign.status = 'processing'
    and v_campaign.updated_at <= now() - interval '15 minutes' then
    update public.broadcast_recipients
    set
      status = 'failed',
      retryable = false,
      last_error_code = 'max_attempts',
      last_status_code = null,
      provider_id = null,
      sent_at = null
    where campaign_id = v_campaign.id
      and status = 'processing'
      and (not retryable or attempts >= 20);

    update public.broadcast_recipients
    set
      attempts = attempts + 1,
      provider_id = null,
      last_error_code = null,
      last_status_code = null,
      sent_at = null
    where campaign_id = v_campaign.id
      and status = 'processing'
      and retryable
      and attempts < 20;
  elsif v_campaign.status in ('partial', 'failed') then
    update public.broadcast_recipients
    set
      retryable = false,
      last_error_code = case
        when attempts >= 20 then 'max_attempts'
        else last_error_code
      end,
      last_status_code = case
        when attempts >= 20 then null
        else last_status_code
      end
    where campaign_id = v_campaign.id
      and status = 'failed'
      and (not retryable or attempts >= 20);

    update public.broadcast_recipients
    set
      status = 'processing',
      attempts = attempts + 1,
      provider_id = null,
      last_error_code = null,
      last_status_code = null,
      sent_at = null
    where campaign_id = v_campaign.id
      and status = 'failed'
      and retryable
      and attempts < 20;
  else
    return null;
  end if;

  get diagnostics v_eligible_count = row_count;

  select
    count(*) filter (where status = 'sent')::integer,
    count(*) filter (where status = 'failed')::integer
  into v_sent_count, v_failed_count
  from public.broadcast_recipients
  where campaign_id = v_campaign.id;

  if v_eligible_count = 0 then
    v_final_status := case
      when v_sent_count = v_campaign.recipient_count then 'completed'
      when v_failed_count = v_campaign.recipient_count then 'failed'
      else 'partial'
    end;

    update public.broadcast_campaigns
    set
      status = v_final_status,
      sent_count = v_sent_count,
      failed_count = v_failed_count,
      completed_at = now()
    where id = v_campaign.id;

    return null;
  end if;

  update public.broadcast_campaigns
  set
    status = 'processing',
    dispatch_version = dispatch_version + 1,
    sent_count = v_sent_count,
    failed_count = v_failed_count,
    started_at = now(),
    completed_at = null
  where id = v_campaign.id
  returning * into v_campaign;

  return v_campaign;
end;
$$;

revoke all on function public.resume_broadcast_campaign(uuid)
  from public, anon, authenticated;
grant execute on function public.resume_broadcast_campaign(uuid)
  to service_role;

revoke all on function public.create_broadcast_campaign(uuid, uuid, uuid, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_broadcast_campaign(uuid, uuid, uuid, text, text, text, jsonb)
  to service_role;
