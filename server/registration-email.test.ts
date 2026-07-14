import { describe, expect, it } from 'vitest'
import type { RegistrationEmailEnvironment } from './env.js'
import {
  buildRegistrationEmail,
  processRegistrationEmailForTeam,
  type RegistrationEmailDeliveryResult,
  type RegistrationEmailJob,
  type RegistrationEmailMessage,
  type RegistrationEmailRepository,
  type RegistrationEmailTransport,
} from './registration-email.js'

const config: RegistrationEmailEnvironment = {
  apiKey: 're_test',
  from: 'OpenAI Build Week Manta <registro@example.com>',
  replyTo: 'soporte@example.com',
  appBaseUrl: 'https://oaibuildathon.vercel.app',
}

const job: RegistrationEmailJob = {
  outbox: {
    id: '50000000-0000-4000-8000-000000000001',
    team_id: '40000000-0000-4000-8000-000000000001',
    event_id: '10000000-0000-4000-8000-000000000001',
    notification_type: 'team_registration',
    idempotency_key: 'team-registration/v1/40000000-0000-4000-8000-000000000001',
    status: 'pending',
    attempts: 0,
    next_attempt_at: null,
    provider_id: null,
    last_error_code: null,
    sent_at: null,
    created_at: '2026-07-14T00:00:00.000Z',
    updated_at: '2026-07-14T00:00:00.000Z',
  },
  team: {
    id: '40000000-0000-4000-8000-000000000001',
    event_id: '10000000-0000-4000-8000-000000000001',
    name: 'Orbita Uno',
    organization: '',
    city: 'Manta',
    contact_email: 'ana@example.com',
    contact_phone: '0999999999',
    status: 'registered',
    registration_code: 'ABC23456',
    management_token_hash: 'hash',
    registered_at: '2026-07-14T00:00:00.000Z',
    created_at: '2026-07-14T00:00:00.000Z',
    updated_at: '2026-07-14T00:00:00.000Z',
  },
  event: {
    id: '10000000-0000-4000-8000-000000000001',
    slug: 'build-week-manta',
    name: 'OpenAI Build Week Manta',
    tagline: '',
    location: 'Manta',
    starts_at: '2026-07-18T13:00:00.000Z',
    ends_at: '2026-07-19T01:00:00.000Z',
    registration_opens_at: null,
    registration_closes_at: null,
    submissions_close_at: '2026-07-18T23:00:00.000Z',
    scoring_opens_at: null,
    scoring_closes_at: null,
    registration_open: true,
    submissions_open: true,
    scoring_open: false,
    results_public: false,
    showcase_enabled: false,
    min_team_size: 1,
    max_team_size: 3,
    created_at: '2026-07-14T00:00:00.000Z',
    updated_at: '2026-07-14T00:00:00.000Z',
  },
  challenge: {
    id: '20000000-0000-4000-8000-000000000001',
    event_id: '10000000-0000-4000-8000-000000000001',
    title: 'Reto de agentes',
    description: '',
    thematic_axes: ['Operaciones y productividad'],
    suggested_topics: ['Automatizacion de compras'],
    requirements: '',
    active: true,
    max_teams: null,
    submission_deadline_at: '2026-07-18T22:00:00.000Z',
    sort_order: 1,
    created_at: '2026-07-14T00:00:00.000Z',
    updated_at: '2026-07-14T00:00:00.000Z',
  },
  memberCount: 2,
}

class FakeRepository implements RegistrationEmailRepository {
  currentJob: RegistrationEmailJob | null = structuredClone(job)
  sent: { attempts: number; providerId: string } | null = null
  failure: { status: 'retry' | 'failed'; nextAttemptAt: string | null; code: string } | null = null
  configurationMissing = false

  async loadByTeamId(): Promise<RegistrationEmailJob | null> {
    return this.currentJob
  }

  async markConfigurationMissing(): Promise<void> {
    this.configurationMissing = true
  }

  async markSent(_outboxId: string, attempts: number, providerId: string): Promise<void> {
    this.sent = { attempts, providerId }
    if (this.currentJob) this.currentJob.outbox.status = 'sent'
  }

  async markFailure(
    _outboxId: string,
    _attempts: number,
    status: 'retry' | 'failed',
    code: string,
    nextAttemptAt: string | null,
  ): Promise<void> {
    this.failure = { status, nextAttemptAt, code }
  }
}

class FakeTransport implements RegistrationEmailTransport {
  calls: RegistrationEmailMessage[] = []

  constructor(private readonly result: RegistrationEmailDeliveryResult) {}

  async send(message: RegistrationEmailMessage): Promise<RegistrationEmailDeliveryResult> {
    this.calls.push(message)
    return this.result
  }
}

describe('correo de registro', () => {
  it('construye HTML y texto con enlace fijo, codigo separado e idempotencia estable', () => {
    const message = buildRegistrationEmail(job, config)
    expect(message.idempotencyKey).toBe(`team-registration/v1/${job.team.id}`)
    expect(message.html).toContain('https://oaibuildathon.vercel.app/equipo')
    expect(message.html).not.toContain(`/equipo?`)
    expect(message.html).toContain(job.team.registration_code)
    expect(message.text).toContain('18 jul 2026')
  })

  it('marca el envio exitoso y evita repetir un outbox ya enviado', async () => {
    const repository = new FakeRepository()
    const transport = new FakeTransport({ ok: true, providerId: 'email_123' })
    const dependencies = { repository, transport, config, now: new Date('2026-07-14T12:00:00.000Z') }

    await processRegistrationEmailForTeam(job.team.id, dependencies)
    await processRegistrationEmailForTeam(job.team.id, dependencies)

    expect(repository.sent).toEqual({ attempts: 1, providerId: 'email_123' })
    expect(transport.calls).toHaveLength(1)
  })

  it('conserva el trabajo y programa reintento para 429 respetando Retry-After', async () => {
    const repository = new FakeRepository()
    const transport = new FakeTransport({ ok: false, code: 'rate_limit_exceeded', statusCode: 429, retryAfter: '120' })

    await expect(processRegistrationEmailForTeam(job.team.id, {
      repository,
      transport,
      config,
      now: new Date('2026-07-14T12:00:00.000Z'),
    })).resolves.toBeUndefined()

    expect(repository.currentJob).not.toBeNull()
    expect(repository.failure).toEqual({
      status: 'retry',
      nextAttemptAt: '2026-07-14T12:02:00.000Z',
      code: 'rate_limit_exceeded',
    })
  })

  it('no reintenta automaticamente un error permanente 4xx', async () => {
    const repository = new FakeRepository()
    const transport = new FakeTransport({ ok: false, code: 'validation_error', statusCode: 422, retryAfter: null })
    await processRegistrationEmailForTeam(job.team.id, { repository, transport, config })
    expect(repository.failure).toEqual({ status: 'failed', nextAttemptAt: null, code: 'validation_error' })
  })

  it('reintenta la colision concurrente de una misma idempotency key', async () => {
    const repository = new FakeRepository()
    const transport = new FakeTransport({ ok: false, code: 'concurrent_idempotent_requests', statusCode: 409, retryAfter: null })
    await processRegistrationEmailForTeam(job.team.id, { repository, transport, config })
    expect(repository.failure?.status).toBe('retry')
  })

  it('mantiene pendiente el outbox cuando falta la configuracion de Resend', async () => {
    const repository = new FakeRepository()
    await processRegistrationEmailForTeam(job.team.id, { repository, config: null })
    expect(repository.configurationMissing).toBe(true)
  })
})
