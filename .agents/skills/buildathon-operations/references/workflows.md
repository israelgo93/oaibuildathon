# Workflows

This reference describes deployed behavior. Verify `docs/IMPLEMENTATION_STATUS.md` before changing a flow.

## Team: current behavior

1. Open `/registro` from the landing.
2. One person registers the whole team, with 1-3 members, and selects an active challenge.
3. The server creates the team, members, challenge link, and draft submission atomically.
4. The browser receives an HTTP-only session and displays the eight-character recovery code. The transaction also creates an idempotent email outbox entry and attempts delivery through Resend without making registration depend on the provider.
5. `/equipo` recovers access with the contact email and code, then shows the challenge, members, and project form.
6. The team can save an incomplete draft. Final submission requires all project text, at least one technology, demo, and repository.
7. The team API enforces the earlier of the global close and the selected challenge deadline.
8. Administration verifies and publishes a submission; only then does it appear on `/`.

## Administration: current behavior

1. Edit dates, team limits, stage switches, showcase visibility, and the result-visibility flag for the most recent event. The UI does not create an event.
2. Create or edit challenges and rubric criteria.
3. Create Auth users for admins, judges, and mentors; the UI lists them but does not deactivate, delete, or reset them.
4. Register a team manually through the same registration endpoint used by the public flow.
5. Assign judges and mentors to teams.
6. Review submissions, change state, and publish approved projects.
7. Monitor private weighted results and completed evaluations. `results_public` has no public consumer today.

## Judge: current behavior

1. Sign in at `/login` and enter `/jurado`.
2. Receive assigned teams, but draft content remains hidden until the project is `submitted` or `published`.
3. Review challenge, project text, technologies, links, submission status, deadline, and `submitted_at`.
4. If scoring is open and the project is final, save a draft evaluation and submit all active criteria. Server and SQL checks enforce assignment and final-project state.
5. Submitted scores feed the private weighted ranking.

## Mentor

1. Sign in at `/login` and enter `/mentor`.
2. Review assigned teams, members, challenge, delivery state, organizer notes, and available project links.
3. Mentoring does not modify team submissions or jury scores.

## Current state transitions

- Submission: `draft -> submitted -> published`; a team edit can return it to `draft`, and administration can set `draft`, `submitted`, or `published`.
- Team: `registered -> active`; administration can mark `withdrawn` or `disqualified`.
- Evaluation: draft (`submitted=false`) -> final (`submitted=true`) while scoring is open.

## Workflow deployed on 2026-07-14

`docs/NEXT_ITERATION_PROMPT.md` defines the implementation now present in production:

- visible and accessible required-field indicators in public and manual registration;
- incomplete drafts but strict final submission, including demo, repository, and at least one technology;
- typed technology checkboxes plus comma-separated custom values;
- a per-challenge deadline enforced on the server and displayed in `America/Guayaquil`;
- jury access and scoring restricted to `submitted` or `published` projects, with submission timing visible;
- registration confirmation through Resend using a server-side outbox and idempotent delivery.

The database migrations, generated types, Vercel application and Resend variables agree with production. A real registration verified provider acceptance at the first outbox attempt; provider failures remain isolated from registration.
