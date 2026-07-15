import { waitUntil } from '@vercel/functions'
import type { SubmissionAiEvidenceSummary } from '../src/types/api.js'
import type { Json, Tables, TablesInsert, TablesUpdate } from '../src/types/database.js'
import { getSubmissionAnalysisEnvironment } from './env.js'
import {
  runSubmissionAnalysisAgents,
  SubmissionAnalysisAgentRunError,
  type AnalysisRubricCriterion,
  type SubmissionAnalysisTokenUsage,
} from './submission-analysis-agents.js'
import { collectSubmissionEvidence, redactSubmissionEvidenceText } from './submission-analysis-evidence.js'
import { classifySubmissionAnalysisError, SubmissionAnalysisError } from './submission-analysis-errors.js'
import {
  createSubmissionAnalysisFingerprint,
  createSubmissionContentHash,
  SUBMISSION_ANALYSIS_PROMPT_VERSION,
} from './submission-analysis-fingerprint.js'
import { getServerSupabase } from './supabase.js'

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json
}

const EMPTY_TOKEN_USAGE: SubmissionAnalysisTokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
}

function requireLeaseToken(analysis: Tables<'submission_ai_analyses'>): string {
  if (!analysis.lease_token) throw new SubmissionAnalysisError('upstream_unavailable', true)
  return analysis.lease_token
}

async function processScheduledAnalysis(analysis: Tables<'submission_ai_analyses'>): Promise<boolean> {
  const dueAt = analysis.next_attempt_at ? new Date(analysis.next_attempt_at).getTime() : Date.now()
  const delayMs = Math.max(0, dueAt - Date.now())
  if (delayMs > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, Math.min(delayMs, 35_000)))
  }
  return safelyProcessSubmissionAnalysis(analysis.id)
}

function scheduleAnalysis(analysis: Tables<'submission_ai_analyses'>): void {
  const task = processScheduledAnalysis(analysis)
  try {
    waitUntil(task)
  } catch {
    void task
  }
}

async function markSuperseded(
  analysis: Tables<'submission_ai_analyses'>,
  errorCode: string,
): Promise<void> {
  const leaseToken = requireLeaseToken(analysis)
  const values: TablesUpdate<'submission_ai_analyses'> = {
    status: 'superseded',
    next_attempt_at: null,
    lease_expires_at: null,
    lease_token: null,
    completed_at: new Date().toISOString(),
    last_error_code: errorCode,
  }
  await getServerSupabase()
    .from('submission_ai_analyses')
    .update(values)
    .eq('id', analysis.id)
    .eq('status', 'running')
    .eq('attempts', analysis.attempts)
    .eq('lease_token', leaseToken)
}

async function recordFailure(
  analysis: Tables<'submission_ai_analyses'>,
  error: SubmissionAnalysisError,
  usage: SubmissionAnalysisTokenUsage = EMPTY_TOKEN_USAGE,
): Promise<void> {
  const leaseToken = requireLeaseToken(analysis)
  const retry = error.retryable && analysis.attempts < analysis.max_attempts
  const retryDelayMinutes = Math.min(60, 2 ** Math.max(0, analysis.attempts - 1) * 5)
  const values: TablesUpdate<'submission_ai_analyses'> = retry
    ? {
        status: 'queued',
        next_attempt_at: new Date(Date.now() + retryDelayMinutes * 60_000).toISOString(),
        lease_expires_at: null,
        lease_token: null,
        completed_at: null,
        last_error_code: error.code,
        input_tokens: analysis.input_tokens + usage.inputTokens,
        output_tokens: analysis.output_tokens + usage.outputTokens,
        total_tokens: analysis.total_tokens + usage.totalTokens,
      }
    : {
        status: 'failed',
        next_attempt_at: null,
        lease_expires_at: null,
        lease_token: null,
        completed_at: new Date().toISOString(),
        last_error_code: error.code,
        input_tokens: analysis.input_tokens + usage.inputTokens,
        output_tokens: analysis.output_tokens + usage.outputTokens,
        total_tokens: analysis.total_tokens + usage.totalTokens,
      }
  await getServerSupabase()
    .from('submission_ai_analyses')
    .update(values)
    .eq('id', analysis.id)
    .eq('status', 'running')
    .eq('attempts', analysis.attempts)
    .eq('lease_token', leaseToken)
}

interface ExecutionContext {
  submission: Tables<'project_submissions'>
  challenge: Tables<'challenges'>
  criteria: Tables<'evaluation_criteria'>[]
}

async function loadExecutionContext(
  analysis: Tables<'submission_ai_analyses'>,
): Promise<ExecutionContext | null> {
  const supabase = getServerSupabase()
  const [analysisResult, submissionResult, teamChallengeResult, criteriaResult] = await Promise.all([
    supabase.from('submission_ai_analyses').select('*').eq('id', analysis.id).maybeSingle(),
    supabase.from('project_submissions').select('*').eq('id', analysis.submission_id).maybeSingle(),
    supabase.from('team_challenges').select('*').eq('team_id', analysis.team_id).eq('event_id', analysis.event_id).maybeSingle(),
    supabase.from('evaluation_criteria').select('*').eq('event_id', analysis.event_id).eq('active', true).order('sort_order'),
  ])
  if (analysisResult.error || submissionResult.error || teamChallengeResult.error || criteriaResult.error) {
    throw new SubmissionAnalysisError('upstream_unavailable', true)
  }
  if (!analysisResult.data || !submissionResult.data || !teamChallengeResult.data) {
    throw new SubmissionAnalysisError('not_found', false)
  }
  const currentAnalysis = analysisResult.data as Tables<'submission_ai_analyses'>
  if (
    currentAnalysis.status !== 'running'
    || currentAnalysis.attempts !== analysis.attempts
    || currentAnalysis.lease_token !== analysis.lease_token
  ) return null
  const submission = submissionResult.data as Tables<'project_submissions'>
  const teamChallenge = teamChallengeResult.data as Tables<'team_challenges'>
  const criteria: Tables<'evaluation_criteria'>[] = criteriaResult.data ?? []
  if (
    submission.status === 'draft'
    || !submission.submitted_at
    || submission.submitted_at !== currentAnalysis.source_submitted_at
    || createSubmissionContentHash(submission) !== currentAnalysis.source_content_hash
  ) {
    await markSuperseded(currentAnalysis, 'superseded_by_submission_change')
    return null
  }
  if (criteria.length === 0) throw new SubmissionAnalysisError('configuration', false)

  const { data: challengeRaw, error: challengeError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', teamChallenge.challenge_id)
    .maybeSingle()
  if (challengeError) throw new SubmissionAnalysisError('upstream_unavailable', true)
  if (!challengeRaw) throw new SubmissionAnalysisError('not_found', false)
  const challenge = challengeRaw as Tables<'challenges'>
  return { submission, challenge, criteria }
}

function baseEvidenceSummary(): SubmissionAiEvidenceSummary[] {
  return [
    {
      id: 'submission:content',
      source: 'submission',
      title: 'Contenido de la entrega final',
      summary: 'Nombre, descripcion, problema, solucion y tecnologias declaradas por el equipo.',
      status: 'verified',
    },
    {
      id: 'challenge:context',
      source: 'challenge',
      title: 'Contexto y criterios del reto',
      summary: 'Descripcion, ejes, requisitos del reto y rubrica activa configurada por administracion.',
      status: 'verified',
    },
  ]
}

async function processClaimedAnalysis(analysis: Tables<'submission_ai_analyses'>): Promise<void> {
  try {
    const leaseToken = requireLeaseToken(analysis)
    const environment = getSubmissionAnalysisEnvironment()
    if (!environment) throw new SubmissionAnalysisError('configuration', false)
    process.env.OPENAI_AGENTS_DONT_LOG_MODEL_DATA = '1'
    process.env.OPENAI_AGENTS_DONT_LOG_TOOL_DATA = '1'

    const context = await loadExecutionContext(analysis)
    if (!context) return
    const fingerprint = createSubmissionAnalysisFingerprint({
      submission: context.submission,
      challenge: context.challenge,
      criteria: context.criteria,
      promptVersion: analysis.prompt_version,
    })
    if (
      analysis.context_fingerprint === fingerprint
      && analysis.status === 'completed'
      && analysis.final_report !== null
    ) return

    const signal = AbortSignal.timeout(250_000)
    const collectedEvidence = await collectSubmissionEvidence({
      demoUrl: context.submission.demo_url,
      repositoryUrl: context.submission.repository_url,
      githubToken: environment.githubToken,
      signal,
    })
    const evidenceSummary = [...baseEvidenceSummary(), ...collectedEvidence.summary]
    const evidenceIds = [...new Set([
      'submission:content',
      'challenge:context',
      ...collectedEvidence.evidenceIds,
    ])]
    const rubric: AnalysisRubricCriterion[] = context.criteria.map((criterion) => ({
      id: criterion.id,
      name: redactSubmissionEvidenceText(criterion.name),
      description: redactSubmissionEvidenceText(criterion.description),
      maxScore: criterion.max_score,
      weight: criterion.weight,
    }))
    const groupId = `submission-analysis-${analysis.id}`
    const result = await runSubmissionAnalysisAgents({
      project: {
        name: redactSubmissionEvidenceText(context.submission.project_name),
        shortDescription: redactSubmissionEvidenceText(context.submission.short_description),
        problem: redactSubmissionEvidenceText(context.submission.problem),
        solution: redactSubmissionEvidenceText(context.submission.solution),
        techStack: context.submission.tech_stack.map(redactSubmissionEvidenceText),
      },
      challenge: {
        title: redactSubmissionEvidenceText(context.challenge.title),
        description: redactSubmissionEvidenceText(context.challenge.description),
        thematicAxes: context.challenge.thematic_axes.map(redactSubmissionEvidenceText),
        suggestedTopics: context.challenge.suggested_topics.map(redactSubmissionEvidenceText),
        requirements: redactSubmissionEvidenceText(context.challenge.requirements),
      },
      rubric,
      evidenceContext: collectedEvidence.modelContext,
      evidenceIds,
      evidenceComplete: collectedEvidence.complete,
    }, {
      model: environment.model,
      groupId,
      signal,
    })

    const values: TablesUpdate<'submission_ai_analyses'> = {
      status: 'completed',
      context_fingerprint: fingerprint,
      model: result.model,
      next_attempt_at: null,
      lease_expires_at: null,
      lease_token: null,
      completed_at: new Date().toISOString(),
      evidence_summary: toJson(evidenceSummary),
      specialist_reports: toJson(result.specialistReports),
      final_report: toJson(result.report),
      suggested_percentage: result.suggestedPercentage,
      confidence: result.report.confidence,
      input_tokens: analysis.input_tokens + result.usage.inputTokens,
      output_tokens: analysis.output_tokens + result.usage.outputTokens,
      total_tokens: analysis.total_tokens + result.usage.totalTokens,
      trace_group_id: groupId,
      last_error_code: collectedEvidence.complete ? null : 'partial',
    }
    const { error } = await getServerSupabase()
      .from('submission_ai_analyses')
      .update(values)
      .eq('id', analysis.id)
      .eq('status', 'running')
      .eq('attempts', analysis.attempts)
      .eq('lease_token', leaseToken)
    if (error) throw new SubmissionAnalysisError('upstream_unavailable', true)
  } catch (error) {
    const agentRunError = error instanceof SubmissionAnalysisAgentRunError ? error : null
    await recordFailure(
      analysis,
      classifySubmissionAnalysisError(agentRunError?.originalError ?? error),
      agentRunError?.usage ?? EMPTY_TOKEN_USAGE,
    )
  }
}

export async function safelyProcessSubmissionAnalysis(analysisId?: string): Promise<boolean> {
  const args = analysisId ? { p_analysis_id: analysisId } : {}
  const { data: analysisRaw, error } = await getServerSupabase().rpc('claim_submission_ai_analysis', args)
  if (error || !analysisRaw) return false
  const analysis = analysisRaw as Tables<'submission_ai_analyses'>
  await processClaimedAnalysis(analysis)
  return true
}

export const SUBMISSION_ANALYSIS_WORKER_BATCH_SIZE = 2

export async function processSubmissionAnalysisBatch(
  processOne: () => Promise<boolean> = () => safelyProcessSubmissionAnalysis(),
): Promise<number> {
  const results = await Promise.allSettled(
    Array.from(
      { length: SUBMISSION_ANALYSIS_WORKER_BATCH_SIZE },
      processOne,
    ),
  )
  return results.reduce(
    (processed, result) => processed + (result.status === 'fulfilled' && result.value ? 1 : 0),
    0,
  )
}

export async function scheduleSubmissionAnalysisForSubmission(
  submission: Tables<'project_submissions'>,
): Promise<void> {
  if (submission.status === 'draft' || !submission.submitted_at) return
  const { data: analysisRaw, error } = await getServerSupabase()
    .from('submission_ai_analyses')
    .select('*')
    .eq('submission_id', submission.id)
    .eq('source_submitted_at', submission.submitted_at)
    .eq('prompt_version', SUBMISSION_ANALYSIS_PROMPT_VERSION)
    .maybeSingle()
  if (error || !analysisRaw) return
  const analysis = analysisRaw as Tables<'submission_ai_analyses'>
  if (analysis.status === 'queued') scheduleAnalysis(analysis)
}

export async function retrySubmissionAnalysis(
  submission: Tables<'project_submissions'>,
): Promise<Tables<'submission_ai_analyses'>> {
  if (submission.status === 'draft' || !submission.submitted_at) {
    throw new SubmissionAnalysisError('blocked', false)
  }
  const supabase = getServerSupabase()
  const { data: currentRaw, error: currentError } = await supabase
    .from('submission_ai_analyses')
    .select('*')
    .eq('submission_id', submission.id)
    .eq('source_submitted_at', submission.submitted_at)
    .eq('prompt_version', SUBMISSION_ANALYSIS_PROMPT_VERSION)
    .maybeSingle()
  if (currentError) throw new SubmissionAnalysisError('upstream_unavailable', true)

  let analysis: Tables<'submission_ai_analyses'>
  if (currentRaw) {
    const current = currentRaw as Tables<'submission_ai_analyses'>
    const retryRequestedAt = new Date()
    switch (current.status) {
      case 'queued':
        throw new SubmissionAnalysisError('blocked', false)
      case 'running':
        if (!current.lease_expires_at || new Date(current.lease_expires_at).getTime() > retryRequestedAt.getTime()) {
          throw new SubmissionAnalysisError('blocked', false)
        }
        break
      case 'completed':
      case 'failed':
      case 'superseded':
        break
      default: {
        const exhaustiveCheck: never = current.status
        throw new SubmissionAnalysisError(exhaustiveCheck, false)
      }
    }
    const values: TablesUpdate<'submission_ai_analyses'> = {
      status: 'queued',
      requested_reason: 'manual',
      context_fingerprint: null,
      model: null,
      attempts: 0,
      next_attempt_at: new Date().toISOString(),
      lease_expires_at: null,
      lease_token: null,
      started_at: null,
      completed_at: null,
      evidence_summary: null,
      specialist_reports: null,
      final_report: null,
      suggested_percentage: null,
      confidence: null,
      trace_group_id: null,
      last_error_code: null,
    }
    let updateQuery = supabase
      .from('submission_ai_analyses')
      .update(values)
      .eq('id', current.id)
      .eq('status', current.status)
      .eq('attempts', current.attempts)
    updateQuery = current.lease_token
      ? updateQuery.eq('lease_token', current.lease_token)
      : updateQuery.is('lease_token', null)
    if (current.status === 'running') {
      updateQuery = updateQuery.lte('lease_expires_at', retryRequestedAt.toISOString())
    }
    const { data: updatedRaw, error: updateError } = await updateQuery
      .select('*')
      .maybeSingle()
    if (updateError) throw new SubmissionAnalysisError('upstream_unavailable', true)
    if (!updatedRaw) throw new SubmissionAnalysisError('blocked', false)
    analysis = updatedRaw as Tables<'submission_ai_analyses'>
  } else {
    const values: TablesInsert<'submission_ai_analyses'> = {
      submission_id: submission.id,
      team_id: submission.team_id,
      event_id: submission.event_id,
      source_submitted_at: submission.submitted_at,
      source_content_hash: createSubmissionContentHash(submission),
      requested_reason: 'manual',
      prompt_version: SUBMISSION_ANALYSIS_PROMPT_VERSION,
    }
    const { data: insertedRaw, error: insertError } = await supabase
      .from('submission_ai_analyses')
      .insert(values)
      .select('*')
      .single()
    if (insertError || !insertedRaw) throw new SubmissionAnalysisError('upstream_unavailable', true)
    analysis = insertedRaw as Tables<'submission_ai_analyses'>
  }

  scheduleAnalysis(analysis)
  return analysis
}
