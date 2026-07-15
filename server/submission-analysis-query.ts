import type { SubmissionAiAnalysisDetail, SubmissionAiAnalysisSummary } from '../src/types/api.js'
import type { Tables } from '../src/types/database.js'
import { HttpError } from './http.js'
import {
  createSubmissionAnalysisFingerprint,
  SUBMISSION_ANALYSIS_PROMPT_VERSION,
} from './submission-analysis-fingerprint.js'
import {
  detailSubmissionAnalysis,
  summarizeSubmissionAnalysis,
  unavailableSubmissionAnalysis,
} from './submission-analysis-public.js'
import { getServerSupabase } from './supabase.js'

interface SummaryCollectionInput {
  submissions: Tables<'project_submissions'>[]
  teamChallenges: Tables<'team_challenges'>[]
  challenges: Tables<'challenges'>[]
  criteria: Tables<'evaluation_criteria'>[]
  canRetry: boolean
}

export function selectCurrentSubmissionAnalysis(
  rows: Tables<'submission_ai_analyses'>[],
  submission: Tables<'project_submissions'>,
): Tables<'submission_ai_analyses'> | null {
  const currentPromptRows = rows.filter((row) => row.prompt_version === SUBMISSION_ANALYSIS_PROMPT_VERSION)
  const sameRevision = currentPromptRows.find((row) => (
    row.source_submitted_at === submission.submitted_at
    && row.status !== 'superseded'
  ))
  return sameRevision ?? currentPromptRows[0] ?? null
}

function fingerprintForSubmission(
  submission: Tables<'project_submissions'>,
  teamChallenges: Tables<'team_challenges'>[],
  challenges: Tables<'challenges'>[],
  criteria: Tables<'evaluation_criteria'>[],
): string | null {
  const teamChallenge = teamChallenges.find((item) => item.team_id === submission.team_id)
  const challenge = teamChallenge
    ? challenges.find((item) => item.id === teamChallenge.challenge_id)
    : undefined
  if (!challenge || !submission.submitted_at) return null
  const activeCriteria = criteria.filter((criterion) => criterion.event_id === submission.event_id && criterion.active)
  if (activeCriteria.length === 0) return null
  return createSubmissionAnalysisFingerprint({ submission, challenge, criteria: activeCriteria })
}

export async function listSubmissionAnalysisSummaries(
  input: SummaryCollectionInput,
): Promise<SubmissionAiAnalysisSummary[]> {
  if (input.submissions.length === 0) return []
  const { data, error } = await getServerSupabase()
    .from('submission_ai_analyses')
    .select('*')
    .in('submission_id', input.submissions.map((submission) => submission.id))
    .eq('prompt_version', SUBMISSION_ANALYSIS_PROMPT_VERSION)
    .order('created_at', { ascending: false })
  if (error) throw new HttpError(500, 'No fue posible cargar los analisis de IA')
  const analyses: Tables<'submission_ai_analyses'>[] = data ?? []

  return input.submissions.map((submission) => {
    const row = selectCurrentSubmissionAnalysis(
      analyses.filter((analysis) => analysis.submission_id === submission.id),
      submission,
    )
    if (!row) {
      const canStart = input.canRetry && submission.status !== 'draft' && submission.submitted_at !== null
      return unavailableSubmissionAnalysis(submission.id, canStart)
    }
    return summarizeSubmissionAnalysis(row, submission, {
      canRetry: input.canRetry,
      currentFingerprint: fingerprintForSubmission(
        submission,
        input.teamChallenges,
        input.challenges,
        input.criteria,
      ),
    })
  })
}

export interface LoadedSubmissionAnalysisDetail {
  detail: SubmissionAiAnalysisDetail
  submission: Tables<'project_submissions'>
}

export async function loadSubmissionAnalysisDetail(
  submissionId: string,
  canRetry: boolean,
): Promise<LoadedSubmissionAnalysisDetail> {
  const supabase = getServerSupabase()
  const { data: submissionRaw, error: submissionError } = await supabase
    .from('project_submissions')
    .select('*')
    .eq('id', submissionId)
    .single()
  if (submissionError || !submissionRaw) throw new HttpError(404, 'La entrega no existe')
  const submission = submissionRaw as Tables<'project_submissions'>

  const [teamChallengeResult, criteriaResult, analysesResult] = await Promise.all([
    supabase.from('team_challenges').select('*').eq('team_id', submission.team_id).eq('event_id', submission.event_id).single(),
    supabase.from('evaluation_criteria').select('*').eq('event_id', submission.event_id).eq('active', true).order('sort_order'),
    supabase
      .from('submission_ai_analyses')
      .select('*')
      .eq('submission_id', submission.id)
      .eq('prompt_version', SUBMISSION_ANALYSIS_PROMPT_VERSION)
      .order('created_at', { ascending: false }),
  ])
  if (teamChallengeResult.error || !teamChallengeResult.data || criteriaResult.error || analysesResult.error) {
    throw new HttpError(500, 'No fue posible cargar el contexto del analisis')
  }
  const teamChallenge = teamChallengeResult.data as Tables<'team_challenges'>
  const criteria: Tables<'evaluation_criteria'>[] = criteriaResult.data ?? []
  const analyses: Tables<'submission_ai_analyses'>[] = analysesResult.data ?? []
  const { data: challengeRaw, error: challengeError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', teamChallenge.challenge_id)
    .single()
  if (challengeError || !challengeRaw) throw new HttpError(500, 'No fue posible cargar el reto del analisis')
  const challenge = challengeRaw as Tables<'challenges'>
  const analysis = selectCurrentSubmissionAnalysis(analyses, submission)
  if (!analysis) {
    const canStart = canRetry && submission.status !== 'draft' && submission.submitted_at !== null
    return {
      submission,
      detail: {
        ...unavailableSubmissionAnalysis(submission.id, canStart),
        report: null,
        evidenceSummary: [],
      },
    }
  }
  const currentFingerprint = submission.submitted_at && criteria.length > 0
    ? createSubmissionAnalysisFingerprint({ submission, challenge, criteria })
    : null

  return {
    submission,
    detail: detailSubmissionAnalysis(analysis, submission, { canRetry, currentFingerprint }),
  }
}
