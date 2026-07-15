import { useEffect, useId, useMemo, useRef } from 'react'
import { formatEcuadorDateTime } from '@/lib/dates'
import { useProjectAiAnalysis } from '@/hooks/useProjectAiAnalysis'
import type {
  SubmissionAiAnalysisStatus,
  SubmissionAiAnalysisSummary,
  SubmissionAiEvidenceSummary,
  SubmissionAiEvidenceSource,
  SubmissionAiEvidenceStatus,
} from '@/types/api'

interface ProjectAiAnalysisPanelProps {
  endpoint: string
  isOpen: boolean
  onAnalysisChange?: (analysis: SubmissionAiAnalysisSummary) => void
  onRequestClose: () => void
  projectName: string
  submissionId: string | null
  summary: SubmissionAiAnalysisSummary | null
  teamName: string
}

interface AnalysisTextSectionProps {
  children: string
  title: string
}

interface AnalysisListSectionProps {
  items: string[]
  title: string
}

const AI_ANALYSIS_DISCLAIMER = 'Analisis de apoyo con IA - no vinculante. Puede contener errores. No reemplaza la revision del jurado ni asigna una calificacion.'

function analysisStatusLabel(status: SubmissionAiAnalysisStatus): string {
  switch (status) {
    case 'queued': return 'En cola'
    case 'running': return 'Analizando'
    case 'completed': return 'Listo'
    case 'failed': return 'No completado'
    case 'stale': return 'Desactualizado'
    case 'unavailable': return 'No disponible'
    default: {
      const exhaustiveCheck: never = status
      return exhaustiveCheck
    }
  }
}

function analysisStatusMessage(status: SubmissionAiAnalysisStatus): string {
  switch (status) {
    case 'queued': return 'El analisis esta en cola y comenzara automaticamente.'
    case 'running': return 'El agente esta revisando el reto, la demo, el repositorio y la integracion de IA.'
    case 'completed': return 'El informe esta listo para apoyar tu revision independiente.'
    case 'failed': return 'No fue posible completar el analisis. La entrega sigue disponible para revision manual.'
    case 'stale': return 'Este informe corresponde a una version anterior de la entrega. No uses su sugerencia de puntaje.'
    case 'unavailable': return 'El analisis aun no esta disponible. La entrega puede revisarse manualmente.'
    default: {
      const exhaustiveCheck: never = status
      return exhaustiveCheck
    }
  }
}

function confidenceLabel(confidence: number | null): string {
  if (confidence === null) return 'No estimada'
  return `${Math.round(Math.min(1, Math.max(0, confidence)) * 100)}%`
}

function evidenceSourceLabel(source: SubmissionAiEvidenceSource): string {
  switch (source) {
    case 'submission': return 'Entrega'
    case 'challenge': return 'Reto'
    case 'demo': return 'Demo'
    case 'repository': return 'Repositorio'
    default: {
      const exhaustiveCheck: never = source
      return exhaustiveCheck
    }
  }
}

function evidenceStatusLabel(status: SubmissionAiEvidenceStatus): string {
  switch (status) {
    case 'verified': return 'Verificado'
    case 'partial': return 'Revision parcial'
    case 'unavailable': return 'No accesible'
    default: {
      const exhaustiveCheck: never = status
      return exhaustiveCheck
    }
  }
}

function isAnalysisBusy(status: SubmissionAiAnalysisStatus): boolean {
  switch (status) {
    case 'queued':
    case 'running':
      return true
    case 'completed':
    case 'failed':
    case 'stale':
    case 'unavailable':
      return false
    default: {
      const exhaustiveCheck: never = status
      return exhaustiveCheck
    }
  }
}

function AnalysisTextSection({ children, title }: AnalysisTextSectionProps) {
  if (!children.trim()) return null
  return <section className="ai-analysis-section"><h3>{title}</h3><p>{children}</p></section>
}

function AnalysisListSection({ items, title }: AnalysisListSectionProps) {
  if (items.length === 0) return null
  return <section className="ai-analysis-section"><h3>{title}</h3><ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul></section>
}

function EvidenceItem({ evidence }: { evidence: SubmissionAiEvidenceSummary }) {
  return (
    <li className="ai-analysis-evidence-item">
      <div><strong>{evidence.title}</strong><span>{evidenceSourceLabel(evidence.source)}</span></div>
      <p>{evidence.summary}</p>
      <small className={`ai-evidence-status ai-evidence-status-${evidence.status}`}>{evidenceStatusLabel(evidence.status)}</small>
    </li>
  )
}

export function ProjectAiAnalysisPanel({
  endpoint,
  isOpen,
  onAnalysisChange,
  onRequestClose,
  projectName,
  submissionId,
  summary,
  teamName,
}: ProjectAiAnalysisPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const { analysis, error, loading, retrying, retry } = useProjectAiAnalysis({
    endpoint,
    initialSummary: summary,
    isOpen,
    onAnalysisChange,
    submissionId,
  })
  const status = analysis?.status ?? summary?.status ?? 'unavailable'
  const report = analysis?.report ?? null
  const canRetry = analysis?.canRetry ?? summary?.canRetry ?? false
  const evidenceById = useMemo(
    () => new Map(analysis?.evidenceSummary.map((evidence) => [evidence.id, evidence]) ?? []),
    [analysis],
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  return (
    <dialog
      ref={dialogRef}
      className="ai-analysis-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={loading || isAnalysisBusy(status)}
      onCancel={onRequestClose}
      onClose={() => { if (isOpen) onRequestClose() }}
    >
      <div className="ai-analysis-shell">
        <header className="ai-analysis-header">
          <div>
            <span className={`ai-analysis-status ai-analysis-status-${status}`}>{analysisStatusLabel(status)}</span>
            <h2 id={titleId}>Analisis IA del proyecto</h2>
            <p>{projectName || teamName}</p>
          </div>
          <button className="ai-analysis-close" type="button" autoFocus onClick={onRequestClose}>Cerrar</button>
        </header>

        <div className="ai-analysis-body">
          <p id={descriptionId} className="ai-analysis-disclaimer">{AI_ANALYSIS_DISCLAIMER}</p>

          <div className={`ai-analysis-state ai-analysis-state-${status}`} role="status" aria-live="polite">
            <strong>{analysisStatusLabel(status)}</strong>
            <p>{analysisStatusMessage(status)}</p>
          </div>

          {error ? <p className="ai-analysis-request-error" role="alert">{error}</p> : null}

          {loading ? (
            <div className="ai-analysis-loading" aria-hidden="true">
              <span /><span /><span />
            </div>
          ) : null}

          {analysis ? (
            <dl className="ai-analysis-metadata">
              <div><dt>Envio analizado</dt><dd>{formatEcuadorDateTime(analysis.sourceSubmittedAt)}</dd></div>
              <div><dt>Completado</dt><dd>{formatEcuadorDateTime(analysis.completedAt)}</dd></div>
              <div><dt>Confianza</dt><dd>{confidenceLabel(analysis.confidence)}</dd></div>
              {analysis.model ? <div><dt>Modelo</dt><dd>{analysis.model}</dd></div> : null}
            </dl>
          ) : null}

          {report ? (
            <div className="ai-analysis-report">
              <AnalysisTextSection title="Resumen ejecutivo">{report.executiveSummary}</AnalysisTextSection>
              <AnalysisTextSection title="Alineacion con el reto">{report.challengeAlignment}</AnalysisTextSection>
              <AnalysisTextSection title="Problema">{report.problemAnalysis}</AnalysisTextSection>
              <AnalysisTextSection title="Solucion construida">{report.solutionAnalysis}</AnalysisTextSection>
              <AnalysisTextSection title="Demo y despliegue">{report.deploymentAnalysis}</AnalysisTextSection>
              <AnalysisTextSection title="Codigo y arquitectura">{report.codeAnalysis}</AnalysisTextSection>
              <AnalysisTextSection title="Integracion de IA">{report.aiIntegrationAnalysis}</AnalysisTextSection>
              <AnalysisListSection title="Fortalezas" items={report.strengths} />
              <AnalysisListSection title="Riesgos y dudas" items={report.risks} />
              <AnalysisListSection title="Recomendaciones" items={report.recommendations} />

              {analysis && analysis.evidenceSummary.length > 0 ? (
                <section className="ai-analysis-section">
                  <h3>Evidencia revisada</h3>
                  <ul className="ai-analysis-evidence-list">{analysis.evidenceSummary.map((evidence) => <EvidenceItem key={evidence.id} evidence={evidence} />)}</ul>
                </section>
              ) : null}

              <AnalysisListSection title="Limitaciones del analisis" items={report.limitations} />

              {status === 'completed' && report.rubricSuggestions.length > 0 ? (
                <details className="ai-analysis-rubric">
                  <summary>Ver ponderacion sugerida por IA</summary>
                  <p>Es una referencia no vinculante. No completa ni modifica la rubrica del jurado.</p>
                  {analysis?.suggestedPercentage !== null && analysis?.suggestedPercentage !== undefined ? (
                    <strong className="ai-analysis-percentage">{analysis.suggestedPercentage.toFixed(1)}% sugerido</strong>
                  ) : null}
                  <ol>
                    {report.rubricSuggestions.map((suggestion) => {
                      const evidenceTitles = suggestion.evidenceIds
                        .map((evidenceId) => evidenceById.get(evidenceId)?.title)
                        .filter((title): title is string => Boolean(title))
                      return (
                        <li key={suggestion.criterionId}>
                          <div><strong>{suggestion.criterionName}</strong><span>{suggestion.score} / {suggestion.maxScore} - peso {suggestion.weight}</span></div>
                          <p>{suggestion.rationale}</p>
                          {evidenceTitles.length > 0 ? <small>Evidencia: {evidenceTitles.join(', ')}</small> : null}
                        </li>
                      )
                    })}
                  </ol>
                </details>
              ) : null}
            </div>
          ) : null}

          {!loading && status === 'completed' && !report ? <p className="ai-analysis-empty">El analisis termino, pero el detalle aun no esta disponible.</p> : null}

          {canRetry ? (
            <div className="ai-analysis-actions">
              <button className="system-button" type="button" disabled={retrying} onClick={() => void retry()}>
                {status === 'unavailable'
                  ? (retrying ? 'Iniciando...' : 'Iniciar analisis')
                  : (retrying ? 'Reintentando...' : 'Reintentar analisis')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </dialog>
  )
}
