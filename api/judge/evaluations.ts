import type { EvaluationInput } from '../../src/types/api.js'
import type { Json, Tables } from '../../src/types/database.js'
import { writeAuditLog } from '../../server/audit.js'
import { requireRole } from '../../server/auth.js'
import { HttpError, parseJsonBody, requireMethod, setPrivateResponse, withErrorHandling } from '../../server/http.js'
import { getServerSupabase } from '../../server/supabase.js'
import { evaluationSchema } from '../../server/validation.js'
import { isFinalSubmission } from '../../server/judge-visibility.js'

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['POST'])
  const { profile } = await requireRole(request, ['judge', 'admin'])
  const input: EvaluationInput = evaluationSchema.parse(parseJsonBody(request))
  const supabase = getServerSupabase()
  const { data: submissionRaw, error: submissionError } = await supabase
    .from('project_submissions')
    .select('*')
    .eq('event_id', input.eventId)
    .eq('team_id', input.teamId)
    .maybeSingle()

  if (submissionError) throw new HttpError(500, 'No fue posible validar la entrega')
  if (!submissionRaw) throw new HttpError(409, 'El equipo aun no tiene una entrega final disponible para calificar')
  const submission = submissionRaw as Tables<'project_submissions'>
  if (!isFinalSubmission(submission)) {
    throw new HttpError(409, 'El equipo aun no tiene una entrega final disponible para calificar')
  }
  const { data: criteriaRaw, error: criteriaError } = await supabase
    .from('evaluation_criteria')
    .select('*')
    .eq('event_id', input.eventId)
    .eq('active', true)

  if (criteriaError) throw new HttpError(500, 'No fue posible validar la rubrica')
  const criteria: Tables<'evaluation_criteria'>[] = criteriaRaw ?? []
  const criterionById = new Map(criteria.map((criterion) => [criterion.id, criterion]))

  for (const score of input.scores) {
    const criterion = criterionById.get(score.criterionId)
    if (!criterion || score.score > criterion.max_score) {
      throw new HttpError(400, 'Una calificacion esta fuera del rango permitido')
    }
  }

  if (input.submit && (input.scores.length !== criteria.length || criteria.length === 0)) {
    throw new HttpError(400, 'Debes calificar todos los criterios activos')
  }

  const scores: Json = input.scores.map((score) => ({
    criterion_id: score.criterionId,
    score: score.score,
    comment: score.comment,
  }))
  const { data: evaluationRaw, error } = await supabase.rpc('submit_evaluation', {
    p_event_id: input.eventId,
    p_team_id: input.teamId,
    p_judge_id: profile.id,
    p_general_feedback: input.generalFeedback,
    p_submit: input.submit,
    p_scores: scores,
  })

  if (error || !evaluationRaw) {
    const safeMessages = [
      'La etapa de calificacion no esta abierta',
      'La etapa de calificacion aun no ha iniciado',
      'La etapa de calificacion ha finalizado',
      'El jurado no esta asignado a este equipo',
      'El equipo aun no tiene una entrega final disponible para calificar',
      'Todos los criterios activos deben tener una calificacion',
    ]
    const safeMessage = safeMessages.find((message) => error?.message.startsWith(message))
    throw new HttpError(400, safeMessage ?? 'No fue posible guardar la calificacion')
  }
  const evaluation = evaluationRaw as Tables<'evaluations'>
  await writeAuditLog(profile.id, input.submit ? 'evaluation.submitted' : 'evaluation.saved', 'evaluation', evaluation.id, {
    team_id: input.teamId,
  })
  setPrivateResponse(response)
  response.status(200).json(evaluation)
})
