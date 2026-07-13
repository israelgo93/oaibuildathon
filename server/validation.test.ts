import { describe, expect, it } from 'vitest'
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

  it('permite guardar un borrador sin enlaces', () => {
    expect(submissionSchema.safeParse(baseSubmission).success).toBe(true)
  })

  it('exige demo o repositorio para enviar', () => {
    expect(submissionSchema.safeParse({ ...baseSubmission, submit: true }).success).toBe(false)
    expect(submissionSchema.safeParse({ ...baseSubmission, submit: true, demoUrl: 'https://example.com' }).success).toBe(true)
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
