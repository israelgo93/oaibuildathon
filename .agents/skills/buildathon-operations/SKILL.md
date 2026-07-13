---
name: buildathon-operations
description: Build, change, audit, or operate the OpenAI Build Week Manta platform for team registration, challenges, submissions, public showcase, Supabase, Vercel Functions, administrators, mentors, judges, assignments, rubrics, evaluations, and results. Use for any operational Buildathon feature or database change.
---

# Buildathon Operations

Work on the platform as a construction event system: the central outcome is a functional project and demo, not an extended idea-development process.

## Required context

1. Read `AGENTS.md` before making changes.
2. Read `references/schema.md` for entities, invariants, and access boundaries.
3. Read `references/workflows.md` for user journeys and state transitions.
4. For landing integration, also use `$landing-maintenance`.

## Architecture decisions

- React/Vite pages provide registration and role-specific portals.
- Vercel Functions own business data access and authorization.
- The browser uses `VITE_SUPABASE_PUBLISHABLE_KEY` only for Supabase Auth.
- Server functions use `SUPABASE_SECRET_KEY`; never expose it or prefix it with `VITE_`.
- Teams use one global registration, an HTTP-only session, and a recovery code plus contact email. Participants do not need individual Auth accounts.
- Admin, judge, and mentor users authenticate with Supabase Auth and have a `profiles` row.

## Implementation workflow

1. Identify the actor, state transition, and authorization rule.
2. If the schema changes, create a named migration with the Supabase CLI. Never edit an applied migration in a live environment.
3. Update `src/types/database.ts` or regenerate and reconcile types before querying new columns.
4. Put privileged operations in `api/` and shared server logic in `server/`.
5. Validate every request with Zod and return safe public errors.
6. Update the relevant page without adding direct privileged table access in the browser.
7. Add or update tests for domain invariants.
8. Run `npm run typecheck`, `npm test`, `npm audit`, and `npm run build`.

## Mandatory TypeScript rules

- Never use `any` or `as any`.
- Every Supabase table result must be explicitly assigned or cast with `Tables<'table'>`.
- Type every `data ?? []` result as `Tables<'table'>[]`.
- Use `TablesInsert<>` and `TablesUpdate<>` for writes.
- Use a `never` default check for switches over unions or enums.

## Security review

Before shipping, verify RLS is enabled, grants to `anon` and `authenticated` are intentional, server secrets remain server-only, public responses contain only approved fields, recovery tokens are hashed, cookies are HTTP-only and secure in production, public writes are validated, and administrative mutations record an audit log.
