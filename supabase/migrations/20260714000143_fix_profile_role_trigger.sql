create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
  safe_role public.user_role;
begin
  requested_role := new.raw_app_meta_data ->> 'role';

  if requested_role is null or requested_role not in ('admin', 'judge', 'mentor') then
    return new;
  end if;

  safe_role := requested_role::public.user_role;

  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    safe_role,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, '')
  )
  on conflict (id) do update set
    role = excluded.role,
    full_name = excluded.full_name,
    email = excluded.email,
    active = true;

  return new;
end;
$$;
