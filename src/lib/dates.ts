export const ECUADOR_TIME_ZONE = 'America/Guayaquil'
export const ECUADOR_TIME_ZONE_LABEL = 'America/Guayaquil (UTC-5)'

const ecuadorFormatter = new Intl.DateTimeFormat('es-EC', {
  dateStyle: 'medium',
  timeStyle: 'short',
  hourCycle: 'h23',
  timeZone: ECUADOR_TIME_ZONE,
})

const ecuadorInputFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: ECUADOR_TIME_ZONE,
})

export function formatEcuadorDateTime(value: string | null): string {
  if (!value) return 'No definido'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return `${ecuadorFormatter.format(date)} (UTC-5)`
}

export function ecuadorDateTimeInputValue(value: string): string {
  const parts = Object.fromEntries(
    ecuadorInputFormatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function ecuadorDateTimeToIso(value: string): string {
  const normalized = value.length === 16 ? `${value}:00` : value
  const date = new Date(`${normalized}-05:00`)
  if (Number.isNaN(date.getTime())) throw new Error('La fecha y hora no son validas')
  return date.toISOString()
}

export function effectiveSubmissionDeadline(
  challengeDeadline: string,
  globalDeadline: string | null,
): string {
  if (!globalDeadline) return challengeDeadline
  return new Date(challengeDeadline).getTime() <= new Date(globalDeadline).getTime()
    ? challengeDeadline
    : globalDeadline
}

export function isDeadlineReached(deadline: string, now = new Date()): boolean {
  return now.getTime() >= new Date(deadline).getTime()
}

export function wasSubmittedOnTime(submittedAt: string | null, deadline: string): boolean | null {
  if (!submittedAt) return null
  return new Date(submittedAt).getTime() <= new Date(deadline).getTime()
}
