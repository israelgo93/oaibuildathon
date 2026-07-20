import type { CountdownValue } from '@/lib/countdown'
import { formatEcuadorDateTime } from '@/lib/dates'

interface SubmissionCountdownProps {
  countdown: CountdownValue
  deadline: string
  isOpen: boolean
}

interface CountdownUnit {
  value: number
  label: string
  singularLabel: string
  pluralLabel: string
}

export function SubmissionCountdown({ countdown, deadline, isOpen }: SubmissionCountdownProps) {
  const units: CountdownUnit[] = [
    { value: countdown.days, label: 'dias', singularLabel: 'dia', pluralLabel: 'dias' },
    { value: countdown.hours, label: 'horas', singularLabel: 'hora', pluralLabel: 'horas' },
    { value: countdown.minutes, label: 'min', singularLabel: 'minuto', pluralLabel: 'minutos' },
    { value: countdown.seconds, label: 'seg', singularLabel: 'segundo', pluralLabel: 'segundos' },
  ]
  const accessibleCountdown = units
    .map((unit) => `${unit.value} ${unit.value === 1 ? unit.singularLabel : unit.pluralLabel}`)
    .join(', ')
  const isClosed = !isOpen || countdown.isComplete

  return (
    <section className={`submission-countdown-card${isClosed ? ' submission-countdown-closed' : ''}`} aria-labelledby="submission-countdown-title">
      <div>
        <p className="system-eyebrow" id="submission-countdown-title">Cierre de entregas</p>
        <strong>{isClosed ? 'Los envios estan cerrados' : 'Tiempo restante para enviar'}</strong>
        <small>{formatEcuadorDateTime(deadline)}</small>
      </div>
      {!isClosed ? (
        <div
          className="system-countdown"
          role="timer"
          aria-live="off"
          aria-label={`${accessibleCountdown} para el cierre de las entregas`}
        >
          {units.map((unit) => (
            <span key={unit.label}>
              <strong>{String(unit.value).padStart(2, '0')}</strong>
              <small>{unit.label}</small>
            </span>
          ))}
        </div>
      ) : null}
    </section>
  )
}
