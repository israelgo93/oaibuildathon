-- Completa el contrato de entregas, deadlines por reto y correo transaccional.

alter table public.challenges
  add column submission_deadline_at timestamptz;

update public.challenges as challenge
set submission_deadline_at = coalesce(event.submissions_close_at, event.ends_at)
from public.events as event
where event.id = challenge.event_id;

alter table public.challenges
  alter column submission_deadline_at set not null;

create table public.registration_email_outbox (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null unique,
  event_id uuid not null,
  notification_type text not null default 'team_registration',
  idempotency_key text not null unique,
  status text not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz,
  provider_id text,
  last_error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registration_email_outbox_team_fk foreign key (team_id, event_id)
    references public.teams (id, event_id) on delete cascade,
  constraint registration_email_outbox_type_check
    check (notification_type = 'team_registration'),
  constraint registration_email_outbox_status_check
    check (status in ('pending', 'retry', 'sent', 'failed')),
  constraint registration_email_outbox_attempts_check
    check (attempts >= 0),
  constraint registration_email_outbox_delivery_check
    check (
      (status = 'sent' and sent_at is not null and provider_id is not null)
      or (status <> 'sent' and sent_at is null)
    )
);

create index registration_email_outbox_pending_idx
  on public.registration_email_outbox (next_attempt_at, created_at)
  where status in ('pending', 'retry');

create trigger registration_email_outbox_set_updated_at
before update on public.registration_email_outbox
for each row execute function private.set_updated_at();

create or replace function private.tech_stack_is_valid(values_to_check text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    cardinality(values_to_check) between 1 and 20
    and not exists (
      select 1
      from unnest(values_to_check) as technology
      where btrim(technology) = '' or char_length(btrim(technology)) > 60
    )
    and (
      select count(*) = count(distinct lower(btrim(technology)))
      from unnest(values_to_check) as technology
    ),
    false
  );
$$;

update public.project_submissions
set
  status = 'draft',
  submitted_at = null,
  published_at = null
where status <> 'draft'
  and (
    btrim(project_name) = ''
    or btrim(short_description) = ''
    or btrim(problem) = ''
    or btrim(solution) = ''
    or btrim(demo_url) = ''
    or btrim(repository_url) = ''
    or not private.tech_stack_is_valid(tech_stack)
    or submitted_at is null
  );

alter table public.project_submissions
  add constraint project_submissions_final_complete check (
    status = 'draft'
    or (
      btrim(project_name) <> ''
      and btrim(short_description) <> ''
      and btrim(problem) <> ''
      and btrim(solution) <> ''
      and btrim(demo_url) <> ''
      and btrim(repository_url) <> ''
      and private.tech_stack_is_valid(tech_stack)
      and submitted_at is not null
      and (status <> 'published' or published_at is not null)
    )
  );

create or replace function private.enforce_submission_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'draft' then
    new.submitted_at := null;
    new.published_at := null;
  elsif new.status = 'submitted' then
    new.published_at := null;
  elsif new.status = 'published' then
    if tg_op = 'INSERT' or old.status = 'draft' or old.submitted_at is null then
      raise exception 'La entrega debe enviarse antes de publicarse';
    end if;

    new.submitted_at := old.submitted_at;
    new.published_at := coalesce(new.published_at, now());
  end if;

  return new;
end;
$$;

create trigger project_submissions_enforce_state
before insert or update on public.project_submissions
for each row execute function private.enforce_submission_state();

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

  insert into public.registration_email_outbox (
    team_id, event_id, idempotency_key
  ) values (
    created_team.id,
    p_event_id,
    'team-registration/v1/' || created_team.id::text
  );

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

  if not exists (
    select 1 from public.project_submissions
    where event_id = p_event_id
      and team_id = p_team_id
      and status in ('submitted', 'published')
  ) then
    raise exception 'El equipo aun no tiene una entrega final disponible para calificar';
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

alter table public.registration_email_outbox enable row level security;

revoke all on table public.registration_email_outbox from public, anon, authenticated;
grant select, insert, update, delete on table public.registration_email_outbox to service_role;

revoke all on function private.tech_stack_is_valid(text[]) from public, anon, authenticated;
revoke all on function private.enforce_submission_state() from public, anon, authenticated;
revoke all on function public.register_team(uuid, text, text, text, text, text, text, text, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.submit_evaluation(uuid, uuid, uuid, text, boolean, jsonb)
  from public, anon, authenticated;

grant execute on function public.register_team(uuid, text, text, text, text, text, text, text, uuid, jsonb)
  to service_role;
grant execute on function public.submit_evaluation(uuid, uuid, uuid, text, boolean, jsonb)
  to service_role;
grant execute on function private.tech_stack_is_valid(text[])
  to service_role;

notify pgrst, 'reload schema';
