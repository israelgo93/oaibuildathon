import { describe, expect, it } from 'vitest'
import type { Tables, TablesUpdate } from '../src/types/database.js'
import type { StaffAccessEmailDeliveryResult } from './staff-access-email.js'
import {
  rotateAndNotifyStaffAccess,
  type StaffAccessRepository,
} from './staff-access.js'

const NOW = new Date('2026-07-14T22:55:00.000Z')
const TEMPORARY_PASSWORD = 'Temporal9!Segura'
const emailConfig = {
  apiKey: 're_test',
  from: 'OpenAI Build Week Manta <noreply@datatensei.ai>',
  replyTo: 'soporte@datatensei.ai',
  appBaseUrl: 'https://oaibuildathon.vercel.app',
}

const baseProfile: Tables<'profiles'> = {
  id: '30000000-0000-4000-8000-000000000001',
  role: 'judge',
  full_name: 'Ada Lovelace',
  email: 'ada@example.com',
  active: true,
  must_change_password: false,
  temporary_password_expires_at: null,
  password_changed_at: '2026-07-01T12:00:00.000Z',
  credential_version: 4,
  access_email_status: 'sent',
  access_email_attempted_at: '2026-07-01T12:00:00.000Z',
  access_email_sent_at: '2026-07-01T12:00:01.000Z',
  access_email_error_code: null,
  created_at: '2026-07-01T11:00:00.000Z',
  updated_at: '2026-07-01T12:00:01.000Z',
}

class FakeRepository implements StaffAccessRepository {
  readonly activations: Array<{ profileId: string; password: string }> = []
  readonly claims: Array<{ version: number; attemptedAt: string; values: TablesUpdate<'profiles'> }> = []
  readonly events: string[] = []
  readonly updates: TablesUpdate<'profiles'>[] = []

  activateResult = true
  claimResult = true

  async activateCredential(profileId: string, password: string): Promise<boolean> {
    this.events.push('activate')
    this.activations.push({ profileId, password })
    return this.activateResult
  }

  async claimAttempt(
    _target: Tables<'profiles'>,
    credentialVersion: number,
    attemptedAt: string,
    values: TablesUpdate<'profiles'>,
  ): Promise<boolean> {
    this.events.push('claim')
    this.claims.push({ version: credentialVersion, attemptedAt, values })
    return this.claimResult
  }

  async updateProfile(_profileId: string, values: TablesUpdate<'profiles'>): Promise<void> {
    this.events.push(values.access_email_status === 'sent' ? 'update-sent' : 'update')
    this.updates.push(values)
  }
}

function deliveryResult(ok: boolean): StaffAccessEmailDeliveryResult {
  return ok
    ? { ok: true, providerId: 'email_123' }
    : { ok: false, code: 'provider_unavailable', statusCode: 503, retryAfter: '60' }
}

function dependencies(
  repository: FakeRepository,
  delivery: StaffAccessEmailDeliveryResult,
  events: string[] = repository.events,
) {
  return {
    repository,
    emailConfig,
    now: () => NOW,
    generatePassword: () => TEMPORARY_PASSWORD,
    sendEmail: async () => {
      events.push('send')
      return delivery
    },
    audit: async () => undefined,
  }
}

describe('rotacion y correo de acceso de staff', () => {
  it('conserva la clave anterior cuando Resend falla', async () => {
    const repository = new FakeRepository()
    const result = await rotateAndNotifyStaffAccess(
      baseProfile,
      { actorId: '10000000-0000-4000-8000-000000000001' },
      dependencies(repository, deliveryResult(false)),
    )

    expect(result).toEqual({ profileId: baseProfile.id, ok: false, errorCode: 'provider_unavailable' })
    expect(repository.activations).toHaveLength(0)
    expect(repository.events).toEqual(['claim', 'send', 'update'])
    expect(repository.updates.at(-1)).toMatchObject({
      access_email_status: 'failed',
      access_email_error_code: 'provider_unavailable',
    })
  })

  it('activa la clave solo despues de la aceptacion del correo y mantiene cambio obligatorio', async () => {
    const repository = new FakeRepository()
    const result = await rotateAndNotifyStaffAccess(
      baseProfile,
      { actorId: '10000000-0000-4000-8000-000000000001' },
      dependencies(repository, deliveryResult(true)),
    )

    expect(result.ok).toBe(true)
    expect(repository.events).toEqual(['claim', 'send', 'update', 'activate', 'update-sent'])
    expect(repository.activations).toEqual([{
      profileId: baseProfile.id,
      password: TEMPORARY_PASSWORD,
    }])
    expect(repository.updates.at(-1)).toMatchObject({
      must_change_password: true,
      password_changed_at: null,
      access_email_status: 'sent',
    })
  })

  it('restaura el estado anterior si Auth rechaza la activacion despues del correo', async () => {
    const repository = new FakeRepository()
    repository.activateResult = false
    const result = await rotateAndNotifyStaffAccess(
      baseProfile,
      { actorId: '10000000-0000-4000-8000-000000000001' },
      dependencies(repository, deliveryResult(true)),
    )

    expect(result).toEqual({
      profileId: baseProfile.id,
      ok: false,
      errorCode: 'auth_update_failed_after_email',
    })
    expect(repository.updates.at(-1)).toMatchObject({
      must_change_password: baseProfile.must_change_password,
      temporary_password_expires_at: baseProfile.temporary_password_expires_at,
      password_changed_at: baseProfile.password_changed_at,
      access_email_status: 'failed',
    })
  })

  it('no vuelve a escribir Auth al enviar la credencial ya creada para una cuenta nueva', async () => {
    const repository = new FakeRepository()
    const result = await rotateAndNotifyStaffAccess(
      { ...baseProfile, credential_version: 0, access_email_status: 'not_sent' },
      {
        actorId: '10000000-0000-4000-8000-000000000001',
        credentialAlreadyActive: true,
        temporaryPassword: TEMPORARY_PASSWORD,
      },
      dependencies(repository, deliveryResult(true)),
    )

    expect(result.ok).toBe(true)
    expect(repository.activations).toHaveLength(0)
    expect(repository.claims[0]?.values).toMatchObject({
      must_change_password: true,
      password_changed_at: null,
    })
  })

  it('no reserva ni cambia Auth cuando falta configuracion de correo', async () => {
    const repository = new FakeRepository()
    const result = await rotateAndNotifyStaffAccess(
      baseProfile,
      { actorId: '10000000-0000-4000-8000-000000000001' },
      {
        ...dependencies(repository, deliveryResult(true)),
        emailConfig: null,
      },
    )

    expect(result.errorCode).toBe('email_configuration_missing')
    expect(repository.claims).toHaveLength(0)
    expect(repository.activations).toHaveLength(0)
  })

  it('mantiene cambio obligatorio en una cuenta nueva aunque el correo no este configurado', async () => {
    const repository = new FakeRepository()
    const result = await rotateAndNotifyStaffAccess(
      { ...baseProfile, credential_version: 0, access_email_status: 'not_sent' },
      {
        actorId: '10000000-0000-4000-8000-000000000001',
        credentialAlreadyActive: true,
        temporaryPassword: TEMPORARY_PASSWORD,
      },
      {
        ...dependencies(repository, deliveryResult(true)),
        emailConfig: null,
      },
    )

    expect(result.errorCode).toBe('email_configuration_missing')
    expect(repository.updates[0]).toMatchObject({
      must_change_password: true,
      password_changed_at: null,
    })
    expect(repository.activations).toHaveLength(0)
  })

  it('rechaza un segundo intento mientras el primero sigue vigente', async () => {
    const repository = new FakeRepository()
    const pendingProfile: Tables<'profiles'> = {
      ...baseProfile,
      access_email_status: 'sending',
      access_email_attempted_at: new Date(NOW.getTime() - 60_000).toISOString(),
    }

    await expect(rotateAndNotifyStaffAccess(
      pendingProfile,
      { actorId: '10000000-0000-4000-8000-000000000001' },
      dependencies(repository, deliveryResult(true)),
    )).rejects.toMatchObject({ statusCode: 409 })
    expect(repository.claims).toHaveLength(0)
    expect(repository.activations).toHaveLength(0)
  })
})
