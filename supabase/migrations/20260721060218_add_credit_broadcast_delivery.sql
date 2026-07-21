alter table public.broadcast_campaigns
  add column kind text not null default 'message';

alter table public.broadcast_campaigns
  add constraint broadcast_campaigns_kind_check
  check (kind in ('message', 'credit'));

alter table public.broadcast_recipients
  add column api_credit_code text,
  add column codex_credit_url text;

alter table public.broadcast_recipients
  add constraint broadcast_recipients_api_credit_code_check
    check (api_credit_code is null or char_length(api_credit_code) between 4 and 120),
  add constraint broadcast_recipients_codex_credit_url_check
    check (
      codex_credit_url is null
      or (char_length(codex_credit_url) between 12 and 500 and codex_credit_url like 'https://%')
    );

create or replace function public.create_credit_broadcast_campaign(
  p_event_id uuid,
  p_created_by uuid,
  p_request_id uuid,
  p_subject text,
  p_message_text text,
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
  from jsonb_array_elements(p_recipients);

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
    kind,
    recipient_count
  ) values (
    p_event_id,
    p_created_by,
    p_request_id,
    p_subject,
    p_message_text,
    'none',
    'credit',
    v_recipient_count
  )
  returning * into v_campaign;

  insert into public.broadcast_recipients (
    campaign_id,
    email,
    api_credit_code,
    codex_credit_url,
    batch_number,
    batch_position,
    idempotency_key
  )
  select
    v_campaign.id,
    lower(btrim(recipient.value ->> 'email')),
    btrim(recipient.value ->> 'api_credit'),
    btrim(recipient.value ->> 'codex_credit'),
    ((recipient.ordinality - 1) / 100)::integer,
    ((recipient.ordinality - 1) % 100)::smallint,
    'broadcast/v2/' || v_campaign.id::text || '/' ||
      (((recipient.ordinality - 1) / 100)::integer)::text
  from jsonb_array_elements(p_recipients) with ordinality as recipient(value, ordinality);

  return v_campaign;
end;
$$;

revoke all on function public.create_credit_broadcast_campaign(uuid, uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_credit_broadcast_campaign(uuid, uuid, uuid, text, text, jsonb)
  to service_role;
