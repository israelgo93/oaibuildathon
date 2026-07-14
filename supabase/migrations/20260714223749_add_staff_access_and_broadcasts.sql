alter table public.profiles
  add column must_change_password boolean not null default false,
  add column temporary_password_expires_at timestamptz,
  add column password_changed_at timestamptz,
  add column credential_version integer not null default 0,
  add column access_email_status text not null default 'not_sent',
  add column access_email_attempted_at timestamptz,
  add column access_email_sent_at timestamptz,
  add column access_email_error_code text;

alter table public.profiles
  add constraint profiles_access_email_status_check
  check (access_email_status in ('not_sent', 'sending', 'sent', 'failed')),
  add constraint profiles_credential_version_check
  check (credential_version >= 0);

create or replace function private.handle_password_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.encrypted_password is distinct from new.encrypted_password then
    update public.profiles
    set
      must_change_password = false,
      temporary_password_expires_at = null,
      password_changed_at = now()
    where id = new.id;
  end if;

  return new;
end;
$$;

create trigger auth_user_password_changed
after update of encrypted_password on auth.users
for each row execute function private.handle_password_change();

revoke all on function private.handle_password_change() from public, anon, authenticated;

create table public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null check (length(email_hash) = 64),
  ip_hash text not null check (length(ip_hash) = 64),
  outcome text not null default 'ignored'
    check (outcome in ('ignored', 'sent', 'failed', 'rate_limited')),
  requested_at timestamptz not null default now()
);

create index password_reset_requests_email_recent_idx
  on public.password_reset_requests (email_hash, requested_at desc);
create index password_reset_requests_ip_recent_idx
  on public.password_reset_requests (ip_hash, requested_at desc);

create table public.broadcast_campaigns (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  request_id uuid not null unique,
  subject text not null check (char_length(subject) between 1 and 150),
  message_text text not null check (char_length(message_text) between 1 and 5000),
  cta_key text not null check (cta_key in ('none', 'landing', 'registration', 'team_portal', 'staff_login')),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'partial', 'failed')),
  dispatch_version integer not null default 0 check (dispatch_version >= 0),
  recipient_count integer not null check (recipient_count between 1 and 500),
  sent_count integer not null default 0 check (sent_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sent_count + failed_count <= recipient_count)
);

create table public.broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.broadcast_campaigns(id) on delete cascade,
  email text not null check (
    char_length(email) between 3 and 254
    and email = lower(btrim(email))
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  batch_number integer not null check (batch_number between 0 and 4),
  batch_position smallint not null check (batch_position between 0 and 99),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 20),
  provider_id text,
  last_error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, email),
  unique (campaign_id, batch_number, batch_position)
);

create index broadcast_campaigns_created_at_idx
  on public.broadcast_campaigns (created_at desc);
create index broadcast_recipients_pending_idx
  on public.broadcast_recipients (campaign_id, batch_number, batch_position)
  where status in ('pending', 'processing', 'failed');

create trigger broadcast_campaigns_set_updated_at
before update on public.broadcast_campaigns
for each row execute function private.set_updated_at();

create trigger broadcast_recipients_set_updated_at
before update on public.broadcast_recipients
for each row execute function private.set_updated_at();

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
    batch_position
  )
  select
    v_campaign.id,
    recipient.email,
    ((recipient.ordinality - 1) / 100)::integer,
    ((recipient.ordinality - 1) % 100)::smallint
  from jsonb_array_elements_text(p_recipients) with ordinality as recipient(email, ordinality);

  return v_campaign;
end;
$$;

create or replace function public.claim_broadcast_campaign(p_campaign_id uuid)
returns public.broadcast_campaigns
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.broadcast_campaigns;
begin
  update public.broadcast_campaigns
  set
    status = 'processing',
    dispatch_version = dispatch_version + 1,
    started_at = now(),
    completed_at = null
  where id = p_campaign_id
    and (
      status in ('queued', 'partial', 'failed')
      or (status = 'processing' and updated_at < now() - interval '15 minutes')
    )
  returning * into v_campaign;

  return v_campaign;
end;
$$;

alter table public.password_reset_requests enable row level security;
alter table public.broadcast_campaigns enable row level security;
alter table public.broadcast_recipients enable row level security;

revoke all on table public.password_reset_requests from public, anon, authenticated;
revoke all on table public.broadcast_campaigns from public, anon, authenticated;
revoke all on table public.broadcast_recipients from public, anon, authenticated;
revoke all on function public.create_broadcast_campaign(uuid, uuid, uuid, text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.claim_broadcast_campaign(uuid)
  from public, anon, authenticated;

grant all on table public.password_reset_requests to service_role;
grant all on table public.broadcast_campaigns to service_role;
grant all on table public.broadcast_recipients to service_role;
grant execute on function public.create_broadcast_campaign(uuid, uuid, uuid, text, text, text, jsonb)
  to service_role;
grant execute on function public.claim_broadcast_campaign(uuid)
  to service_role;
