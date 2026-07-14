import type { SubmissionInput } from '../types/api.js'

export function isValidSubmissionUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function finalSubmissionError(input: SubmissionInput): string | null {
  if (!input.projectName.trim()) return 'Completa el nombre del proyecto.'
  if (!input.shortDescription.trim()) return 'Completa la descripcion corta.'
  if (!input.problem.trim()) return 'Completa el problema.'
  if (!input.solution.trim()) return 'Completa la solucion construida.'
  if (input.techStack.length === 0) return 'Selecciona al menos una tecnologia.'
  if (input.techStack.length > 20) return 'Puedes seleccionar hasta 20 tecnologias.'
  if (input.techStack.some((technology) => technology.length > 60)) return 'Cada tecnologia admite hasta 60 caracteres.'
  if (!isValidSubmissionUrl(input.demoUrl)) return 'Ingresa una URL valida de demo.'
  if (!isValidSubmissionUrl(input.repositoryUrl)) return 'Ingresa una URL valida de repositorio.'
  if (input.presentationUrl && !isValidSubmissionUrl(input.presentationUrl)) return 'Ingresa una URL valida de presentacion.'
  if (input.videoUrl && !isValidSubmissionUrl(input.videoUrl)) return 'Ingresa una URL valida de video.'
  return null
}
