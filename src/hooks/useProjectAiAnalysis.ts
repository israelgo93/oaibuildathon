import { useCallback, useEffect, useRef, useState } from 'react'
import { authenticatedApiRequest, errorMessage } from '@/lib/api'
import type {
  SubmissionAiAnalysisDetail,
  SubmissionAiAnalysisStatus,
  SubmissionAiAnalysisSummary,
} from '@/types/api'

interface UseProjectAiAnalysisOptions {
  endpoint: string
  initialSummary: SubmissionAiAnalysisSummary | null
  isOpen: boolean
  onAnalysisChange?: (analysis: SubmissionAiAnalysisSummary) => void
  submissionId: string | null
}

interface UseProjectAiAnalysisResult {
  analysis: SubmissionAiAnalysisDetail | null
  error: string
  loading: boolean
  retrying: boolean
  retry: () => Promise<void>
}

interface AnalysisTarget {
  endpoint: string
  submissionId: string | null
}

const POLL_INTERVAL_MS = 5000
const POLL_ERROR_BASE_MS = 2000
const POLL_ERROR_MAX_MS = 30000

export function shouldPollSubmissionAiAnalysis(status: SubmissionAiAnalysisStatus): boolean {
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

export function submissionAiAnalysisPollDelay(consecutiveErrors: number): number {
  if (consecutiveErrors <= 0) return POLL_INTERVAL_MS
  const exponent = Math.min(Math.max(Math.trunc(consecutiveErrors) - 1, 0), 4)
  return Math.min(POLL_ERROR_BASE_MS * (2 ** exponent), POLL_ERROR_MAX_MS)
}

function detailFromSummary(summary: SubmissionAiAnalysisSummary | null): SubmissionAiAnalysisDetail | null {
  return summary ? { ...summary, report: null, evidenceSummary: [] } : null
}

function summaryFromDetail(detail: SubmissionAiAnalysisDetail): SubmissionAiAnalysisSummary {
  const { report: _report, evidenceSummary: _evidenceSummary, ...summary } = detail
  return summary
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function useProjectAiAnalysis({
  endpoint,
  initialSummary,
  isOpen,
  onAnalysisChange,
  submissionId,
}: UseProjectAiAnalysisOptions): UseProjectAiAnalysisResult {
  const [analysis, setAnalysis] = useState<SubmissionAiAnalysisDetail | null>(() => detailFromSummary(initialSummary))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [pollCycle, setPollCycle] = useState(0)
  const requestCycle = useRef(0)
  const previousTarget = useRef<AnalysisTarget | null>(null)

  useEffect(() => {
    const previous = previousTarget.current
    const targetChanged = !previous
      || previous.endpoint !== endpoint
      || previous.submissionId !== submissionId
    previousTarget.current = { endpoint, submissionId }
    if (!targetChanged && isOpen) return
    requestCycle.current += 1
    setAnalysis(detailFromSummary(initialSummary))
    setError('')
    setLoading(false)
    setRetrying(false)
  }, [endpoint, initialSummary, isOpen, submissionId])

  useEffect(() => {
    if (!isOpen || !submissionId) return undefined
    const currentSubmissionId = submissionId
    const controller = new AbortController()
    const cycle = ++requestCycle.current
    let consecutiveErrors = 0
    let timeoutId: number | null = null

    const isCurrentCycle = () => !controller.signal.aborted && requestCycle.current === cycle

    const scheduleNext = (delayMs: number) => {
      if (!isCurrentCycle()) return
      timeoutId = window.setTimeout(() => {
        void requestAnalysis(false)
      }, delayMs)
    }

    async function requestAnalysis(announceLoading: boolean): Promise<void> {
      if (announceLoading) setLoading(true)
      try {
        const query = new URLSearchParams({ submissionId: currentSubmissionId })
        const detail = await authenticatedApiRequest<SubmissionAiAnalysisDetail>(`${endpoint}?${query.toString()}`, {
          signal: controller.signal,
        })
        if (!isCurrentCycle()) return
        consecutiveErrors = 0
        setAnalysis(detail)
        setError('')
        onAnalysisChange?.(summaryFromDetail(detail))
        if (shouldPollSubmissionAiAnalysis(detail.status)) {
          scheduleNext(submissionAiAnalysisPollDelay(0))
        }
      } catch (requestError) {
        if (controller.signal.aborted || isAbortError(requestError) || !isCurrentCycle()) return
        consecutiveErrors += 1
        setError(errorMessage(requestError))
        scheduleNext(submissionAiAnalysisPollDelay(consecutiveErrors))
      } finally {
        if (announceLoading && isCurrentCycle()) setLoading(false)
      }
    }

    void requestAnalysis(true)

    return () => {
      requestCycle.current += 1
      controller.abort()
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
  }, [endpoint, isOpen, onAnalysisChange, pollCycle, submissionId])

  const retry = useCallback(async () => {
    if (!submissionId || !analysis?.canRetry) return
    setRetrying(true)
    setError('')

    try {
      const detail = await authenticatedApiRequest<SubmissionAiAnalysisDetail>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ submissionId }),
      })
      setAnalysis(detail)
      onAnalysisChange?.(summaryFromDetail(detail))
      setPollCycle((current) => current + 1)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setRetrying(false)
    }
  }, [analysis?.canRetry, endpoint, onAnalysisChange, submissionId])

  return { analysis, error, loading, retrying, retry }
}
