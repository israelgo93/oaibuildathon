import { useEffect, useState } from 'react'
import { useCountdown } from '@/hooks/useCountdown'
import { apiRequest } from '@/lib/api'
import { earliestSubmissionDeadline } from '@/lib/countdown'
import { formatEcuadorDateTime } from '@/lib/dates'
import type { PublicEventConfig } from '@/types/api'
import { SUBMISSION_DEADLINE_FALLBACK } from './content'

interface SubmissionWindow {
  deadline: string
  isOpen: boolean
}

interface CountdownUnitValue {
  value: number
  label: string
  singularLabel: string
  pluralLabel: string
}

const MATRIX_DIGITS: Record<string, string> = {
  '0': ['11111', '10001', '10001', '10001', '10001', '10001', '11111'].join(''),
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '11111'].join(''),
  '2': ['11111', '00001', '00001', '11111', '10000', '10000', '11111'].join(''),
  '3': ['11111', '00001', '00001', '01111', '00001', '00001', '11111'].join(''),
  '4': ['10001', '10001', '10001', '11111', '00001', '00001', '00001'].join(''),
  '5': ['11111', '10000', '10000', '11111', '00001', '00001', '11111'].join(''),
  '6': ['11111', '10000', '10000', '11111', '10001', '10001', '11111'].join(''),
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'].join(''),
  '8': ['11111', '10001', '10001', '11111', '10001', '10001', '11111'].join(''),
  '9': ['11111', '10001', '10001', '11111', '00001', '00001', '11111'].join(''),
}

function useSubmissionWindow(): SubmissionWindow {
  const [submissionWindow, setSubmissionWindow] = useState<SubmissionWindow>({
    deadline: SUBMISSION_DEADLINE_FALLBACK,
    isOpen: true,
  })

  useEffect(() => {
    let isActive = true

    void apiRequest<PublicEventConfig>('/api/public-config')
      .then((config) => {
        if (!isActive) return
        const deadline = earliestSubmissionDeadline(
          config.challenges.map((challenge) => challenge.submission_deadline_at),
          config.event.submissions_close_at,
          config.event.ends_at,
        )
        const deadlineTime = new Date(deadline).getTime()
        const fallbackTime = new Date(SUBMISSION_DEADLINE_FALLBACK).getTime()

        // Si la API todavia expone una edicion ya vencida y anterior a la
        // anunciada en la landing, se conserva el fallback de la edicion vigente.
        const isStaleEdition = deadlineTime < Date.now() && deadlineTime < fallbackTime
        if (isStaleEdition) return

        setSubmissionWindow({
          deadline,
          isOpen: config.event.submissions_open,
        })
      })
      .catch(() => undefined)

    return () => {
      isActive = false
    }
  }, [])

  return submissionWindow
}

function DotMatrixDigit({ value }: { value: string }) {
  const pattern = MATRIX_DIGITS[value]
  if (!pattern) return null

  return (
    <span className="matrix-digit" aria-hidden="true">
      {Array.from(pattern).map((cell, index) => (
        <span
          className={cell === '1' ? 'matrix-dot matrix-dot-active' : 'matrix-dot'}
          key={`${value}-${index}`}
        />
      ))}
    </span>
  )
}

function DotMatrixNumber({ value }: { value: number }) {
  const digits = String(value).padStart(2, '0').slice(-2)
  return (
    <span className="matrix-number" aria-hidden="true">
      {Array.from(digits).map((digit, index) => (
        <DotMatrixDigit value={digit} key={`${digit}-${index}`} />
      ))}
    </span>
  )
}

export function LandingCountdown() {
  const submissionWindow = useSubmissionWindow()
  const countdown = useCountdown(submissionWindow.deadline)
  const units: CountdownUnitValue[] = [
    { value: countdown.days, label: 'días', singularLabel: 'día', pluralLabel: 'días' },
    { value: countdown.hours, label: 'horas', singularLabel: 'hora', pluralLabel: 'horas' },
    { value: countdown.minutes, label: 'min', singularLabel: 'minuto', pluralLabel: 'minutos' },
    { value: countdown.seconds, label: 'seg', singularLabel: 'segundo', pluralLabel: 'segundos' },
  ]
  const accessibleCountdown = units
    .map((unit) => `${unit.value} ${unit.value === 1 ? unit.singularLabel : unit.pluralLabel}`)
    .join(', ')

  if (!submissionWindow.isOpen || countdown.isComplete) {
    return (
      <div className="submission-countdown submission-countdown-complete">
        <p className="countdown-kicker">Cierre de entregas</p>
        <div className="countdown-matrix countdown-complete" role="timer">
          Los envíos han cerrado
        </div>
        <p className="countdown-deadline">Cierre: {formatEcuadorDateTime(submissionWindow.deadline)}</p>
      </div>
    )
  }

  return (
    <div className="submission-countdown">
      <p className="countdown-kicker">Tiempo restante para enviar</p>
      <div
        className="countdown-matrix"
        role="timer"
        aria-live="off"
        aria-label={`${accessibleCountdown} para el cierre de las entregas`}
      >
        {units.map((unit, index) => (
          <div className="countdown-segment" key={unit.label}>
            <div className="countdown-unit">
              <DotMatrixNumber value={unit.value} />
              <small>{unit.label}</small>
            </div>
            {index < units.length - 1 ? (
              <span className="matrix-separator" aria-hidden="true">
                <i />
                <i />
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <p className="countdown-deadline">Cierre: {formatEcuadorDateTime(submissionWindow.deadline)}</p>
    </div>
  )
}
