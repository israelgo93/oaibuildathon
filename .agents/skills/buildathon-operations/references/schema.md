# Domain and schema

This reference describes the deployed schema and application verified through 2026-07-15. `docs/IMPLEMENTATION_STATUS.md` remains authoritative about what is actually deployed.

## Core entities

- `events`: schedule, global stage switches, public-visibility flags, and configurable team limits. The database hard cap is three. Public, judge, and mentor surfaces choose the most recent event by `starts_at`; the admin UI (local scope) creates events and scopes every section to a selected event. Production holds two events: Manta (July 15, closed, showcase/results on) and Portoviejo (July 21, all switches off including showcase until the multi-event code deploys). Participant emails are unique per event, so the same person can join a different event.
- `challenges`: active event challenges, requirements, ordering, optional capacity, `submission_deadline_at`, `thematic_axes`, and `suggested_topics`.
- `teams`: one global registration, primary contact, status, recovery code, and HMAC token hash.
- `team_members`: one to three builders; email is unique within an event; exactly one member is the primary contact.
- `team_challenges`: exactly one selected challenge per team.
- `project_submissions`: one project per team with draft, submitted, or published state; fields include project name, short description, problem, solution, `tech_stack text[]`, demo, repository, presentation, video, `submitted_at`, and `published_at`.
- `profiles`: Supabase Auth users with admin, judge, or mentor role, mandatory-change state, credential version and access-email delivery state.
- `password_reset_requests`: HMAC-only recovery quota evidence for email/IP limits; it never stores the original email or IP.
- `broadcast_campaigns` and `broadcast_recipients`: confirmed participant communications, normalized recipients, stable idempotency keys, batch progress and retry classification.
- `registration_email_outbox`: transactional registration confirmation state, attempts, provider ID and safe retry metadata.
- `judge_assignments` and `mentor_assignments`: explicit team access.
- `evaluation_criteria`: dynamic rubric with maximum score, weight, order, and active state.
- `evaluations` and `evaluation_scores`: one evaluation per judge/team and one score per criterion.
- `audit_logs`: privileged management and staff action trail. Manual team registration through `/api/registrations` does not currently add an administrative audit row.

## Submission analysis schema deployed

- `submission_ai_analyses`: one durable record per `(submission_id, source_submitted_at, prompt_version)`, with submission/team/event identity, source-content hash, `queued|running|completed|failed|superseded` state, request reason, attempts, next retry, lease token, structured evidence/reports, cumulative token totals, safe error code, and trace group identifier.
- `private.sync_submission_ai_analysis()`: queues a new final revision, avoids duplicates when publication preserves `submitted_at`, and supersedes analysis when a project returns to draft or is resubmitted.
- `public.claim_submission_ai_analysis(uuid)`: service-only atomic claim with `FOR UPDATE SKIP LOCKED`, a ten-minute lease, a unique execution token, expired-worker recovery, and maximum-attempt enforcement. Completion/failure must match the execution token. External network/model work happens after this transaction finishes.
- The migration backfills existing `submitted`/`published` revisions, enables RLS, revokes `anon`/`authenticated`, grants only `service_role`, and indexes foreign keys plus queue/lease lookup paths.

This extension is applied in production as `20260715051406_add_submission_ai_analysis.sql`, migration 12. A production worker claim completed one analysis with structured evidence, four specialist reports, synthesis, suggestion and confidence persisted.

## Current invariants

- Teams contain 1-3 participants and never more than the configured event maximum.
- A participant email can appear only once per event.
- A team chooses one active challenge from the same event.
- Registration creates the team, members, challenge link, and draft submission atomically through `register_team`.
- Drafts may be incomplete. Final submission requires project name, short description, problem, solution, at least one technology, demo URL, and repository URL.
- Saving a draft after submission clears `submitted_at`; a successful resubmission records the new server time.
- Only administration can publish a project to the landing showcase.
- Judges can score only assigned teams with `submitted` or `published` projects while scoring is open; both API and SQL enforce the rule.
- Submitted evaluations contain every active criterion and cannot exceed criterion maxima.
- Mentors see only assigned teams.
- Temporary credentials are generated in server memory and never stored in tables, responses, audit payloads or logs.
- For an existing mentor/judge, Resend acceptance happens before Auth password rotation; provider failure preserves the previous credential.
- Bulk staff-access actions require confirmation, target only active mentors/judges and never include administrators.
- One broadcast accepts at most 500 unique normalized recipients. Resend batches contain at most 100 recipients and only transient eligible failures are retried.
- Only a new `submitted_at` queues analysis. Publishing the same revision does not duplicate it; returning to draft or resubmitting makes the previous report stale/superseded.
- An identical final PATCH within 30 seconds preserves `submitted_at` to absorb duplicate clicks. After that window, and after a return to draft, unchanged URLs may still represent a new external deploy/repository revision. Automatic analysis is limited to five revisions per submission; one reusable quota marker bounds storage and an audited admin retry is the override.
- AI output is advisory and cannot insert or update `evaluations` or `evaluation_scores`. Only administrators and judges assigned to the matching team/event may read the projected detail.

## Dates and visibility

- `PATCH /api/team` enforces the effective server deadline, defined as the earlier of `events.submissions_close_at` and `challenges.submission_deadline_at`.
- Submission timestamps are stored in UTC and rendered in `America/Guayaquil (UTC-5)`.
- `results_public` is stored, but no public results endpoint or page consumes it.
- The showcase exposes only submissions that administration changed to `published` while showcase visibility is enabled.

## Access boundary

Direct table grants are revoked from `anon` and `authenticated`. Vercel Functions use the server secret after applying application authorization. Supabase Auth remains available through the publishable key. RLS is enabled on every public table as defense in depth.

The AI table follows the same boundary. Its raw JSON, usage, trace identifier, retry metadata, and internal errors remain service-only; APIs return a typed projection and re-check admin role or judge assignment.

## Applied migration history

1. `20260713232939_buildathon_initial_schema.sql`: entities, functions, RLS, seed challenges, and rubric.
2. `20260713233118_harden_security_and_indexes.sql`: function hardening and foreign-key indexes.
3. `20260714000143_fix_profile_role_trigger.sql`: preserves an explicit Auth role when creating admin, judge, or mentor profiles.
4. `20260714131805_complete_submission_deadlines_and_email_outbox.sql`: challenge deadlines, transactional email outbox, strict final submissions, timestamp preservation, and jury SQL guard.
5. `20260714131931_index_registration_email_outbox_team_event.sql`: covering index for the outbox composite foreign key.
6. `20260714132323_fix_assignment_role_trigger.sql`: safe role validation for judge and mentor assignment triggers.
7. `20260714205820_add_challenge_themes.sql`: thematic axes, suggested topics, seeded guidance for the three challenges, and list cardinality constraints.
8. `20260714223749_add_staff_access_and_broadcasts.sql`: temporary-credential state, password-recovery quota, broadcast campaigns/recipients, service-only grants and atomic functions.
9. `20260714224056_index_broadcast_campaign_foreign_keys.sql`: indexes for broadcast event and creator foreign keys.
10. `20260714230812_harden_broadcast_retry_and_idempotency.sql`: stable recipient idempotency, retry classification and atomic recovery of interrupted campaigns.
11. `20260714230821_harden_staff_access_and_password_recovery.sql`: mandatory-change preservation and atomic recovery quota claims by email/IP.
12. `20260715051406_add_submission_ai_analysis.sql`: revision-scoped AI analysis outbox, content hash, cooldown/quota, trigger/backfill, RLS/service grants and fenced lease claim.

Never edit these applied files. Use `npx supabase@2.109.1 migration new nombre_descriptivo`, reconcile generated types with `src/types/database.ts`, and verify remote history.

## Challenge guidance

`20260714205820_add_challenge_themes.sql` adds `challenges.thematic_axes text[]` and `challenges.suggested_topics text[]`. The application requires 1-8 thematic axes and 1-12 suggested topics when an administrator creates or updates a challenge. The migration seeds the three existing challenges and is deployed in Supabase. Public configuration, registration and the team portal were verified against production; the deployed admin bundle and access boundary were verified without repeating an authenticated save.

## Seeded rubric

The default 100-point construction-focused rubric is: functional product 30, use of OpenAI/Codex 25, technical execution 20, experience/demo 15, and impact/learning 10. Administrators may edit, deactivate, reweight, or add criteria.

## Deployed schema and application

All twelve migrations are applied to project `iexmlbslfnckrdtkwuir`. The APIs and UI are deployed at `https://oaibuildathon.vercel.app`; registration, team session, partial draft, final submission, challenge guidance, staff access, password recovery, broadcast safeguards and the submission-analysis backend are verified. The latest production worker processed one final submission to `completed` with `gpt-5.5`, four specialist reports and 12 evidence summaries (11 verified, one partial), without runtime errors or communication/account side effects. The authenticated admin/judge panel was not visually repeated in that deployment because no session was available.
