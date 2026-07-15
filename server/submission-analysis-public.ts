import { z } from 'zod'
import type {
  SubmissionAiAnalysisDetail,
  SubmissionAiAnalysisReport,
  SubmissionAiAnalysisStatus,
  SubmissionAiAnalysisSummary,
  SubmissionAiEvidenceSummary,
} from '../src/types/api.js'
import type { Tables } from '../src/types/database.js'
import { submissionAiReportSchema } from './submission-analysis-agents.js'
import { SUBMISSION_ANALYSIS_PROMPT_VERSION } from './submission-analysis-fingerprint.js'

const evidenceSummarySchema = z.array(z.strictObject({
  id: z.string().min(1).max(120),
  source: z.enum(['submission', 'challenge', 'demo', 'repository']),
  title: z.string().min(1).max(240),
  summary: z.string().min(1).max(2_000),
  status: z.enum(['verified', 'partial', 'unavailable']),
})).max(40)

interface SummaryOptions {
  currentFingerprint?: string | null
  canRetry: boolean
  now?: Date
}

function publicStatus(
  analysis: Tables<'submission_ai_analyses'>,
  submission: Tables<'project_submissions'>,
  currentFingerprint: string | null | undefined,
  now: Date,
): SubmissionAiAnalysisStatus {
  if (
    analysis.status === 'superseded'
    || analysis.prompt_version !== SUBMISSION_ANALYSIS_PROMPT_VERSION
    || submission.status === 'draft'
    || !submission.submitted_at
    || submission.submitted_at !== analysis.source_submitted_at
    || (
      analysis.status === 'completed'
      && currentFingerprint !== undefined
      && analysis.context_fingerprint !== currentFingerprint
    )
  ) {
    return 'stale'
  }
  if (
    analysis.status === 'running'
    && analysis.lease_expires_at
    && new Date(analysis.lease_expires_at).getTime() <= now.getTime()
  ) return 'failed'

  switch (analysis.status) {
    case 'queued':
    case 'running':
    case 'completed':
    case 'failed':
      return analysis.status
    default: {
      const exhaustiveCheck: never = analysis.status
      return exhaustiveCheck
    }
  }
}

export function unavailableSubmissionAnalysis(
  submissionId: string,
  canRetry = false,
): SubmissionAiAnalysisSummary {
  return {
    analysisId: null,
    submissionId,
    status: 'unavailable',
    requestedAt: null,
    completedAt: null,
    sourceSubmittedAt: null,
    model: null,
    suggestedPercentage: null,
    confidence: null,
    errorCode: null,
    canRetry,
  }
}

export function summarizeSubmissionAnalysis(
  analysis: Tables<'submission_ai_analyses'>,
  submission: Tables<'project_submissions'>,
  options: SummaryOptions,
): SubmissionAiAnalysisSummary {
  const status = publicStatus(analysis, submission, options.currentFingerprint, options.now ?? new Date())
  const canExposeSuggestion = status === 'completed'
  const isFinalSubmission = submission.status !== 'draft' && submission.submitted_at !== null

  return {
    analysisId: analysis.id,
    submissionId: analysis.submission_id,
    status,
    requestedAt: analysis.created_at,
    completedAt: analysis.completed_at,
    sourceSubmittedAt: analysis.source_submitted_at,
    model: analysis.model,
    suggestedPercentage: canExposeSuggestion ? analysis.suggested_percentage : null,
    confidence: canExposeSuggestion ? analysis.confidence : null,
    errorCode: status === 'failed' ? analysis.last_error_code ?? 'timeout' : null,
    canRetry: options.canRetry && isFinalSubmission && (status === 'failed' || status === 'stale'),
  }
}

function parseReport(value: Tables<'submission_ai_analyses'>['final_report']): SubmissionAiAnalysisReport | null {
  if (value === null) return null
  const parsed = submissionAiReportSchema.safeParse(value)
  if (!parsed.success) return null
  const { confidence: _confidence, ...report } = parsed.data
  return report
}

function parseEvidenceSummary(value: Tables<'submission_ai_analyses'>['evidence_summary']): SubmissionAiEvidenceSummary[] {
  if (value === null) return []
  const parsed = evidenceSummarySchema.safeParse(value)
  return parsed.success ? parsed.data : []
}

export function detailSubmissionAnalysis(
  analysis: Tables<'submission_ai_analyses'>,
  submission: Tables<'project_submissions'>,
  options: SummaryOptions,
): SubmissionAiAnalysisDetail {
  const summary = summarizeSubmissionAnalysis(analysis, submission, options)
  const parsedReport = summary.status === 'completed' || summary.status === 'stale'
    ? parseReport(analysis.final_report)
    : null
  const report = summary.status === 'stale' && parsedReport
    ? { ...parsedReport, rubricSuggestions: [] }
    : parsedReport
  return {
    ...summary,
    report,
    evidenceSummary: parseEvidenceSummary(analysis.evidence_summary),
  }
}
