---
name: buildathon-operations
description: Build, change, audit, or operate the OpenAI Build Week Manta platform for team registration, challenges, deadlines, submissions, transactional email, public showcase, Supabase, Vercel Functions, administrators, mentors, judges, assignments, rubrics, evaluations, and results. Use for any operational Buildathon feature or database change.
---

# Buildathon Operations

Work on the platform as a construction event system: the central outcome is a functional project and demo, not an extended idea-development process.

## Required context

1. Read `AGENTS.md` before making changes.
2. Read `docs/IMPLEMENTATION_STATUS.md` to separate deployed behavior from approved future work.
3. Read `references/schema.md` for entities, invariants, and access boundaries.
4. Read `references/workflows.md` for user journeys and state transitions.
5. If the request covers required fields, technology selection, challenge deadlines, jury gating, or registration email, read `docs/NEXT_ITERATION_PROMPT.md` as the approved pending scope.
6. For landing integration, also use `$landing-maintenance`.

## Architecture decisions

- React/Vite pages provide registration and role-specific portals.
- Vercel Functions own business data access and authorization.
- The browser uses `VITE_SUPABASE_PUBLISHABLE_KEY` only for Supabase Auth.
- Server functions use `SUPABASE_SECRET_KEY`; never expose it or prefix it with `VITE_`.
- Teams use one global registration, an HTTP-only session, and a recovery code plus contact email. Participants do not need individual Auth accounts.
- Admin, judge, and mentor users authenticate with Supabase Auth and have a `profiles` row.
- Operational reads currently select the most recently created event. The admin UI edits that event and does not create a new one.
- Transactional email is not implemented yet. Do not assume a provider, outbox, template, or environment variable exists.

## Implementation workflow

1. Identify the actor, state transition, and authorization rule.
2. If the schema changes, create a named migration with the Supabase CLI. Never edit an applied migration in a live environment.
3. Update `src/types/database.ts` or regenerate and reconcile types before querying new columns.
4. Put privileged operations in `api/` and shared server logic in `server/`.
5. Validate every request with Zod and return safe public errors.
6. Update the relevant page without adding direct privileged table access in the browser.
7. Enforce submission completeness, stage switches, assignment scope, and effective deadlines on the server, not only in the UI.
8. For transactional email, keep provider keys server-only, make registration independent of delivery success, and use an outbox plus an idempotency key.
9. Add or update tests for domain invariants and boundary times.
10. Update `docs/IMPLEMENTATION_STATUS.md` only after the behavior is verified.
11. Run `npm run typecheck`, `npm test`, `npm audit`, and `npm run build`.

## Mandatory TypeScript rules

- Never use `any` or `as any`.
- Every Supabase table result must be explicitly assigned or cast with `Tables<'table'>`.
- Type every `data ?? []` result as `Tables<'table'>[]`.
- Use `TablesInsert<>` and `TablesUpdate<>` for writes.
- Use a `never` default check for switches over unions or enums.

## Security review

Before shipping, verify RLS is enabled, grants to `anon` and `authenticated` are intentional, server secrets remain server-only, public responses contain only approved fields, recovery tokens are hashed, cookies are HTTP-only and secure in production, public writes are validated, and administrative mutations record an audit log.

For email, never put a recovery code in a URL, query string, analytics event, or log. Never expose a general-purpose public send endpoint. A provider failure must not roll back or duplicate an otherwise valid team registration.

## Database and staff runbooks

- Discover Supabase CLI commands with `--help`, create a new named migration, and never edit an applied migration.
- Compare local and remote migration history before applying DDL, then update and reconcile `src/types/database.generated.ts` with `src/types/database.ts`.
- Verify the target project reference before privileged operations.
- Bootstrap an initial administrator only from ignored local environment variables; confirm login and `/api/admin/dashboard`, remove bootstrap variables, and never document credentials.
