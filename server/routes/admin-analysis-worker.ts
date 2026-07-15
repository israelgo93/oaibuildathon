import { timingSafeEqual } from 'node:crypto'
import { HttpError, requireMethod, setPrivateResponse, withErrorHandling } from '../http.js'
import {
  processSubmissionAnalysisBatch,
  SUBMISSION_ANALYSIS_WORKER_BATCH_SIZE,
} from '../submission-analysis-service.js'

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8')
  const rightBuffer = Buffer.from(right, 'utf8')
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function requireCronAuthorization(authorization: string | undefined): void {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret || cronSecret.length < 16) throw new HttpError(503, 'El procesador automatico no esta configurado')
  const expected = `Bearer ${cronSecret}`
  if (!authorization || !secureEqual(authorization, expected)) {
    throw new HttpError(401, 'Autorizacion no valida')
  }
}

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['GET'])
  requireCronAuthorization(request.headers.authorization)
  const processed = await processSubmissionAnalysisBatch()
  setPrivateResponse(response)
  response.status(200).json({ processed, capacity: SUBMISSION_ANALYSIS_WORKER_BATCH_SIZE })
})
