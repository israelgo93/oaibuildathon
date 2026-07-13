-- OpenAI Build Week Manta: esquema inicial de la plataforma de Buildathon.
-- Todas las operaciones de negocio pasan por Vercel Functions. Las tablas
-- permanecen sin permisos directos para anon/authenticated como defensa extra.

create schema if not exists private;
revoke all on schema private from public;

create type public.user_role as enum ('admin', 'judge', 'mentor');
create type public.team_status as enum ('registered', 'active', 'withdrawn', 'disqualified');
create type public.submission_status as enum ('draft', 'submitted', 'published');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text not null default '',
  location text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  submissions_close_at timestamptz,
  scoring_opens_at timestamptz,
  scoring_closes_at timestamptz,
  registration_open boolean not null default true,
  submissions_open boolean not null default true,
  scoring_open boolean not null default false,
  results_public boolean not null default false,
  showcase_enabled boolean not null default true,
  min_team_size smallint not null default 1,
  max_team_size smallint not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_valid_dates check (ends_at > starts_at),
  constraint events_valid_team_size check (
    min_team_size between 1 and 3
    and max_team_size between min_team_size and 3
  )
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_unique on public.profiles (lower(email));

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  description text not null,
  requirements text not null default '',
  active boolean not null default true,
  max_teams integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint challenges_positive_capacity check (max_teams is null or max_teams > 0),
  constraint challenges_event_identity unique (id, event_id),
  constraint challenges_title_unique unique (event_id, title)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  organization text not null default '',
  city text not null default '',
  contact_email text not null,
  contact_phone text not null default '',
  status public.team_status not null default 'registered',
  registration_code text not null,
  management_token_hash text not null,
  registered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_event_identity unique (id, event_id),
  constraint teams_registration_code_unique unique (event_id, registration_code)
);

create unique index teams_name_unique on public.teams (event_id, lower(name));
create index teams_event_status_idx on public.teams (event_id, status);
create index teams_management_token_idx on public.teams (management_token_hash);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  event_id uuid not null,
  position smallint not null,
  full_name text not null,
  email text not null,
  phone text not null default '',
  city text not null default '',
  member_role text not null default '',
  is_primary_contact boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_members_team_fk foreign key (team_id, event_id)
    references public.teams (id, event_id) on delete cascade,
  constraint team_members_position_range check (position between 1 and 3),
  constraint team_members_position_unique unique (team_id, position)
);

create unique index team_members_event_email_unique
  on public.team_members (event_id, lower(email));
create unique index team_members_primary_contact_unique
  on public.team_members (team_id)
  where is_primary_contact;

create table public.team_challenges (
  team_id uuid not null,
  challenge_id uuid not null,
  event_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (team_id, challenge_id),
  constraint team_challenges_team_fk foreign key (team_id, event_id)
    references public.teams (id, event_id) on delete cascade,
  constraint team_challenges_challenge_fk foreign key (challenge_id, event_id)
    references public.challenges (id, event_id) on delete cascade,
  constraint one_challenge_per_team unique (team_id)
);

create table public.project_submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  event_id uuid not null,
  project_name text not null default '',
  short_description text not null default '',
  problem text not null default '',
  solution text not null default '',
  tech_stack text[] not null default '{}',
  repository_url text not null default '',
  demo_url text not null default '',
  presentation_url text not null default '',
  video_url text not null default '',
  status public.submission_status not null default 'draft',
  submitted_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_submissions_team_fk foreign key (team_id, event_id)
    references public.teams (id, event_id) on delete cascade,
  constraint one_submission_per_team unique (team_id)
);

create index project_submissions_showcase_idx
  on public.project_submissions (event_id, status, published_at desc);

create table public.evaluation_criteria (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  description text not null,
  max_score numeric(6,2) not null,
  weight numeric(6,3) not null default 1,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_criteria_max_score check (max_score > 0 and max_score <= 100),
  constraint evaluation_criteria_weight check (weight > 0 and weight <= 100),
  constraint evaluation_criteria_name_unique unique (event_id, name)
);

create table public.judge_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  judge_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint judge_assignments_unique unique (judge_id, team_id)
);

create index judge_assignments_judge_idx on public.judge_assignments (judge_id, event_id);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  judge_id uuid not null references public.profiles (id) on delete cascade,
  general_feedback text not null default '',
  submitted boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluations_judge_team_unique unique (judge_id, team_id)
);

create table public.evaluation_scores (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations (id) on delete cascade,
  criterion_id uuid not null references public.evaluation_criteria (id) on delete cascade,
  score numeric(6,2) not null,
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_scores_non_negative check (score >= 0),
  constraint evaluation_scores_unique unique (evaluation_id, criterion_id)
);

create table public.mentor_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mentor_assignments_unique unique (mentor_id, team_id)
);

create index mentor_assignments_mentor_idx on public.mentor_assignments (mentor_id, event_id);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at before update on public.events
for each row execute function private.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger challenges_set_updated_at before update on public.challenges
for each row execute function private.set_updated_at();
create trigger teams_set_updated_at before update on public.teams
for each row execute function private.set_updated_at();
create trigger team_members_set_updated_at before update on public.team_members
for each row execute function private.set_updated_at();
create trigger project_submissions_set_updated_at before update on public.project_submissions
for each row execute function private.set_updated_at();
create trigger evaluation_criteria_set_updated_at before update on public.evaluation_criteria
for each row execute function private.set_updated_at();
create trigger evaluations_set_updated_at before update on public.evaluations
for each row execute function private.set_updated_at();
create trigger evaluation_scores_set_updated_at before update on public.evaluation_scores
for each row execute function private.set_updated_at();
create trigger mentor_assignments_set_updated_at before update on public.mentor_assignments
for each row execute function private.set_updated_at();

create or replace function private.validate_team_member_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  member_total integer;
  allowed_max integer;
begin
  select count(*) into member_total
  from public.team_members
  where team_id = new.team_id;

  select e.max_team_size into allowed_max
  from public.teams t
  join public.events e on e.id = t.event_id
  where t.id = new.team_id;

  if member_total > allowed_max or member_total > 3 then
    raise exception 'El equipo supera el maximo de participantes permitido';
  end if;

  return new;
end;
$$;

create constraint trigger team_members_limit
after insert or update on public.team_members
deferrable initially immediate
for each row execute function private.validate_team_member_limit();

create or replace function private.validate_evaluation_score()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed_score numeric(6,2);
begin
  select criterion.max_score into allowed_score
  from public.evaluation_criteria criterion
  join public.evaluations evaluation on evaluation.id = new.evaluation_id
    and evaluation.event_id = criterion.event_id
  where criterion.id = new.criterion_id and criterion.active;

  if allowed_score is null then
    raise exception 'El criterio no esta activo';
  end if;

  if new.score > allowed_score then
    raise exception 'La calificacion supera el maximo del criterio';
  end if;

  return new;
end;
$$;

create trigger evaluation_scores_validate
before insert or update on public.evaluation_scores
for each row execute function private.validate_evaluation_score();

create or replace function private.validate_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  team_event_id uuid;
  profile_role public.user_role;
begin
  select event_id into team_event_id from public.teams where id = new.team_id;
  if team_event_id is null or team_event_id <> new.event_id then
    raise exception 'El equipo no pertenece al evento de la asignacion';
  end if;

  select role into profile_role from public.profiles
  where id = case tg_table_name
    when 'judge_assignments' then new.judge_id
    when 'mentor_assignments' then new.mentor_id
    else null
  end and active;

  if tg_table_name = 'judge_assignments' and profile_role is distinct from 'judge'::public.user_role then
    raise exception 'El perfil asignado no es jurado';
  end if;

  if tg_table_name = 'mentor_assignments' and profile_role is distinct from 'mentor'::public.user_role then
    raise exception 'El perfil asignado no es mentor';
  end if;

  return new;
end;
$$;

create trigger judge_assignments_validate
before insert or update on public.judge_assignments
for each row execute function private.validate_assignment();
create trigger mentor_assignments_validate
before insert or update on public.mentor_assignments
for each row execute function private.validate_assignment();

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
  safe_role := case requested_role
    when 'admin' then 'admin'::public.user_role
    when 'judge' then 'judge'::public.user_role
    when 'mentor' then 'mentor'::public.user_role
    else 'mentor'::public.user_role
  end;

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

create trigger on_auth_user_created
after insert or update of email, raw_app_meta_data, raw_user_meta_data on auth.users
for each row execute function private.handle_new_user();

create or replace function public.register_team(
  p_event_id uuid,
  p_name text,
  p_organization text,
  p_city text,
  p_contact_email text,
  p_contact_phone text,
  p_registration_code text,
  p_management_token_hash text,
  p_challenge_id uuid,
  p_members jsonb
)
returns public.teams
language plpgsql
security invoker
set search_path = ''
as $$
declare
  event_record public.events;
  challenge_record public.challenges;
  member_record jsonb;
  created_team public.teams;
  member_count integer;
  primary_count integer := 0;
  member_position integer := 0;
begin
  select * into event_record from public.events where id = p_event_id for update;

  if not found or not event_record.registration_open then
    raise exception 'El registro no esta disponible';
  end if;

  if event_record.registration_opens_at is not null and now() < event_record.registration_opens_at then
    raise exception 'El registro aun no ha iniciado';
  end if;

  if event_record.registration_closes_at is not null and now() > event_record.registration_closes_at then
    raise exception 'El registro ha finalizado';
  end if;

  if jsonb_typeof(p_members) <> 'array' then
    raise exception 'La lista de participantes no es valida';
  end if;

  member_count := jsonb_array_length(p_members);
  if member_count < event_record.min_team_size or member_count > event_record.max_team_size or member_count > 3 then
    raise exception 'El equipo debe tener entre % y % participantes', event_record.min_team_size, event_record.max_team_size;
  end if;

  select * into challenge_record
  from public.challenges
  where id = p_challenge_id and event_id = p_event_id and active;

  if not found then
    raise exception 'El reto seleccionado no esta disponible';
  end if;

  if challenge_record.max_teams is not null and (
    select count(*) from public.team_challenges where challenge_id = p_challenge_id
  ) >= challenge_record.max_teams then
    raise exception 'El reto seleccionado ya completo su capacidad';
  end if;

  insert into public.teams (
    event_id, name, organization, city, contact_email, contact_phone,
    registration_code, management_token_hash
  ) values (
    p_event_id, trim(p_name), trim(coalesce(p_organization, '')), trim(coalesce(p_city, '')),
    lower(trim(p_contact_email)), trim(coalesce(p_contact_phone, '')),
    upper(trim(p_registration_code)), p_management_token_hash
  ) returning * into created_team;

  for member_record in select value from jsonb_array_elements(p_members)
  loop
    member_position := member_position + 1;
    if coalesce((member_record ->> 'is_primary_contact')::boolean, false) then
      primary_count := primary_count + 1;
    end if;

    insert into public.team_members (
      team_id, event_id, position, full_name, email, phone, city, member_role, is_primary_contact
    ) values (
      created_team.id,
      p_event_id,
      member_position,
      trim(member_record ->> 'full_name'),
      lower(trim(member_record ->> 'email')),
      trim(coalesce(member_record ->> 'phone', '')),
      trim(coalesce(member_record ->> 'city', '')),
      trim(coalesce(member_record ->> 'member_role', '')),
      coalesce((member_record ->> 'is_primary_contact')::boolean, false)
    );
  end loop;

  if primary_count <> 1 then
    raise exception 'Debe existir exactamente un contacto principal';
  end if;

  if not exists (
    select 1 from public.team_members
    where team_id = created_team.id
      and is_primary_contact
      and lower(email) = lower(p_contact_email)
  ) then
    raise exception 'El correo de contacto debe corresponder al contacto principal';
  end if;

  insert into public.team_challenges (team_id, challenge_id, event_id)
  values (created_team.id, p_challenge_id, p_event_id);

  insert into public.project_submissions (team_id, event_id, project_name)
  values (created_team.id, p_event_id, created_team.name);

  return created_team;
end;
$$;

create or replace function public.submit_evaluation(
  p_event_id uuid,
  p_team_id uuid,
  p_judge_id uuid,
  p_general_feedback text,
  p_submit boolean,
  p_scores jsonb
)
returns public.evaluations
language plpgsql
security invoker
set search_path = ''
as $$
declare
  event_record public.events;
  evaluation_record public.evaluations;
  score_record jsonb;
  criterion_record public.evaluation_criteria;
begin
  select * into event_record from public.events where id = p_event_id;

  if not found or not event_record.scoring_open then
    raise exception 'La etapa de calificacion no esta abierta';
  end if;

  if event_record.scoring_opens_at is not null and now() < event_record.scoring_opens_at then
    raise exception 'La etapa de calificacion aun no ha iniciado';
  end if;

  if event_record.scoring_closes_at is not null and now() > event_record.scoring_closes_at then
    raise exception 'La etapa de calificacion ha finalizado';
  end if;

  if not exists (
    select 1 from public.judge_assignments
    where event_id = p_event_id and team_id = p_team_id and judge_id = p_judge_id
  ) then
    raise exception 'El jurado no esta asignado a este equipo';
  end if;

  if jsonb_typeof(p_scores) <> 'array' then
    raise exception 'Las calificaciones no son validas';
  end if;

  insert into public.evaluations (
    event_id, team_id, judge_id, general_feedback, submitted, submitted_at
  ) values (
    p_event_id, p_team_id, p_judge_id, trim(coalesce(p_general_feedback, '')),
    p_submit, case when p_submit then now() else null end
  )
  on conflict (judge_id, team_id) do update set
    general_feedback = excluded.general_feedback,
    submitted = excluded.submitted,
    submitted_at = excluded.submitted_at
  returning * into evaluation_record;

  for score_record in select value from jsonb_array_elements(p_scores)
  loop
    select * into criterion_record
    from public.evaluation_criteria
    where id = (score_record ->> 'criterion_id')::uuid
      and event_id = p_event_id
      and active;

    if not found then
      raise exception 'Uno de los criterios no esta disponible';
    end if;

    insert into public.evaluation_scores (evaluation_id, criterion_id, score, comment)
    values (
      evaluation_record.id,
      criterion_record.id,
      (score_record ->> 'score')::numeric,
      trim(coalesce(score_record ->> 'comment', ''))
    )
    on conflict (evaluation_id, criterion_id) do update set
      score = excluded.score,
      comment = excluded.comment;
  end loop;

  if p_submit and (
    select count(*) from public.evaluation_scores where evaluation_id = evaluation_record.id
  ) <> (
    select count(*) from public.evaluation_criteria where event_id = p_event_id and active
  ) then
    raise exception 'Todos los criterios activos deben tener una calificacion';
  end if;

  return evaluation_record;
end;
$$;

alter table public.events enable row level security;
alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_challenges enable row level security;
alter table public.project_submissions enable row level security;
alter table public.evaluation_criteria enable row level security;
alter table public.judge_assignments enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_scores enable row level security;
alter table public.mentor_assignments enable row level security;
alter table public.audit_logs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on function public.register_team(uuid, text, text, text, text, text, text, text, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.submit_evaluation(uuid, uuid, uuid, text, boolean, jsonb)
  from public, anon, authenticated;
grant execute on function public.register_team(uuid, text, text, text, text, text, text, text, uuid, jsonb)
  to service_role;
grant execute on function public.submit_evaluation(uuid, uuid, uuid, text, boolean, jsonb)
  to service_role;
revoke all on all functions in schema private from public, anon, authenticated;

insert into public.events (
  id, slug, name, tagline, location, starts_at, ends_at,
  registration_opens_at, registration_closes_at, submissions_close_at,
  scoring_opens_at, scoring_closes_at, registration_open, submissions_open,
  scoring_open, results_public, showcase_enabled, min_team_size, max_team_size
) values (
  '10000000-0000-4000-8000-000000000001',
  'openai-build-week-manta-2026',
  'OpenAI Build Week Manta 2026',
  'De cero a demo, construyendo con IA.',
  'Manta, Ecuador',
  '2026-07-15T10:00:00-05:00',
  '2026-07-15T17:00:00-05:00',
  '2026-07-01T00:00:00-05:00',
  '2026-07-15T11:30:00-05:00',
  '2026-07-15T15:45:00-05:00',
  '2026-07-15T15:45:00-05:00',
  '2026-07-15T16:45:00-05:00',
  true, true, false, false, true, 1, 3
);

insert into public.challenges (id, event_id, title, description, requirements, sort_order)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Agentes y automatizacion',
    'Construye un agente o flujo autonomo que resuelva una tarea real de principio a fin.',
    'Debe existir una demo funcional y trazable del flujo completo.',
    1
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Herramientas para builders',
    'Crea una herramienta que mejore como las personas disenan, programan, prueban o publican productos.',
    'La demo debe mostrar una mejora concreta en el proceso de construccion.',
    2
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'Impacto local',
    'Resuelve una necesidad de Manta o Ecuador mediante una experiencia util construida con IA.',
    'El equipo debe validar el problema y presentar un prototipo utilizable.',
    3
  );

insert into public.evaluation_criteria (
  id, event_id, name, description, max_score, weight, sort_order
) values
  (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Producto funcional',
    'Calidad de la construccion, funcionamiento de la demo y avance real alcanzado durante la jornada.',
    30, 1, 1
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Uso de OpenAI y Codex',
    'Que tan bien aprovecha el producto las capacidades de OpenAI y el flujo de construccion con Codex.',
    25, 1, 2
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'Ejecucion tecnica',
    'Arquitectura, confiabilidad, integracion y decisiones tecnicas adecuadas al tiempo disponible.',
    20, 1, 3
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    'Experiencia y demo',
    'Claridad de la experiencia, facilidad de uso y capacidad de demostrar el valor construido.',
    15, 1, 4
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    'Impacto y aprendizaje',
    'Relevancia del problema, potencial de impacto y evidencia de iteracion o aprendizaje del equipo.',
    10, 1, 5
  );
