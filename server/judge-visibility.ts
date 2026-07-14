import type { Tables } from '../src/types/database.js'

export function isFinalSubmission(submission: Tables<'project_submissions'> | null | undefined): submission is Tables<'project_submissions'> {
  return submission?.status === 'submitted' || submission?.status === 'published'
}

export function submissionVisibleToJudge(
  submission: Tables<'project_submissions'> | null | undefined,
): Tables<'project_submissions'> | null {
  return isFinalSubmission(submission) ? submission : null
}
