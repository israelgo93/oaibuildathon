import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { authenticatedApiRequest, errorMessage } from '@/lib/api'
import { formatEcuadorDateTime, wasSubmittedOnTime } from '@/lib/dates'
import { SystemLayout } from '@/components/system/SystemLayout'
import { StatusMessage } from '@/components/system/StatusMessage'
import { ProjectAiAnalysisPanel } from '@/components/system/ProjectAiAnalysisPanel'
import type { EvaluationInput, EvaluationScoreInput, JudgeDashboardData } from '@/types/api'

interface ScoreDraft {
  score: string
  comment: string
}

export function JudgePage() {
  const [dashboard, setDashboard] = useState<JudgeDashboardData | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [generalFeedback, setGeneralFeedback] = useState('')
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, ScoreDraft>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')

  const loadDashboard = useCallback(async () => {
    try {
      const data = await authenticatedApiRequest<JudgeDashboardData>('/api/judge/dashboard')
      setDashboard(data)
      setSelectedTeamId((current) => current || data.teams[0]?.team.id || '')
      setMessage('')
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadDashboard() }, [loadDashboard])
  const selectedTeam = useMemo(
    () => dashboard?.teams.find((item) => item.team.id === selectedTeamId) ?? null,
    [dashboard, selectedTeamId],
  )
  const selectedAnalysisSummary = useMemo(() => {
    if (!dashboard || !selectedTeam?.submission) return null
    return dashboard.submissionAnalyses.find((analysis) => analysis.submissionId === selectedTeam.submission?.id) ?? null
  }, [dashboard, selectedTeam])

  useEffect(() => {
    if (!dashboard || !selectedTeam) return
    setGeneralFeedback(selectedTeam.evaluation?.general_feedback ?? '')
    setScoreDrafts(Object.fromEntries(dashboard.criteria.map((criterion) => {
      const existing = selectedTeam.scores.find((score) => score.criterion_id === criterion.id)
      return [criterion.id, { score: existing ? String(existing.score) : '', comment: existing?.comment ?? '' }]
    })))
  }, [dashboard, selectedTeam])

  const updateScore = (criterionId: string, values: Partial<ScoreDraft>) => {
    setScoreDrafts((current) => ({
      ...current,
      [criterionId]: {
        score: current[criterionId]?.score ?? '',
        comment: current[criterionId]?.comment ?? '',
        ...values,
      },
    }))
  }

  const saveEvaluation = async (submit: boolean) => {
    if (!dashboard || !selectedTeam) return
    if (!selectedTeam.submission) {
      setMessage('El equipo aun no tiene una entrega final disponible para calificar.')
      return
    }
    if (submit && dashboard.criteria.some((criterion) => scoreDrafts[criterion.id]?.score === '')) {
      setMessage('Completa el puntaje de todos los criterios antes de enviar.')
      return
    }

    setSaving(true)
    setMessage('')
    setSuccess('')
    const scores: EvaluationScoreInput[] = dashboard.criteria.map((criterion) => ({
      criterionId: criterion.id,
      score: Number(scoreDrafts[criterion.id]?.score ?? 0),
      comment: scoreDrafts[criterion.id]?.comment ?? '',
    }))
    const input: EvaluationInput = {
      eventId: dashboard.event.id,
      teamId: selectedTeam.team.id,
      generalFeedback,
      submit,
      scores,
    }

    try {
      await authenticatedApiRequest('/api/judge/evaluations', { method: 'POST', body: JSON.stringify(input) })
      setSuccess(submit ? 'Calificacion enviada correctamente.' : 'Borrador de calificacion guardado.')
      await loadDashboard()
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <SystemLayout eyebrow="Jurado" title="Panel de evaluacion"><StatusMessage>Cargando asignaciones...</StatusMessage></SystemLayout>
  if (!dashboard) return <SystemLayout eyebrow="Jurado" title="Panel de evaluacion"><StatusMessage kind="error">{message || 'No fue posible cargar el panel.'}</StatusMessage><Link className="system-button" to="/login">Iniciar sesion</Link></SystemLayout>

  const totalMaximum = dashboard.criteria.reduce((total, criterion) => total + criterion.max_score * criterion.weight, 0)
  const currentTotal = dashboard.criteria.reduce((total, criterion) => total + Number(scoreDrafts[criterion.id]?.score || 0) * criterion.weight, 0)
  const canEvaluate = Boolean(dashboard.event.scoring_open && selectedTeam?.submission)
  const submittedOnTime = selectedTeam?.submission
    ? wasSubmittedOnTime(selectedTeam.submission.submitted_at, selectedTeam.deadlineAt)
    : null

  return (
    <SystemLayout eyebrow={dashboard.event.name} title="Panel de evaluacion" profile={dashboard.profile}>
      {!dashboard.event.scoring_open ? <StatusMessage>La etapa de calificacion esta cerrada. Puedes revisar los proyectos, pero no guardar cambios.</StatusMessage> : null}
      {message ? <StatusMessage kind="error">{message}</StatusMessage> : null}
      {success ? <StatusMessage kind="success">{success}</StatusMessage> : null}
      {dashboard.teams.length === 0 ? (
        <section className="system-card empty-state"><h2>Aun no tienes equipos asignados.</h2><p>Administracion debe realizar las asignaciones antes de calificar.</p></section>
      ) : (
        <div className="jury-layout">
          <aside className="jury-team-list" aria-label="Equipos asignados">
            {dashboard.teams.map((item) => (
              <button key={item.team.id} type="button" className={selectedTeamId === item.team.id ? 'active' : ''} aria-pressed={selectedTeamId === item.team.id} onClick={() => { setSelectedTeamId(item.team.id); setAnalysisOpen(false) }}>
                <strong>{item.team.name}</strong>
                <span>{item.challenge?.title ?? 'Sin reto'}</span>
                <small>{item.submission ? (item.evaluation?.submitted ? 'Evaluado' : item.evaluation ? 'Evaluacion en borrador' : 'Pendiente de evaluar') : 'Pendiente de entrega'}</small>
              </button>
            ))}
          </aside>
          {selectedTeam ? (
            <div className="jury-workspace">
              <section className="system-card project-brief">
                <div>
                  <p className="system-eyebrow">{selectedTeam.challenge?.title ?? 'Reto'}</p>
                  <div className="submission-metadata">
                    <span className={`status-pill status-${selectedTeam.submissionStatus}`}>{selectedTeam.submissionStatus}</span>
                    <span>Ultimo envio: {formatEcuadorDateTime(selectedTeam.submission?.submitted_at ?? null)}</span>
                    <span>Deadline: {formatEcuadorDateTime(selectedTeam.deadlineAt)}</span>
                    {submittedOnTime === null ? <span>Pendiente de entrega</span> : <span className={submittedOnTime ? 'timing-on-time' : 'timing-late'}>{submittedOnTime ? 'A tiempo' : 'Fuera de plazo'}</span>}
                  </div>
                  <h2>{selectedTeam.submission?.project_name || selectedTeam.team.name}</h2>
                  {selectedTeam.submission ? <p>{selectedTeam.submission.short_description}</p> : <StatusMessage>Pendiente de entrega. El contenido del borrador no esta disponible para el jurado.</StatusMessage>}
                </div>
                {selectedTeam.submission ? (
                  <>
                    <div className="technology-tags" aria-label="Tecnologias utilizadas">{selectedTeam.submission.tech_stack.map((technology) => <span key={technology}>{technology}</span>)}</div>
                    <div className="project-links">
                      <a className="system-button" href={selectedTeam.submission.demo_url} target="_blank" rel="noreferrer">Abrir demo</a>
                      <a className="system-button" href={selectedTeam.submission.repository_url} target="_blank" rel="noreferrer">Ver codigo</a>
                      {selectedTeam.submission.presentation_url ? <a className="system-button" href={selectedTeam.submission.presentation_url} target="_blank" rel="noreferrer">Presentacion</a> : null}
                      {selectedTeam.submission.video_url ? <a className="system-button" href={selectedTeam.submission.video_url} target="_blank" rel="noreferrer">Video</a> : null}
                      <button className="system-button ai-analysis-trigger" type="button" aria-haspopup="dialog" aria-expanded={analysisOpen} onClick={() => setAnalysisOpen(true)}>Ver analisis IA</button>
                    </div>
                    <details><summary>Contexto completo</summary><h3>Problema</h3><p>{selectedTeam.submission.problem}</p><h3>Solucion</h3><p>{selectedTeam.submission.solution}</p></details>
                  </>
                ) : null}
              </section>
              <section className="system-card scoring-card">
                <div className="score-heading"><div><p className="system-eyebrow">Rubrica configurable</p><h2>Calificacion</h2></div><strong>{currentTotal.toFixed(1)}<small> / {totalMaximum}</small></strong></div>
                {!selectedTeam.submission ? <StatusMessage>Pendiente de entrega. La rubrica se habilitara cuando el equipo realice un envio final.</StatusMessage> : null}
                <div className="criteria-list">
                  {dashboard.criteria.map((criterion) => (
                    <fieldset key={criterion.id} className="criterion-field" disabled={!canEvaluate || saving}>
                      <legend><strong>{criterion.name}</strong><span>0-{criterion.max_score} · peso {criterion.weight}</span></legend>
                      <p>{criterion.description}</p>
                      <div className="criterion-inputs">
                        <label>Puntaje<input type="number" min="0" max={criterion.max_score} step="0.01" required value={scoreDrafts[criterion.id]?.score ?? ''} onChange={(event) => updateScore(criterion.id, { score: event.target.value })} /></label>
                        <label>Comentario<textarea rows={2} value={scoreDrafts[criterion.id]?.comment ?? ''} onChange={(event) => updateScore(criterion.id, { comment: event.target.value })} /></label>
                      </div>
                    </fieldset>
                  ))}
                </div>
                <label className="feedback-field">Retroalimentacion general<textarea rows={5} maxLength={4000} disabled={!canEvaluate || saving} value={generalFeedback} onChange={(event) => setGeneralFeedback(event.target.value)} /></label>
                {canEvaluate ? <div className="system-actions"><button className="system-button" type="button" disabled={saving} onClick={() => void saveEvaluation(false)}>Guardar borrador</button><button className="system-button system-button-primary" type="button" disabled={saving} onClick={() => void saveEvaluation(true)}>Enviar calificacion</button></div> : null}
              </section>
            </div>
          ) : null}
        </div>
      )}
      <ProjectAiAnalysisPanel
        endpoint="/api/judge/submission-analysis"
        isOpen={analysisOpen}
        onRequestClose={() => setAnalysisOpen(false)}
        projectName={selectedTeam?.submission?.project_name ?? selectedTeam?.team.name ?? 'Proyecto'}
        submissionId={selectedTeam?.submission?.id ?? null}
        summary={selectedAnalysisSummary}
        teamName={selectedTeam?.team.name ?? 'Equipo'}
      />
    </SystemLayout>
  )
}
