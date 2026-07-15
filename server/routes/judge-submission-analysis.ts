import { z } from 'zod'
import type { Tables } from '../../src/types/database.js'
import { requireRole } from '../auth.js'
import { HttpError, requireMethod, setPrivateResponse, withErrorHandling } from '../http.js'
import { loadSubmissionAnalysisDetail } from '../submission-analysis-query.js'
import { getServerSupabase } from '../supabase.js'

const submissionIdSchema = z.string().uuid()

function queryValue(value: string | string[] | undefined): string {
  if (typeof value !== 'string') throw new HttpError(400, 'La entrega no es valida')
  return submissionIdSchema.parse(value)
}

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['GET'])
  const { profile } = await requireRole(request, ['judge', 'admin'])
  const submissionId = queryValue(request.query.submissionId)

  if (profile.role === 'judge') {
    const supabase = getServerSupabase()
    const { data: submissionRaw, error: submissionError } = await supabase
      .from('project_submissions')
      .select('*')
      .eq('id', submissionId)
      .maybeSingle()
    if (submissionError || !submissionRaw) throw new HttpError(404, 'El analisis no esta disponible')
    const submission = submissionRaw as Tables<'project_submissions'>
    const { data: assignmentRaw, error } = await supabase
      .from('judge_assignments')
      .select('*')
      .eq('judge_id', profile.id)
      .eq('team_id', submission.team_id)
      .eq('event_id', submission.event_id)
      .maybeSingle()
    if (error || !assignmentRaw) throw new HttpError(404, 'El analisis no esta disponible')
    const assignment = assignmentRaw as Tables<'judge_assignments'>
    if (assignment.team_id !== submission.team_id) throw new HttpError(404, 'El analisis no esta disponible')
  }

  const loaded = await loadSubmissionAnalysisDetail(submissionId, false)
  if (loaded.submission.status === 'draft') throw new HttpError(404, 'El analisis no esta disponible')
  setPrivateResponse(response)
  response.status(200).json(loaded.detail)
})
