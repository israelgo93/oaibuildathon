import { describe, expect, it } from 'vitest'
import {
  processSubmissionAnalysisBatch,
  SUBMISSION_ANALYSIS_WORKER_BATCH_SIZE,
} from './submission-analysis-service.js'

describe('cola del analisis IA', () => {
  it('procesa un lote paralelo de dos elementos y reporta solo claims obtenidos', async () => {
    let calls = 0
    let active = 0
    let maximumActive = 0
    const processOne = async (): Promise<boolean> => {
      const call = calls
      calls += 1
      active += 1
      maximumActive = Math.max(maximumActive, active)
      await new Promise<void>((resolve) => setTimeout(resolve, 5))
      active -= 1
      if (call === 1) throw new Error('Fallo aislado del segundo claim')
      return true
    }

    await expect(processSubmissionAnalysisBatch(processOne)).resolves.toBe(1)
    expect(calls).toBe(SUBMISSION_ANALYSIS_WORKER_BATCH_SIZE)
    expect(maximumActive).toBe(SUBMISSION_ANALYSIS_WORKER_BATCH_SIZE)
  })
})
