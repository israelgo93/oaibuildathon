import { describe, expect, it } from 'vitest'
import {
  createSubmissionAnalysisFingerprint,
  createSubmissionContentHash,
  isSubmissionResubmitCooldownActive,
  submissionContentMatchesInput,
} from './submission-analysis-fingerprint.js'

const submission = {
  id: '50000000-0000-4000-8000-000000000001',
  project_name: 'Proyecto Manta',
  short_description: 'Descripcion',
  problem: 'Problema',
  solution: 'Solucion',
  tech_stack: ['TypeScript'],
  repository_url: 'https://github.com/openai/example',
  demo_url: 'https://example.com',
  presentation_url: '',
  video_url: '',
  submitted_at: '2026-07-15T03:00:00.000Z',
}

const challenge = {
  id: '60000000-0000-4000-8000-000000000001',
  title: 'Reto',
  description: 'Descripcion del reto',
  thematic_axes: ['Productividad'],
  suggested_topics: ['Agentes'],
  requirements: 'Usar OpenAI',
}

const criteria = [
  {
    id: '70000000-0000-4000-8000-000000000002',
    name: 'Impacto',
    description: 'Impacto demostrado',
    max_score: 10,
    weight: 2,
    active: true,
    sort_order: 2,
  },
  {
    id: '70000000-0000-4000-8000-000000000001',
    name: 'Producto',
    description: 'Producto funcional',
    max_score: 10,
    weight: 1,
    active: true,
    sort_order: 1,
  },
]

describe('fingerprint del analisis IA', () => {
  it('es determinista aunque la consulta devuelva la rubrica en otro orden', () => {
    const first = createSubmissionAnalysisFingerprint({ submission, challenge, criteria })
    const second = createSubmissionAnalysisFingerprint({ submission, challenge, criteria: [...criteria].reverse() })
    expect(first).toBe(second)
  })

  it('cambia cuando cambia la entrega, el reto o la rubrica', () => {
    const original = createSubmissionAnalysisFingerprint({ submission, challenge, criteria })
    expect(createSubmissionAnalysisFingerprint({
      submission: { ...submission, solution: 'Otra solucion' },
      challenge,
      criteria,
    })).not.toBe(original)
    expect(createSubmissionAnalysisFingerprint({
      submission,
      challenge: { ...challenge, requirements: 'Nuevo requisito' },
      criteria,
    })).not.toBe(original)
    expect(createSubmissionAnalysisFingerprint({
      submission,
      challenge,
      criteria: criteria.map((criterion, index) => index === 0 ? { ...criterion, weight: 3 } : criterion),
    })).not.toBe(original)
  })

  it('detecta reenvios idempotentes sin considerar el orden de tecnologias', () => {
    expect(submissionContentMatchesInput(submission, {
      projectName: submission.project_name,
      shortDescription: submission.short_description,
      problem: submission.problem,
      solution: submission.solution,
      techStack: ['TypeScript'],
      repositoryUrl: submission.repository_url,
      demoUrl: submission.demo_url,
      presentationUrl: submission.presentation_url,
      videoUrl: submission.video_url,
    })).toBe(true)
    expect(submissionContentMatchesInput(submission, {
      projectName: submission.project_name,
      shortDescription: submission.short_description,
      problem: submission.problem,
      solution: 'Cambio real',
      techStack: ['TypeScript'],
      repositoryUrl: submission.repository_url,
      demoUrl: submission.demo_url,
      presentationUrl: submission.presentation_url,
      videoUrl: submission.video_url,
    })).toBe(false)
  })

  it('genera un hash estable de contenido y cambia ante una modificacion real', () => {
    expect(createSubmissionContentHash(submission))
      .toBe('99efdd7b640ab62caea6f9f147d275c85df9a28d9f744e1c8c9865a99085511a')
    expect(createSubmissionContentHash({ ...submission, tech_stack: ['TypeScript', 'OpenAI'] }))
      .not.toBe(createSubmissionContentHash(submission))
  })

  it('solo vuelve idempotente un reenvio identico durante treinta segundos', () => {
    const submittedAt = '2026-07-15T03:00:00.000Z'
    expect(isSubmissionResubmitCooldownActive(submittedAt, new Date('2026-07-15T03:00:29.999Z'))).toBe(true)
    expect(isSubmissionResubmitCooldownActive(submittedAt, new Date('2026-07-15T03:00:30.000Z'))).toBe(false)
    expect(isSubmissionResubmitCooldownActive(submittedAt, new Date('2026-07-15T02:59:59.999Z'))).toBe(false)
  })
})
