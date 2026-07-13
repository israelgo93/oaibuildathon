-- Endurece la funcion automatica de RLS creada por la plataforma cuando existe.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

-- Indices de soporte para claves foraneas y operaciones de borrado en cascada.
create index audit_logs_actor_idx on public.audit_logs (actor_id);
create index evaluation_scores_criterion_idx on public.evaluation_scores (criterion_id);
create index evaluations_event_idx on public.evaluations (event_id);
create index evaluations_team_idx on public.evaluations (team_id);
create index judge_assignments_event_idx on public.judge_assignments (event_id);
create index judge_assignments_team_idx on public.judge_assignments (team_id);
create index mentor_assignments_event_idx on public.mentor_assignments (event_id);
create index mentor_assignments_team_idx on public.mentor_assignments (team_id);
create index project_submissions_team_event_idx
  on public.project_submissions (team_id, event_id);
create index team_challenges_challenge_event_idx
  on public.team_challenges (challenge_id, event_id);
create index team_challenges_team_event_idx
  on public.team_challenges (team_id, event_id);
create index team_members_team_event_idx
  on public.team_members (team_id, event_id);
