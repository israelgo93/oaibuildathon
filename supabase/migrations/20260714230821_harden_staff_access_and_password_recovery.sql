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
      must_change_password = case
        when access_email_status = 'sending'
          and access_email_attempted_at >= now() - interval '15 minutes'
          then true
        else false
      end,
      temporary_password_expires_at = case
        when access_email_status = 'sending'
          and access_email_attempted_at >= now() - interval '15 minutes'
          then temporary_password_expires_at
        else null
      end,
      password_changed_at = case
        when access_email_status = 'sending'
          and access_email_attempted_at >= now() - interval '15 minutes'
          then null
        else now()
      end
    where id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function private.handle_password_change() from public, anon, authenticated;

create or replace function public.claim_password_reset_request(
  p_email_hash text,
  p_ip_hash text,
  p_window_minutes integer,
  p_email_limit integer,
  p_ip_limit integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email_lock bigint;
  v_ip_lock bigint;
  v_email_count integer;
  v_ip_count integer;
  v_request_id uuid;
  v_window_start timestamptz;
begin
  if p_email_hash !~ '^[0-9a-f]{64}$' or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'password_reset_hash_invalid';
  end if;

  if p_window_minutes < 1 or p_window_minutes > 1440
    or p_email_limit < 1 or p_email_limit > 100
    or p_ip_limit < 1 or p_ip_limit > 1000 then
    raise exception 'password_reset_limit_invalid';
  end if;

  v_email_lock := pg_catalog.hashtextextended('password-reset/email/' || p_email_hash, 0);
  v_ip_lock := pg_catalog.hashtextextended('password-reset/ip/' || p_ip_hash, 0);

  if v_email_lock < v_ip_lock then
    perform pg_catalog.pg_advisory_xact_lock(v_email_lock);
    perform pg_catalog.pg_advisory_xact_lock(v_ip_lock);
  elsif v_ip_lock < v_email_lock then
    perform pg_catalog.pg_advisory_xact_lock(v_ip_lock);
    perform pg_catalog.pg_advisory_xact_lock(v_email_lock);
  else
    perform pg_catalog.pg_advisory_xact_lock(v_email_lock);
  end if;

  v_window_start := now() - pg_catalog.make_interval(mins => p_window_minutes);

  select count(*)::integer
  into v_email_count
  from public.password_reset_requests
  where email_hash = p_email_hash
    and requested_at >= v_window_start;

  select count(*)::integer
  into v_ip_count
  from public.password_reset_requests
  where ip_hash = p_ip_hash
    and requested_at >= v_window_start;

  if v_email_count >= p_email_limit or v_ip_count >= p_ip_limit then
    return null;
  end if;

  insert into public.password_reset_requests (email_hash, ip_hash, outcome)
  values (p_email_hash, p_ip_hash, 'ignored')
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.claim_password_reset_request(text, text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_password_reset_request(text, text, integer, integer, integer)
  to service_role;
