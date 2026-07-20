import { describe, expect, it } from 'vitest'
import { countdownUntil, earliestSubmissionDeadline } from './countdown'

describe('countdown de entregas', () => {
  it('calcula el tiempo restante con horas, minutos y segundos', () => {
    const countdown = countdownUntil(
      '2026-07-15T20:45:00.000Z',
      new Date('2026-07-15T18:12:53.000Z').getTime(),
    )

    expect(countdown).toEqual({
      days: 0,
      hours: 2,
      minutes: 32,
      seconds: 7,
      isComplete: false,
    })
  })

  it('termina exactamente en el deadline y nunca muestra valores negativos', () => {
    const deadline = '2026-07-15T20:45:00.000Z'

    expect(countdownUntil(deadline, new Date(deadline).getTime())).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isComplete: true,
    })
    expect(countdownUntil(deadline, new Date('2026-07-15T20:46:00.000Z').getTime()).isComplete).toBe(true)
  })

  it('usa el primer cierre entre los retos y el corte global', () => {
    expect(earliestSubmissionDeadline(
      ['2026-07-15T21:00:00.000Z', '2026-07-15T22:00:00.000Z'],
      '2026-07-15T20:45:00.000Z',
      '2026-07-15T23:00:00.000Z',
    )).toBe('2026-07-15T20:45:00.000Z')
  })
})
