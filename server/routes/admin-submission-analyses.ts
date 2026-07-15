import { z } from 'zod'
import { writeAuditLog } from '../audit.js'
import { requireRole } from '../auth.js'
import { HttpError, parseJsonBody, requireMethod, setPrivateResponse, withErrorHandling } from '../http.js'
import { loadSubmissionAnalysisDetail } from '../submission-analysis-query.js'
import { retrySubmissionAnalysis } from '../submission-analysis-service.js'

const retrySchema = z.strictObject({ submissionId: z.string().uuid() })
const submissionIdSchema = z.string().uuid()

function querySubmissionId(value: string | string[] | undefined): string {
  if (typeof value !== 'string') throw new HttpError(400, 'La entrega no es valida')
  return submissionIdSchema.parse(value)
}

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['GET', 'POST'])
  const { profile } = await requireRole(request, ['admin'])

  if (request.method === 'GET') {
    const submissionId = querySubmissionId(request.query.submissionId)
    const loaded = await loadSubmissionAnalysisDetail(submissionId, true)
    setPrivateResponse(response)
    response.status(200).json(loaded.detail)
    return
  }

  const input = retrySchema.parse(parseJsonBody(request))
  const current = await loadSubmissionAnalysisDetail(input.submissionId, true)
  if (current.submission.status === 'draft') {
    throw new HttpError(409, 'La entrega debe estar enviada antes de analizarse')
  }
  if (!current.detail.canRetry && current.detail.status !== 'unavailable') {
    throw new HttpError(409, 'El analisis actual no requiere reintento')
  }

  const analysis = await retrySubmissionAnalysis(current.submission)
  await writeAuditLog(profile.id, 'admin.submission_ai_analysis.retry', 'submission_ai_analysis', analysis.id, {
    submission_id: current.submission.id,
    previous_status: current.detail.status,
  })
  const loaded = await loadSubmissionAnalysisDetail(input.submissionId, true)
  setPrivateResponse(response)
  response.status(202).json(loaded.detail)
})
