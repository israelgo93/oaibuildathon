# Domain and schema

This reference describes the deployed schema verified on 2026-07-14. Approved but unimplemented changes live in `docs/NEXT_ITERATION_PROMPT.md`.

## Core entities

- `events`: schedule, global stage switches, public-visibility flags, and configurable team limits. The database hard cap is three. Operational surfaces currently choose the most recent event; the admin UI does not create events.
- `challenges`: active event challenges, requirements, ordering, and optional capacity. There is no per-challenge deadline today.
- `teams`: one global registration, primary contact, status, recovery code, and HMAC token hash.
- `team_members`: one to three builders; email is unique within an event; exactly one member is the primary contact.
- `team_challenges`: exactly one selected challenge per team.
- `project_submissions`: one project per team with draft, submitted, or published state; fields include project name, short description, problem, solution, `tech_stack text[]`, demo, repository, presentation, video, `submitted_at`, and `published_at`.
- `profiles`: Supabase Auth users with admin, judge, or mentor role.
- `judge_assignments` and `mentor_assignments`: explicit team access.
- `evaluation_criteria`: dynamic rubric with maximum score, weight, order, and active state.
- `evaluations` and `evaluation_scores`: one evaluation per judge/team and one score per criterion.
- `audit_logs`: privileged management and staff action trail. Manual team registration through `/api/registrations` does not currently add an administrative audit row.

## Current invariants

- Teams contain 1-3 participants and never more than the configured event maximum.
- A participant email can appear only once per event.
- A team chooses one active challenge from the same event.
- Registration creates the team, members, challenge link, and draft submission atomically through `register_team`.
- The current final-submit rule requires project name, short description, problem, solution, and at least one of demo or repository. Technology may be empty.
- Saving a draft after submission clears `submitted_at`; a successful resubmission records the new server time.
- Only administration can publish a project to the landing showcase.
- Judges can score only assigned teams while scoring is open, but the current API and SQL do not require the submission to be final.
- Submitted evaluations contain every active criterion and cannot exceed criterion maxima.
- Mentors see only assigned teams.

## Dates and visibility

- `events.submissions_close_at` is the only submission timestamp. `PATCH /api/team` currently checks `submissions_open` but does not compare the server time with this value.
- `challenges.submission_deadline_at` does not exist yet.
- `results_public` is stored, but no public results endpoint or page consumes it.
- The showcase exposes only submissions that administration changed to `published` while showcase visibility is enabled.

## Access boundary

Direct table grants are revoked from `anon` and `authenticated`. Vercel Functions use the server secret after applying application authorization. Supabase Auth remains available through the publishable key. RLS is enabled on every public table as defense in depth.

## Applied migration history

1. `20260713232939_buildathon_initial_schema.sql`: entities, functions, RLS, seed challenges, and rubric.
2. `20260713233118_harden_security_and_indexes.sql`: function hardening and foreign-key indexes.
3. `20260714000143_fix_profile_role_trigger.sql`: preserves an explicit Auth role when creating admin, judge, or mentor profiles.

Never edit these applied files. Use `npx supabase@2.109.1 migration new nombre_descriptivo`, reconcile generated types with `src/types/database.ts`, and verify remote history.

## Seeded rubric

The default 100-point construction-focused rubric is: functional product 30, use of OpenAI/Codex 25, technical execution 20, experience/demo 15, and impact/learning 10. Administrators may edit, deactivate, reweight, or add criteria.

## Approved next schema work

The next iteration adds a required `challenges.submission_deadline_at timestamptz` and a reliable registration-email outbox. It also strengthens final submission and jury constraints. Treat these as pending until their migrations, types, server checks, tests, and deployed behavior are verified.
