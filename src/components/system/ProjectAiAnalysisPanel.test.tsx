import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { shouldPollSubmissionAiAnalysis, submissionAiAnalysisPollDelay } from '@/hooks/useProjectAiAnalysis'
import type { SubmissionAiAnalysisStatus, SubmissionAiAnalysisSummary } from '@/types/api'
import { ProjectAiAnalysisPanel } from './ProjectAiAnalysisPanel'

const DISCLAIMER = 'Analisis de apoyo con IA - no vinculante. Puede contener errores. No reemplaza la revision del jurado ni asigna una calificacion.'

function summary(status: SubmissionAiAnalysisStatus, canRetry = false): SubmissionAiAnalysisSummary {
  return {
    analysisId: '80000000-0000-4000-8000-000000000001',
    submissionId: '50000000-0000-4000-8000-000000000001',
    status,
    requestedAt: '2026-07-15T03:00:00.000Z',
    completedAt: status === 'completed' ? '2026-07-15T03:05:00.000Z' : null,
    sourceSubmittedAt: '2026-07-15T02:55:00.000Z',
    model: 'gpt-5.2',
    suggestedPercentage: status === 'completed' ? 82.4 : null,
    confidence: status === 'completed' ? 0.78 : null,
    errorCode: status === 'failed' ? 'provider_error' : null,
    canRetry,
  }
}

function renderPanel(analysisSummary: SubmissionAiAnalysisSummary | null): string {
  return renderToStaticMarkup(
    <ProjectAiAnalysisPanel
      endpoint="/api/judge/submission-analysis"
      isOpen={false}
      onRequestClose={() => undefined}
      projectName="Proyecto Manta"
      submissionId="50000000-0000-4000-8000-000000000001"
      summary={analysisSummary}
      teamName="Equipo Manta"
    />,
  )
}

describe('panel de analisis IA', () => {
  it('muestra siempre el aviso no vinculante y anuncia el estado en cola', () => {
    const markup = renderPanel(summary('queued'))
    expect(markup).toContain(DISCLAIMER)
    expect(markup).toContain('El analisis esta en cola y comenzara automaticamente.')
    expect(markup).toContain('aria-busy="true"')
  })

  it('advierte que un informe desactualizado no debe usarse para puntuar', () => {
    const markup = renderPanel(summary('stale'))
    expect(markup).toContain('Este informe corresponde a una version anterior de la entrega. No uses su sugerencia de puntaje.')
    expect(markup).not.toContain('Ver ponderacion sugerida por IA')
  })

  it('solo expone el reintento cuando el contrato lo autoriza', () => {
    expect(renderPanel(summary('failed', true))).toContain('Reintentar analisis')
    expect(renderPanel(summary('failed', false))).not.toContain('Reintentar analisis')
  })

  it('permite iniciar un analisis no disponible cuando administracion lo autoriza', () => {
    expect(renderPanel(summary('unavailable', true))).toContain('Iniciar analisis')
    expect(renderPanel(summary('unavailable', false))).not.toContain('Iniciar analisis')
  })

  it('aplica backoff acotado despues de errores transitorios de polling', () => {
    expect(submissionAiAnalysisPollDelay(0)).toBe(5000)
    expect(submissionAiAnalysisPollDelay(1)).toBe(2000)
    expect(submissionAiAnalysisPollDelay(2)).toBe(4000)
    expect(submissionAiAnalysisPollDelay(4)).toBe(16000)
    expect(submissionAiAnalysisPollDelay(20)).toBe(30000)
  })

  it.each([
    ['queued', true],
    ['running', true],
    ['completed', false],
    ['failed', false],
    ['stale', false],
    ['unavailable', false],
  ] as const)('define polling para %s', (status, expected) => {
    expect(shouldPollSubmissionAiAnalysis(status)).toBe(expected)
  })
})
