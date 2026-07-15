import { describe, expect, it } from 'vitest'
import type { Json, Tables } from '../src/types/database.js'
import { detailSubmissionAnalysis, summarizeSubmissionAnalysis, unavailableSubmissionAnalysis } from './submission-analysis-public.js'
import { selectCurrentSubmissionAnalysis } from './submission-analysis-query.js'

const submission: Tables<'project_submissions'> = {
  id: '50000000-0000-4000-8000-000000000001',
  team_id: '40000000-0000-4000-8000-000000000001',
  event_id: '30000000-0000-4000-8000-000000000001',
  project_name: 'Proyecto',
  short_description: 'Descripcion',
  problem: 'Problema',
  solution: 'Solucion',
  tech_stack: ['TypeScript'],
  repository_url: 'https://github.com/team/project',
  demo_url: 'https://demo.example',
  presentation_url: '',
  video_url: '',
  status: 'submitted',
  submitted_at: '2026-07-15T03:00:00.000Z',
  published_at: null,
  created_at: '2026-07-15T02:00:00.000Z',
  updated_at: '2026-07-15T03:00:00.000Z',
}

const finalReport: Json = {
  executiveSummary: 'Resumen',
  challengeAlignment: 'Alineacion',
  problemAnalysis: 'Problema',
  solutionAnalysis: 'Solucion',
  deploymentAnalysis: 'Demo',
  codeAnalysis: 'Codigo',
  aiIntegrationAnalysis: 'IA',
  risks: [],
  strengths: ['Fortaleza'],
  recommendations: [],
  rubricSuggestions: [{
    criterionId: '70000000-0000-4000-8000-000000000001',
    criterionName: 'Producto funcional',
    score: 24,
    maxScore: 30,
    weight: 1,
    rationale: 'La evidencia demuestra un flujo funcional.',
    evidenceIds: ['submission-overview'],
  }],
  limitations: [],
  confidence: 0.8,
}

const completedAnalysis: Tables<'submission_ai_analyses'> = {
  id: '80000000-0000-4000-8000-000000000001',
  submission_id: submission.id,
  team_id: submission.team_id,
  event_id: submission.event_id,
  source_submitted_at: submission.submitted_at ?? '',
  source_content_hash: 'a'.repeat(64),
  status: 'completed',
  requested_reason: 'submission',
  prompt_version: 'jury-analysis/v1',
  context_fingerprint: 'fingerprint-v1',
  model: 'gpt-5.5',
  attempts: 1,
  max_attempts: 3,
  next_attempt_at: null,
  lease_expires_at: null,
  lease_token: null,
  started_at: '2026-07-15T03:00:01.000Z',
  completed_at: '2026-07-15T03:04:00.000Z',
  evidence_summary: [],
  specialist_reports: [],
  final_report: finalReport,
  suggested_percentage: 82.5,
  confidence: 0.8,
  input_tokens: 100,
  output_tokens: 50,
  total_tokens: 150,
  trace_group_id: 'submission-analysis-opaque',
  last_error_code: null,
  created_at: '2026-07-15T03:00:00.000Z',
  updated_at: '2026-07-15T03:04:00.000Z',
}

describe('proyeccion publica del analisis IA', () => {
  it('expone ponderacion solo para el fingerprint vigente', () => {
    const summary = summarizeSubmissionAnalysis(completedAnalysis, submission, {
      canRetry: true,
      currentFingerprint: 'fingerprint-v1',
    })
    expect(summary.status).toBe('completed')
    expect(summary.suggestedPercentage).toBe(82.5)
    expect(summary.canRetry).toBe(false)
    const detail = detailSubmissionAnalysis(completedAnalysis, submission, {
      canRetry: true,
      currentFingerprint: 'fingerprint-v1',
    })
    expect(detail.report?.rubricSuggestions).toHaveLength(1)
  })

  it('conserva el informe desactualizado pero oculta su ponderacion', () => {
    const detail = detailSubmissionAnalysis(completedAnalysis, submission, {
      canRetry: true,
      currentFingerprint: 'fingerprint-v2',
    })
    expect(detail.status).toBe('stale')
    expect(detail.report?.executiveSummary).toBe('Resumen')
    expect(detail.report?.rubricSuggestions).toEqual([])
    expect(detail.suggestedPercentage).toBeNull()
    expect(detail.canRetry).toBe(true)
  })

  it('permite que administracion recupere un lease vencido', () => {
    const running: Tables<'submission_ai_analyses'> = {
      ...completedAnalysis,
      status: 'running',
      context_fingerprint: null,
      model: null,
      lease_expires_at: '2026-07-15T03:09:00.000Z',
      lease_token: '90000000-0000-4000-8000-000000000001',
      completed_at: null,
      final_report: null,
      suggested_percentage: null,
      confidence: null,
      trace_group_id: null,
    }
    const summary = summarizeSubmissionAnalysis(running, submission, {
      canRetry: true,
      currentFingerprint: 'fingerprint-v1',
      now: new Date('2026-07-15T03:10:00.000Z'),
    })
    expect(summary.status).toBe('failed')
    expect(summary.errorCode).toBe('timeout')
    expect(summary.canRetry).toBe(true)
  })

  it('no autoriza reintentar un informe obsoleto mientras la entrega es borrador', () => {
    const draftSubmission: Tables<'project_submissions'> = {
      ...submission,
      status: 'draft',
      submitted_at: null,
    }
    const summary = summarizeSubmissionAnalysis(completedAnalysis, draftSubmission, {
      canRetry: true,
      currentFingerprint: null,
    })
    expect(summary.status).toBe('stale')
    expect(summary.canRetry).toBe(false)
    expect(summary.suggestedPercentage).toBeNull()
  })

  it('marca como obsoleta una fila de otra version de prompt', () => {
    const previousPromptAnalysis: Tables<'submission_ai_analyses'> = {
      ...completedAnalysis,
      prompt_version: 'jury-analysis/v0',
    }
    const summary = summarizeSubmissionAnalysis(previousPromptAnalysis, submission, {
      canRetry: true,
      currentFingerprint: 'fingerprint-v1',
    })
    expect(summary.status).toBe('stale')
    expect(summary.suggestedPercentage).toBeNull()
    expect(summary.canRetry).toBe(true)
  })

  it('no usa silenciosamente una fila de otra version como analisis actual', () => {
    const previousPromptAnalysis: Tables<'submission_ai_analyses'> = {
      ...completedAnalysis,
      prompt_version: 'jury-analysis/v0',
    }
    expect(selectCurrentSubmissionAnalysis([previousPromptAnalysis], submission)).toBeNull()
  })

  it('permite iniciar un analisis ausente solo cuando el servidor lo autoriza', () => {
    expect(unavailableSubmissionAnalysis(submission.id, true).canRetry).toBe(true)
    expect(unavailableSubmissionAnalysis(submission.id).canRetry).toBe(false)
  })
})
