import { describe, expect, it } from 'vitest'
import { effectiveSubmissionDeadline, formatEcuadorDateTime, isDeadlineReached } from '../src/lib/dates.js'
import { adminActionSchema, evaluationSchema, registrationSchema, submissionSchema } from './validation.js'

const validMember = {
  fullName: 'Ana Builder',
  email: 'ana@example.com',
  phone: '0999999999',
  city: 'Manta',
  memberRole: 'Desarrollo',
  isPrimaryContact: true,
}

const validRegistration = {
  eventId: '10000000-0000-4000-8000-000000000001',
  teamName: 'Orbita Uno',
  organization: '',
  city: 'Manta',
  contactEmail: validMember.email,
  contactPhone: validMember.phone,
  challengeId: '20000000-0000-4000-8000-000000000001',
  members: [validMember],
  website: '',
}

describe('registrationSchema', () => {
  it('acepta un registro global con uno a tres participantes', () => {
    expect(registrationSchema.safeParse(validRegistration).success).toBe(true)
    expect(registrationSchema.safeParse({
      ...validRegistration,
      members: [validMember, { ...validMember, email: 'dos@example.com', isPrimaryContact: false }],
    }).success).toBe(true)
    expect(registrationSchema.safeParse({
      ...validRegistration,
      members: [
        validMember,
        { ...validMember, email: 'dos@example.com', isPrimaryContact: false },
        { ...validMember, email: 'tres@example.com', isPrimaryContact: false },
      ],
    }).success).toBe(true)
  })

  it('rechaza cuatro participantes o mas de un contacto principal', () => {
    const fourMembers = Array.from({ length: 4 }, (_, index) => ({
      ...validMember,
      email: `builder${index}@example.com`,
      isPrimaryContact: index === 0,
    }))
    expect(registrationSchema.safeParse({ ...validRegistration, members: fourMembers }).success).toBe(false)
    expect(registrationSchema.safeParse({
      ...validRegistration,
      members: [validMember, { ...validMember, email: 'dos@example.com' }],
    }).success).toBe(false)
  })
})

describe('submissionSchema', () => {
  const baseSubmission = {
    projectName: 'Proyecto',
    shortDescription: 'Una demo funcional',
    problem: 'Un problema real',
    solution: 'Una solucion construida',
    techStack: ['OpenAI API'],
    repositoryUrl: '',
    demoUrl: '',
    presentationUrl: '',
    videoUrl: '',
    submit: false,
  }

  it('permite guardar un borrador completamente incompleto', () => {
    expect(submissionSchema.safeParse({
      ...baseSubmission,
      projectName: '',
      shortDescription: '',
      problem: '',
      solution: '',
      techStack: [],
    }).success).toBe(true)
  })

  it.each([
    ['projectName', { projectName: '' }],
    ['shortDescription', { shortDescription: '' }],
    ['problem', { problem: '' }],
    ['solution', { solution: '' }],
    ['techStack', { techStack: [] }],
    ['demoUrl', { demoUrl: '' }],
    ['repositoryUrl', { repositoryUrl: '' }],
  ])('rechaza por separado el campo final %s', (path, values) => {
    const result = submissionSchema.safeParse({
      ...baseSubmission,
      demoUrl: 'https://demo.example.com',
      repositoryUrl: 'https://github.com/example/project',
      submit: true,
      ...values,
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === path)).toBe(true)
  })

  it('normaliza tecnologias, elimina duplicados y conserva nombres canonicos', () => {
    const result = submissionSchema.safeParse({
      ...baseSubmission,
      techStack: [' react ', 'REACT', 'Herramienta propia', 'herramienta propia', ''],
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.techStack).toEqual(['React', 'Herramienta propia'])
  })

  it('rechaza mas de 20 tecnologias o nombres de mas de 60 caracteres', () => {
    expect(submissionSchema.safeParse({
      ...baseSubmission,
      techStack: Array.from({ length: 21 }, (_, index) => `Tecnologia ${index}`),
    }).success).toBe(false)
    expect(submissionSchema.safeParse({
      ...baseSubmission,
      techStack: ['x'.repeat(61)],
    }).success).toBe(false)
  })

  it('exige demo y repositorio para el envio final', () => {
    expect(submissionSchema.safeParse({ ...baseSubmission, submit: true }).success).toBe(false)
    expect(submissionSchema.safeParse({
      ...baseSubmission,
      submit: true,
      demoUrl: 'https://demo.example.com',
      repositoryUrl: 'https://github.com/example/project',
    }).success).toBe(true)
  })
})

describe('deadlines de entrega', () => {
  const challengeDeadline = '2026-07-18T22:00:00.000Z'
  const earlierGlobalDeadline = '2026-07-18T21:00:00.000Z'

  it('usa el menor entre el deadline del reto y el cierre global', () => {
    expect(effectiveSubmissionDeadline(challengeDeadline, null)).toBe(challengeDeadline)
    expect(effectiveSubmissionDeadline(challengeDeadline, earlierGlobalDeadline)).toBe(earlierGlobalDeadline)
  })

  it('permite antes del corte y bloquea exactamente en o despues del deadline', () => {
    expect(isDeadlineReached(challengeDeadline, new Date('2026-07-18T21:59:59.999Z'))).toBe(false)
    expect(isDeadlineReached(challengeDeadline, new Date(challengeDeadline))).toBe(true)
    expect(isDeadlineReached(challengeDeadline, new Date('2026-07-18T22:00:00.001Z'))).toBe(true)
  })

  it('muestra submitted_at y deadlines en America/Guayaquil con UTC-5 explicito', () => {
    expect(formatEcuadorDateTime('2026-07-18T22:00:00.000Z')).toContain('UTC-5')
    expect(formatEcuadorDateTime('2026-07-18T22:00:00.000Z')).toContain('17:00')
  })
})

describe('evaluationSchema', () => {
  it('rechaza puntajes fuera del rango absoluto', () => {
    const result = evaluationSchema.safeParse({
      eventId: validRegistration.eventId,
      teamId: '40000000-0000-4000-8000-000000000001',
      generalFeedback: '',
      submit: true,
      scores: [{ criterionId: '30000000-0000-4000-8000-000000000001', score: 101, comment: '' }],
    })
    expect(result.success).toBe(false)
  })
})

describe('adminActionSchema', () => {
  it('valida el limite absoluto de tres integrantes', () => {
    const result = adminActionSchema.safeParse({
      action: 'update_event',
      eventId: validRegistration.eventId,
      values: { min_team_size: 1, max_team_size: 4 },
    })
    expect(result.success).toBe(false)
  })
})
