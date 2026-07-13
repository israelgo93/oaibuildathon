# Domain and schema

## Core entities

- `events`: schedule, stage switches, public visibility, and configurable team limits. The database hard cap is three.
- `challenges`: active event challenges, requirements, ordering, and optional capacity.
- `teams`: one global registration, primary contact, status, recovery code, and HMAC token hash.
- `team_members`: one to three builders; email is unique within an event; exactly one primary contact.
- `team_challenges`: exactly one selected challenge per team.
- `project_submissions`: one project per team with draft, submitted, or published state.
- `profiles`: Supabase Auth users with admin, judge, or mentor role.
- `judge_assignments` and `mentor_assignments`: explicit team access.
- `evaluation_criteria`: dynamic rubric with maximum score, weight, order, and active state.
- `evaluations` and `evaluation_scores`: one evaluation per judge/team and one score per criterion.
- `audit_logs`: privileged action trail.

## Invariants

- Teams contain 1–3 participants and never more than the configured event maximum.
- A participant email can appear only once per event.
- A team chooses one active challenge from the same event.
- A submitted project needs a demo or repository URL.
- Only administration can publish a project to the landing showcase.
- Judges can score only assigned teams while scoring is open.
- Submitted evaluations contain every active criterion and cannot exceed criterion maxima.
- Mentors see only assigned teams.

## Access boundary

Direct table grants are revoked from `anon` and `authenticated`. Vercel Functions use the server secret after applying application authorization. Supabase Auth remains available through the publishable key. RLS is enabled on every public table as defense in depth.

## Seeded rubric

The default 100-point construction-focused rubric is: functional product 30, use of OpenAI/Codex 25, technical execution 20, experience/demo 15, and impact/learning 10. Administrators may edit, deactivate, reweight, or add criteria.
