export const TECHNOLOGY_OPTIONS = [
  'OpenAI API',
  'Responses API',
  'Realtime API',
  'OpenAI Agents SDK',
  'Codex',
  'TypeScript',
  'JavaScript',
  'Python',
  'React',
  'Next.js',
  'Vite',
  'Node.js',
  'FastAPI',
  'Supabase',
  'PostgreSQL',
  'Vercel',
  'Docker',
  'Flutter',
  'React Native',
  'Tailwind CSS',
] as const

export type TechnologyOption = typeof TECHNOLOGY_OPTIONS[number]

const technologyByLowercase = new Map<string, TechnologyOption>(
  TECHNOLOGY_OPTIONS.map((technology) => [technology.toLowerCase(), technology]),
)

export interface TechnologySelection {
  selected: TechnologyOption[]
  custom: string[]
}

export function normalizeTechnologyStack(values: readonly string[]): string[] {
  const normalized: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const canonical = technologyByLowercase.get(trimmed.toLowerCase()) ?? trimmed
    const key = canonical.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(canonical)
  }

  return normalized
}

export function splitCustomTechnologies(value: string): string[] {
  return value.split(',').map((technology) => technology.trim()).filter(Boolean)
}

export function mapTechnologySelection(values: readonly string[]): TechnologySelection {
  const normalized = normalizeTechnologyStack(values)
  const selected: TechnologyOption[] = []
  const custom: string[] = []

  for (const technology of normalized) {
    const known = technologyByLowercase.get(technology.toLowerCase())
    if (known) selected.push(known)
    else custom.push(technology)
  }

  return { selected, custom }
}
