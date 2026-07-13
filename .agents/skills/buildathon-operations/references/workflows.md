# Workflows

## Team

1. Open `/registro` from the landing.
2. One person registers the whole team, 1–3 members, and selects a challenge.
3. The server creates team, members, challenge link, and draft submission atomically.
4. The browser receives an HTTP-only session; the user also saves the eight-character recovery code.
5. `/equipo` shows challenge, members, and project form.
6. The team saves drafts and submits a demo when ready.
7. Administration verifies and publishes the submission; only then it appears on `/`.

## Administration

1. Configure dates, team limits, stage switches, public showcase, and result visibility.
2. Create or edit challenges and rubric criteria.
3. Create Auth users for admins, judges, and mentors.
4. Register teams or participants manually when needed.
5. Assign judges and mentors to teams.
6. Review submissions and publish approved projects.
7. Monitor weighted results and completed evaluations.

## Judge

1. Sign in at `/login` and enter `/jurado`.
2. Review only assigned teams, challenge, submission, demo, and repository.
3. Score the dynamic rubric, save a draft, then submit all criteria.
4. Submitted scores feed the private weighted ranking.

## Mentor

1. Sign in at `/login` and enter `/mentor`.
2. Review assigned teams, members, challenge, delivery state, and organizer notes.
3. Mentoring does not modify jury scores.

## State transitions

- Submission: `draft → submitted → published`; administration may reopen it to `submitted` or `draft`.
- Team: `registered → active`; administration can mark `withdrawn` or `disqualified`.
- Evaluation: draft (`submitted=false`) → final (`submitted=true`) while scoring is open.
