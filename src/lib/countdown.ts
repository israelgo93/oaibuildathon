export interface CountdownValue {
  days: number
  hours: number
  minutes: number
  seconds: number
  isComplete: boolean
}

export function countdownUntil(deadline: string, now = Date.now()): CountdownValue {
  const deadlineTime = new Date(deadline).getTime()
  const difference = Number.isNaN(deadlineTime) ? 0 : deadlineTime - now

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true }
  }

  return {
    days: Math.floor(difference / 86_400_000),
    hours: Math.floor((difference / 3_600_000) % 24),
    minutes: Math.floor((difference / 60_000) % 60),
    seconds: Math.floor((difference / 1_000) % 60),
    isComplete: false,
  }
}

export function earliestSubmissionDeadline(
  challengeDeadlines: string[],
  globalDeadline: string | null,
  fallbackDeadline: string,
): string {
  const candidates = challengeDeadlines
    .map((deadline) => new Date(deadline).getTime())
    .filter((deadline) => Number.isFinite(deadline))

  if (globalDeadline) {
    const globalDeadlineTime = new Date(globalDeadline).getTime()
    if (Number.isFinite(globalDeadlineTime)) candidates.push(globalDeadlineTime)
  }

  if (candidates.length === 0) return fallbackDeadline
  return new Date(Math.min(...candidates)).toISOString()
}
