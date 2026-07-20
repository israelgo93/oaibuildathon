import { randomInt } from 'node:crypto'

export interface RandomAssignmentPlan {
  staffId: string
  teamId: string
}

function shuffled<Value>(items: readonly Value[]): Value[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1)
    const current = result[index] as Value
    result[index] = result[swapIndex] as Value
    result[swapIndex] = current
  }
  return result
}

/**
 * Reparte todos los equipos pendientes entre el staff disponible de forma
 * aleatoria y balanceada: se barajan ambas listas y se asigna en round-robin,
 * por lo que la diferencia de carga entre dos personas es a lo sumo uno.
 */
export function planRandomAssignments(
  staffIds: readonly string[],
  teamIds: readonly string[],
): RandomAssignmentPlan[] {
  if (staffIds.length === 0 || teamIds.length === 0) return []
  const staff = shuffled(staffIds)
  return shuffled(teamIds).map((teamId, index) => ({
    staffId: staff[index % staff.length] as string,
    teamId,
  }))
}
