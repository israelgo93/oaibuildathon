import { describe, expect, it } from 'vitest'
import type { Tables } from '../src/types/database.js'
import { isFinalSubmission, submissionVisibleToJudge } from './judge-visibility.js'

const submission: Tables<'project_submissions'> = {
  id: '50000000-0000-4000-8000-000000000001',
  team_id: '40000000-0000-4000-8000-000000000001',
  event_id: '10000000-0000-4000-8000-000000000001',
  project_name: 'Proyecto',
  short_description: 'Descripcion',
  problem: 'Problema',
  solution: 'Solucion',
  tech_stack: ['OpenAI API'],
  repository_url: 'https://github.com/example/project',
  demo_url: 'https://demo.example.com',
  presentation_url: '',
  video_url: '',
  status: 'draft',
  submitted_at: null,
  published_at: null,
  created_at: '2026-07-14T00:00:00.000Z',
  updated_at: '2026-07-14T00:00:00.000Z',
}

describe('visibilidad para jurado', () => {
  it('oculta por completo el contenido de un borrador', () => {
    expect(submissionVisibleToJudge(submission)).toBeNull()
    expect(isFinalSubmission(submission)).toBe(false)
  })

  it.each(['submitted', 'published'] as const)('expone una entrega %s', (status) => {
    const finalSubmission: Tables<'project_submissions'> = { ...submission, status, submitted_at: '2026-07-14T12:00:00.000Z' }
    expect(submissionVisibleToJudge(finalSubmission)).toBe(finalSubmission)
    expect(isFinalSubmission(finalSubmission)).toBe(true)
  })
})
