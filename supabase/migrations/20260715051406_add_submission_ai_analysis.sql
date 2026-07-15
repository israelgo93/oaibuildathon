alter table public.project_submissions
  add constraint project_submissions_analysis_identity_key
  unique (id, team_id, event_id);

create extension if not exists pgcrypto with schema extensions;

create or replace function private.submission_ai_content_hash(
  p_submission public.project_submissions
)
returns text
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(
        pg_catalog.concat(
          pg_catalog.encode(pg_catalog.convert_to(p_submission.project_name, 'UTF8'), 'hex'), ':',
          pg_catalog.encode(pg_catalog.convert_to(p_submission.short_description, 'UTF8'), 'hex'), ':',
          pg_catalog.encode(pg_catalog.convert_to(p_submission.problem, 'UTF8'), 'hex'), ':',
          pg_catalog.encode(pg_catalog.convert_to(p_submission.solution, 'UTF8'), 'hex'), ':',
          '[',
          coalesce((
            select pg_catalog.string_agg(
              pg_catalog.encode(pg_catalog.convert_to(technology, 'UTF8'), 'hex'),
              ',' order by technology collate "C"
            )
            from pg_catalog.unnest(p_submission.tech_stack) as technology
          ), ''),
          ']:',
          pg_catalog.encode(pg_catalog.convert_to(p_submission.repository_url, 'UTF8'), 'hex'), ':',
          pg_catalog.encode(pg_catalog.convert_to(p_submission.demo_url, 'UTF8'), 'hex'), ':',
          pg_catalog.encode(pg_catalog.convert_to(p_submission.presentation_url, 'UTF8'), 'hex'), ':',
          pg_catalog.encode(pg_catalog.convert_to(p_submission.video_url, 'UTF8'), 'hex')
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

create table public.submission_ai_analyses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  team_id uuid not null,
  event_id uuid not null,
  source_submitted_at timestamptz not null,
  source_content_hash text not null,
  status text not null default 'queued',
  requested_reason text not null,
  prompt_version text not null default 'jury-analysis/v1',
  context_fingerprint text,
  model text,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  next_attempt_at timestamptz default now(),
  lease_expires_at timestamptz,
  lease_token uuid,
  started_at timestamptz,
  completed_at timestamptz,
  evidence_summary jsonb,
  specialist_reports jsonb,
  final_report jsonb,
  suggested_percentage numeric(5,2),
  confidence numeric(5,4),
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  trace_group_id text,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submission_ai_analyses_submission_fk
    foreign key (submission_id, team_id, event_id)
    references public.project_submissions (id, team_id, event_id)
    on delete cascade,
  constraint submission_ai_analyses_revision_prompt_key
    unique (submission_id, source_submitted_at, prompt_version),
  constraint submission_ai_analyses_status_check
    check (status in ('queued', 'running', 'completed', 'failed', 'superseded')),
  constraint submission_ai_analyses_requested_reason_check
    check (requested_reason in ('submission', 'resubmission', 'backfill', 'manual')),
  constraint submission_ai_analyses_prompt_version_check
    check (char_length(btrim(prompt_version)) between 1 and 100),
  constraint submission_ai_analyses_source_content_hash_check
    check (source_content_hash ~ '^[0-9a-f]{64}$'),
  constraint submission_ai_analyses_context_fingerprint_check
    check (
      context_fingerprint is null
      or char_length(btrim(context_fingerprint)) between 1 and 200
    ),
  constraint submission_ai_analyses_model_check
    check (model is null or char_length(btrim(model)) between 1 and 200),
  constraint submission_ai_analyses_attempts_check
    check (attempts >= 0 and max_attempts between 1 and 10 and attempts <= max_attempts),
  constraint submission_ai_analyses_evidence_summary_check
    check (evidence_summary is null or jsonb_typeof(evidence_summary) = 'array'),
  constraint submission_ai_analyses_specialist_reports_check
    check (specialist_reports is null or jsonb_typeof(specialist_reports) = 'array'),
  constraint submission_ai_analyses_final_report_check
    check (final_report is null or jsonb_typeof(final_report) = 'object'),
  constraint submission_ai_analyses_suggested_percentage_check
    check (suggested_percentage is null or suggested_percentage between 0 and 100),
  constraint submission_ai_analyses_confidence_check
    check (confidence is null or confidence between 0 and 1),
  constraint submission_ai_analyses_token_counts_check
    check (
      input_tokens >= 0
      and output_tokens >= 0
      and total_tokens >= 0
      and total_tokens = input_tokens + output_tokens
    ),
  constraint submission_ai_analyses_trace_group_id_check
    check (trace_group_id is null or char_length(btrim(trace_group_id)) between 1 and 200),
  constraint submission_ai_analyses_last_error_code_check
    check (last_error_code is null or char_length(btrim(last_error_code)) between 1 and 200),
  constraint submission_ai_analyses_state_timestamps_check
    check (
      (
        status = 'queued'
        and next_attempt_at is not null
        and lease_expires_at is null
        and lease_token is null
        and completed_at is null
      )
      or (
        status = 'running'
        and next_attempt_at is null
        and lease_expires_at is not null
        and lease_token is not null
        and started_at is not null
        and completed_at is null
      )
      or (
        status = 'completed'
        and next_attempt_at is null
        and lease_expires_at is null
        and lease_token is null
        and completed_at is not null
        and evidence_summary is not null
        and specialist_reports is not null
        and final_report is not null
        and suggested_percentage is not null
        and confidence is not null
        and context_fingerprint is not null
        and model is not null
        and trace_group_id is not null
      )
      or (
        status = 'failed'
        and next_attempt_at is null
        and lease_expires_at is null
        and lease_token is null
        and completed_at is not null
        and last_error_code is not null
      )
      or (
        status = 'superseded'
        and next_attempt_at is null
        and lease_expires_at is null
        and lease_token is null
        and completed_at is not null
      )
    )
);

create index submission_ai_analyses_queue_idx
  on public.submission_ai_analyses (next_attempt_at, created_at)
  where status = 'queued';

create index submission_ai_analyses_expired_lease_idx
  on public.submission_ai_analyses (lease_expires_at, created_at)
  where status = 'running';

create unique index submission_ai_analyses_lease_token_key
  on public.submission_ai_analyses (lease_token)
  where lease_token is not null;

create index submission_ai_analyses_submission_idx
  on public.submission_ai_analyses (
    submission_id,
    team_id,
    event_id,
    source_submitted_at desc
  );

create index submission_ai_analyses_team_idx
  on public.submission_ai_analyses (team_id, created_at desc);

create index submission_ai_analyses_event_status_idx
  on public.submission_ai_analyses (event_id, status, created_at desc);

create trigger submission_ai_analyses_set_updated_at
before update on public.submission_ai_analyses
for each row execute function private.set_updated_at();

create or replace function private.sync_submission_ai_analysis()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested_reason text;
  v_content_hash text;
  v_automatic_revision_count integer;
  v_quota_analysis_id uuid;
  v_next_attempt_at timestamptz;
begin
  if new.status = 'draft' then
    update public.submission_ai_analyses
    set
      status = 'superseded',
      next_attempt_at = null,
      lease_expires_at = null,
      lease_token = null,
      completed_at = coalesce(completed_at, now()),
      last_error_code = case
        when last_error_code = 'revision_quota_exceeded' then last_error_code
        else 'superseded_by_draft'
      end
    where submission_id = new.id
      and status <> 'superseded';

    return new;
  end if;

  -- Publicar conserva submitted_at y no debe crear otra revision del analisis.
  if new.status <> 'submitted' or new.submitted_at is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_requested_reason := 'submission';
  elsif old.submitted_at is null then
    v_requested_reason := 'submission';
  else
    v_requested_reason := 'resubmission';
  end if;

  v_content_hash := private.submission_ai_content_hash(new);

  select pg_catalog.count(*)::integer
  into v_automatic_revision_count
  from public.submission_ai_analyses as analysis
  where analysis.submission_id = new.id
    and analysis.last_error_code is distinct from 'revision_quota_exceeded';

  select analysis.id
  into v_quota_analysis_id
  from public.submission_ai_analyses as analysis
  where analysis.submission_id = new.id
    and analysis.last_error_code = 'revision_quota_exceeded'
  order by analysis.created_at desc
  limit 1;

  update public.submission_ai_analyses
  set
    status = 'superseded',
    next_attempt_at = null,
    lease_expires_at = null,
    lease_token = null,
    completed_at = coalesce(completed_at, now()),
    last_error_code = case
      when last_error_code = 'revision_quota_exceeded' then last_error_code
      else 'superseded_by_resubmission'
    end
  where submission_id = new.id
    and source_submitted_at <> new.submitted_at
    and status <> 'superseded';

  -- Cinco revisiones automaticas cubren cambios legitimos sin permitir costo ilimitado.
  -- La sexta reutiliza un unico marcador fallido; administracion puede autorizarla manualmente.
  if v_automatic_revision_count >= 5 then
    if v_quota_analysis_id is null then
      insert into public.submission_ai_analyses (
        submission_id,
        team_id,
        event_id,
        source_submitted_at,
        source_content_hash,
        status,
        requested_reason,
        next_attempt_at,
        completed_at,
        last_error_code
      ) values (
        new.id,
        new.team_id,
        new.event_id,
        new.submitted_at,
        v_content_hash,
        'failed',
        v_requested_reason,
        null,
        now(),
        'revision_quota_exceeded'
      )
      on conflict (submission_id, source_submitted_at, prompt_version) do nothing;
    else
      update public.submission_ai_analyses
      set
        team_id = new.team_id,
        event_id = new.event_id,
        source_submitted_at = new.submitted_at,
        source_content_hash = v_content_hash,
        status = 'failed',
        requested_reason = v_requested_reason,
        context_fingerprint = null,
        model = null,
        attempts = 0,
        next_attempt_at = null,
        lease_expires_at = null,
        lease_token = null,
        started_at = null,
        completed_at = now(),
        evidence_summary = null,
        specialist_reports = null,
        final_report = null,
        suggested_percentage = null,
        confidence = null,
        input_tokens = 0,
        output_tokens = 0,
        total_tokens = 0,
        trace_group_id = null,
        last_error_code = 'revision_quota_exceeded'
      where id = v_quota_analysis_id;
    end if;

    return new;
  end if;

  select greatest(
    now(),
    coalesce(pg_catalog.max(analysis.created_at) + interval '30 seconds', now())
  )
  into v_next_attempt_at
  from public.submission_ai_analyses as analysis
  where analysis.submission_id = new.id
    and analysis.last_error_code is distinct from 'revision_quota_exceeded';

  insert into public.submission_ai_analyses (
    submission_id,
    team_id,
    event_id,
    source_submitted_at,
    source_content_hash,
    requested_reason,
    next_attempt_at
  ) values (
    new.id,
    new.team_id,
    new.event_id,
    new.submitted_at,
    v_content_hash,
    v_requested_reason,
    v_next_attempt_at
  )
  on conflict (submission_id, source_submitted_at, prompt_version) do nothing;

  return new;
end;
$$;

create trigger project_submissions_sync_ai_analysis
after insert or update of status, submitted_at on public.project_submissions
for each row execute function private.sync_submission_ai_analysis();

insert into public.submission_ai_analyses (
  submission_id,
  team_id,
  event_id,
  source_submitted_at,
  source_content_hash,
  requested_reason
)
select
  submission.id,
  submission.team_id,
  submission.event_id,
  submission.submitted_at,
  private.submission_ai_content_hash(submission),
  'backfill'
from public.project_submissions as submission
where submission.status in ('submitted', 'published')
  and submission.submitted_at is not null
on conflict (submission_id, source_submitted_at, prompt_version) do nothing;

create or replace function public.claim_submission_ai_analysis(
  p_analysis_id uuid default null
)
returns public.submission_ai_analyses
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_claimed_analysis public.submission_ai_analyses;
begin
  with exhausted as (
    select analysis.id
    from public.submission_ai_analyses as analysis
    where (p_analysis_id is null or analysis.id = p_analysis_id)
      and analysis.attempts >= analysis.max_attempts
      and (
        analysis.status = 'queued'
        or (
          analysis.status = 'running'
          and analysis.lease_expires_at <= now()
        )
      )
    for update skip locked
  )
  update public.submission_ai_analyses as analysis
  set
    status = 'failed',
    next_attempt_at = null,
    lease_expires_at = null,
    lease_token = null,
    completed_at = now(),
    last_error_code = 'max_attempts_exceeded'
  from exhausted
  where analysis.id = exhausted.id;

  with candidate as (
    select analysis.id
    from public.submission_ai_analyses as analysis
    where (p_analysis_id is null or analysis.id = p_analysis_id)
      and analysis.attempts < analysis.max_attempts
      and (
        (
          analysis.status = 'queued'
          and analysis.next_attempt_at <= now()
        )
        or (
          analysis.status = 'running'
          and analysis.lease_expires_at <= now()
        )
      )
    order by
      case when analysis.status = 'running' then 0 else 1 end,
      coalesce(analysis.lease_expires_at, analysis.next_attempt_at),
      analysis.created_at
    limit 1
    for update skip locked
  )
  update public.submission_ai_analyses as analysis
  set
    status = 'running',
    attempts = analysis.attempts + 1,
    next_attempt_at = null,
    lease_expires_at = now() + interval '10 minutes',
    lease_token = gen_random_uuid(),
    started_at = coalesce(analysis.started_at, now()),
    completed_at = null,
    last_error_code = null
  from candidate
  where analysis.id = candidate.id
  returning analysis.* into v_claimed_analysis;

  return v_claimed_analysis;
end;
$$;

alter table public.submission_ai_analyses enable row level security;

revoke all on table public.submission_ai_analyses from public, anon, authenticated;
grant select, insert, update, delete on table public.submission_ai_analyses to service_role;

revoke all on function private.sync_submission_ai_analysis()
  from public, anon, authenticated;
revoke all on function private.submission_ai_content_hash(public.project_submissions)
  from public, anon, authenticated;
revoke all on function public.claim_submission_ai_analysis(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_submission_ai_analysis(uuid)
  to service_role;

notify pgrst, 'reload schema';
