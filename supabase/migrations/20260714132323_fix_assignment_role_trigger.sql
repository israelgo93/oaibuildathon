-- Evita acceder a columnas que no existen en el registro NEW de la otra tabla.

create or replace function private.validate_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  team_event_id uuid;
  profile_id uuid;
  profile_role public.user_role;
  expected_role public.user_role;
begin
  select event_id into team_event_id
  from public.teams
  where id = new.team_id;

  if team_event_id is null or team_event_id <> new.event_id then
    raise exception 'El equipo no pertenece al evento de la asignacion';
  end if;

  if tg_table_name = 'judge_assignments' then
    profile_id := (to_jsonb(new) ->> 'judge_id')::uuid;
    expected_role := 'judge'::public.user_role;
  elsif tg_table_name = 'mentor_assignments' then
    profile_id := (to_jsonb(new) ->> 'mentor_id')::uuid;
    expected_role := 'mentor'::public.user_role;
  else
    raise exception 'La tabla de asignacion no esta soportada';
  end if;

  select role into profile_role
  from public.profiles
  where id = profile_id
    and active;

  if profile_role is distinct from expected_role then
    if expected_role = 'judge'::public.user_role then
      raise exception 'El perfil asignado no es jurado';
    end if;

    raise exception 'El perfil asignado no es mentor';
  end if;

  return new;
end;
$$;
