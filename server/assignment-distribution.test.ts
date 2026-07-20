import { describe, expect, it } from 'vitest'
import { planRandomAssignments } from './assignment-distribution.js'

describe('planRandomAssignments', () => {
  it('devuelve vacio sin staff o sin equipos', () => {
    expect(planRandomAssignments([], ['team-1'])).toEqual([])
    expect(planRandomAssignments(['judge-1'], [])).toEqual([])
  })

  it('asigna cada equipo exactamente una vez con carga balanceada', () => {
    const staff = ['judge-1', 'judge-2', 'judge-3']
    const teams = Array.from({ length: 11 }, (_, index) => `team-${index + 1}`)
    const plan = planRandomAssignments(staff, teams)

    expect(plan).toHaveLength(teams.length)
    expect(new Set(plan.map((item) => item.teamId)).size).toBe(teams.length)

    const load = new Map<string, number>()
    for (const item of plan) {
      expect(staff).toContain(item.staffId)
      load.set(item.staffId, (load.get(item.staffId) ?? 0) + 1)
    }
    const counts = [...load.values()]
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
    expect(counts.reduce((total, value) => total + value, 0)).toBe(teams.length)
  })

  it('cubre a todo el staff cuando hay mas equipos que personas', () => {
    const staff = ['mentor-1', 'mentor-2']
    const plan = planRandomAssignments(staff, ['team-1', 'team-2', 'team-3', 'team-4'])
    expect(new Set(plan.map((item) => item.staffId)).size).toBe(staff.length)
  })
})
