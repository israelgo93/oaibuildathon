export type SubmissionAnalysisErrorCode =
  | 'configuration'
  | 'timeout'
  | 'blocked'
  | 'unsupported'
  | 'too_large'
  | 'rate_limited'
  | 'not_found'
  | 'access_restricted'
  | 'upstream_unavailable'
  | 'invalid_model_output'
  | 'partial'

export class SubmissionAnalysisError extends Error {
  readonly code: SubmissionAnalysisErrorCode
  readonly retryable: boolean

  constructor(code: SubmissionAnalysisErrorCode, retryable: boolean) {
    super(code)
    this.name = 'SubmissionAnalysisError'
    this.code = code
    this.retryable = retryable
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function numericStatus(error: unknown): number | null {
  if (!isRecord(error)) return null
  const status = error.status
  return typeof status === 'number' && Number.isInteger(status) ? status : null
}

export function classifySubmissionAnalysisError(error: unknown): SubmissionAnalysisError {
  if (error instanceof SubmissionAnalysisError) return error
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new SubmissionAnalysisError('timeout', true)
  }
  if (isRecord(error) && error.name === 'TimeoutError') {
    return new SubmissionAnalysisError('timeout', true)
  }

  const status = numericStatus(error)
  if (status === 401 || status === 403) return new SubmissionAnalysisError('configuration', false)
  if (status === 404) return new SubmissionAnalysisError('not_found', false)
  if (status === 408) return new SubmissionAnalysisError('timeout', true)
  if (status === 429) return new SubmissionAnalysisError('rate_limited', true)
  if (status !== null && status >= 500) return new SubmissionAnalysisError('upstream_unavailable', true)

  return new SubmissionAnalysisError('invalid_model_output', true)
}
