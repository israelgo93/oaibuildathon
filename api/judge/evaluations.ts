import type { EvaluationInput } from '../../src/types/api.js'
import type { Json, Tables } from '../../src/types/database.js'
import { writeAuditLog } from '../../server/audit.js'
import { requireRole } from '../../server/auth.js'
import { HttpError, parseJsonBody, requireMethod, setPrivateResponse, withErrorHandling } from '../../server/http.js'
import { getServerSupabase } from '../../server/supabase.js'
import { evaluationSchema } from '../../server/validation.js'

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['POST'])
  const { profile } = await requireRole(request, ['judge', 'admin'])
  const input: EvaluationInput = evaluationSchema.parse(parseJsonBody(request))
  const supabase = getServerSupabase()
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

  if (error || !evaluationRaw) throw new HttpError(400, error?.message ?? 'No fue posible guardar la calificacion')
  const evaluation = evaluationRaw as Tables<'evaluations'>
  await writeAuditLog(profile.id, input.submit ? 'evaluation.submitted' : 'evaluation.saved', 'evaluation', evaluation.id, {
    team_id: input.teamId,
  })
  setPrivateResponse(response)
  response.status(200).json(evaluation)
})
