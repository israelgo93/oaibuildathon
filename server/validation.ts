import { z } from 'zod'

const requiredText = (label: string, maxLength: number) =>
  z.string().trim().min(1, `${label} es obligatorio`).max(maxLength, `${label} es demasiado largo`)

const optionalUrl = z.union([
  z.literal(''),
  z.string().trim().url('Ingresa una URL valida').max(500, 'La URL es demasiado larga'),
])

export const registrationSchema = z.object({
  eventId: z.string().uuid(),
  teamName: requiredText('El nombre del equipo', 80),
  organization: z.string().trim().max(120),
  city: requiredText('La ciudad', 80),
  contactEmail: z.string().trim().email().max(254),
  contactPhone: z.string().trim().min(7).max(30),
  challengeId: z.string().uuid(),
  members: z.array(z.object({
    fullName: requiredText('El nombre del participante', 120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(7).max(30),
    city: requiredText('La ciudad del participante', 80),
    memberRole: z.string().trim().max(80),
    isPrimaryContact: z.boolean(),
  })).min(1).max(3),
  website: z.string().max(0),
  turnstileToken: z.string().optional(),
}).superRefine((value, context) => {
  const primaryMembers = value.members.filter((member) => member.isPrimaryContact)
  if (primaryMembers.length !== 1) {
    context.addIssue({ code: 'custom', message: 'Debe existir un contacto principal', path: ['members'] })
  }

  if (primaryMembers[0]?.email.toLowerCase() !== value.contactEmail.toLowerCase()) {
    context.addIssue({ code: 'custom', message: 'El correo de contacto debe pertenecer al contacto principal', path: ['contactEmail'] })
  }
})

export const teamLoginSchema = z.object({
  registrationCode: z.string().trim().toUpperCase().regex(/^[A-Z2-9]{8}$/),
  contactEmail: z.string().trim().email().max(254),
})

export const submissionSchema = z.object({
  projectName: requiredText('El nombre del proyecto', 100),
  shortDescription: requiredText('La descripcion corta', 240),
  problem: requiredText('El problema', 2000),
  solution: requiredText('La solucion', 3000),
  techStack: z.array(requiredText('La tecnologia', 60)).max(20),
  repositoryUrl: optionalUrl,
  demoUrl: optionalUrl,
  presentationUrl: optionalUrl,
  videoUrl: optionalUrl,
  submit: z.boolean(),
}).superRefine((value, context) => {
  if (value.submit && !value.demoUrl && !value.repositoryUrl) {
    context.addIssue({ code: 'custom', message: 'Agrega al menos una URL de demo o repositorio', path: ['demoUrl'] })
  }
})

export const staffSchema = z.object({
  fullName: requiredText('El nombre', 120),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
  role: z.enum(['admin', 'judge', 'mentor']),
})

export const evaluationSchema = z.object({
  eventId: z.string().uuid(),
  teamId: z.string().uuid(),
  generalFeedback: z.string().trim().max(4000),
  submit: z.boolean(),
  scores: z.array(z.object({
    criterionId: z.string().uuid(),
    score: z.number().min(0).max(100),
    comment: z.string().trim().max(1000),
  })).max(30),
})

export const adminActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('update_event'),
    eventId: z.string().uuid(),
    values: z.object({
      name: z.string().trim().min(1).max(160).optional(),
      tagline: z.string().trim().max(240).optional(),
      location: z.string().trim().max(160).optional(),
      starts_at: z.string().datetime({ offset: true }).optional(),
      ends_at: z.string().datetime({ offset: true }).optional(),
      registration_opens_at: z.string().datetime({ offset: true }).nullable().optional(),
      registration_closes_at: z.string().datetime({ offset: true }).nullable().optional(),
      submissions_close_at: z.string().datetime({ offset: true }).nullable().optional(),
      scoring_opens_at: z.string().datetime({ offset: true }).nullable().optional(),
      scoring_closes_at: z.string().datetime({ offset: true }).nullable().optional(),
      registration_open: z.boolean().optional(),
      submissions_open: z.boolean().optional(),
      scoring_open: z.boolean().optional(),
      results_public: z.boolean().optional(),
      showcase_enabled: z.boolean().optional(),
      min_team_size: z.number().int().min(1).max(3).optional(),
      max_team_size: z.number().int().min(1).max(3).optional(),
    }).strict(),
  }),
  z.object({ action: z.literal('create_challenge'), eventId: z.string().uuid(), title: requiredText('El titulo', 120), description: requiredText('La descripcion', 1500), requirements: z.string().trim().max(2000), maxTeams: z.number().int().positive().nullable() }),
  z.object({ action: z.literal('update_challenge'), challengeId: z.string().uuid(), title: requiredText('El titulo', 120), description: requiredText('La descripcion', 1500), requirements: z.string().trim().max(2000), active: z.boolean(), maxTeams: z.number().int().positive().nullable() }),
  z.object({ action: z.literal('create_criterion'), eventId: z.string().uuid(), name: requiredText('El criterio', 120), description: requiredText('La descripcion', 1500), maxScore: z.number().positive().max(100), weight: z.number().positive().max(100) }),
  z.object({ action: z.literal('update_criterion'), criterionId: z.string().uuid(), name: requiredText('El criterio', 120), description: requiredText('La descripcion', 1500), maxScore: z.number().positive().max(100), weight: z.number().positive().max(100), active: z.boolean() }),
  z.object({ action: z.literal('set_team_status'), teamId: z.string().uuid(), status: z.enum(['registered', 'active', 'withdrawn', 'disqualified']) }),
  z.object({ action: z.literal('set_submission_status'), submissionId: z.string().uuid(), status: z.enum(['draft', 'submitted', 'published']) }),
  z.object({ action: z.literal('add_member'), teamId: z.string().uuid(), eventId: z.string().uuid(), fullName: requiredText('El nombre', 120), email: z.string().email().max(254), phone: z.string().trim().min(7).max(30), city: requiredText('La ciudad', 80), memberRole: z.string().trim().max(80) }),
  z.object({ action: z.literal('assign_judge'), eventId: z.string().uuid(), judgeId: z.string().uuid(), teamId: z.string().uuid() }),
  z.object({ action: z.literal('assign_mentor'), eventId: z.string().uuid(), mentorId: z.string().uuid(), teamId: z.string().uuid(), notes: z.string().trim().max(2000) }),
  z.object({ action: z.literal('remove_judge_assignment'), assignmentId: z.string().uuid() }),
  z.object({ action: z.literal('remove_mentor_assignment'), assignmentId: z.string().uuid() }),
])
