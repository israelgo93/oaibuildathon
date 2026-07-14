import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables, TablesUpdate } from '../src/types/database.js'
import { writeAuditLog } from './audit.js'
import { getEmailEnvironment, type EmailEnvironment } from './env.js'
import { HttpError } from './http.js'
import { sendStaffAccessEmail } from './staff-access-email.js'
import { generateTemporaryPassword } from './staff-credentials.js'
import { getServerSupabase } from './supabase.js'

const ACCESS_ATTEMPT_STALE_MINUTES = 15

export interface StaffAccessOutcome {
  profileId: string
  ok: boolean
  errorCode: string | null
}

export interface RotateStaffAccessOptions {
  actorId: string
  allowAdmin?: boolean
  credentialAlreadyActive?: boolean
  temporaryPassword?: string
}

export interface StaffAccessRepository {
  activateCredential: (profileId: string, password: string) => Promise<boolean>
  claimAttempt: (
    target: Tables<'profiles'>,
    credentialVersion: number,
    attemptedAt: string,
    values: TablesUpdate<'profiles'>,
  ) => Promise<boolean>
  updateProfile: (profileId: string, values: TablesUpdate<'profiles'>) => Promise<void>
}

export interface StaffAccessDependencies {
  audit?: typeof writeAuditLog
  emailConfig?: EmailEnvironment | null
  generatePassword?: () => string
  now?: () => Date
  repository?: StaffAccessRepository
  sendEmail?: typeof sendStaffAccessEmail
}

class SupabaseStaffAccessRepository implements StaffAccessRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async activateCredential(profileId: string, password: string): Promise<boolean> {
    const { error } = await this.supabase.auth.admin.updateUserById(profileId, {
      password,
    })
    return !error
  }

  async claimAttempt(
    target: Tables<'profiles'>,
    credentialVersion: number,
    attemptedAt: string,
    values: TablesUpdate<'profiles'>,
  ): Promise<boolean> {
    const { data: claimedRaw, error } = await this.supabase
      .from('profiles')
      .update({
        ...values,
        credential_version: credentialVersion,
        access_email_status: 'sending',
        access_email_attempted_at: attemptedAt,
        access_email_error_code: null,
      })
      .eq('id', target.id)
      .eq('credential_version', target.credential_version)
      .eq('access_email_status', target.access_email_status)
      .select('*')
      .maybeSingle()

    if (error) throw new Error('No fue posible reservar el envio de acceso')
    const claimed = claimedRaw as Tables<'profiles'> | null
    return Boolean(claimed)
  }

  async updateProfile(profileId: string, values: TablesUpdate<'profiles'>): Promise<void> {
    const { error } = await this.supabase.from('profiles').update(values).eq('id', profileId)
    if (error) throw new Error('No fue posible actualizar el estado de acceso del perfil')
  }
}

function safeErrorCode(value: string): string {
  return value.trim().slice(0, 100) || 'unknown_error'
}

function attemptIsRecent(target: Tables<'profiles'>, now: Date): boolean {
  if (target.access_email_status !== 'sending') return false
  if (!target.access_email_attempted_at) return true
  const attemptedAt = Date.parse(target.access_email_attempted_at)
  if (!Number.isFinite(attemptedAt)) return true
  return attemptedAt >= now.getTime() - ACCESS_ATTEMPT_STALE_MINUTES * 60 * 1000
}

async function recordOutcome(
  target: Tables<'profiles'>,
  actorId: string,
  credentialVersion: number,
  ok: boolean,
  errorCode: string | null,
  audit: typeof writeAuditLog,
): Promise<void> {
  await audit(actorId, ok ? 'staff.access_email_sent' : 'staff.access_email_failed', 'profile', target.id, {
    role: target.role,
    credentialVersion,
    errorCode,
  })
}

async function failWithoutRotation(
  target: Tables<'profiles'>,
  options: RotateStaffAccessOptions,
  repository: StaffAccessRepository,
  audit: typeof writeAuditLog,
  attemptedAt: string,
  errorCode: string,
): Promise<StaffAccessOutcome> {
  await repository.updateProfile(target.id, {
    access_email_status: 'failed',
    access_email_attempted_at: attemptedAt,
    access_email_error_code: errorCode,
  })
  await recordOutcome(target, options.actorId, target.credential_version, false, errorCode, audit)
  return { profileId: target.id, ok: false, errorCode }
}

function resolveEmailConfig(dependencies: StaffAccessDependencies): EmailEnvironment | null {
  if (Object.prototype.hasOwnProperty.call(dependencies, 'emailConfig')) {
    return dependencies.emailConfig ?? null
  }
  return getEmailEnvironment()
}

export async function rotateAndNotifyStaffAccess(
  target: Tables<'profiles'>,
  options: RotateStaffAccessOptions,
  dependencies: StaffAccessDependencies = {},
): Promise<StaffAccessOutcome> {
  const allowAdmin = options.allowAdmin === true
  if (!target.active || (target.role !== 'judge' && target.role !== 'mentor' && !(allowAdmin && target.role === 'admin'))) {
    throw new HttpError(400, 'Solo se puede notificar a un mentor o jurado activo')
  }

  const repository = dependencies.repository ?? new SupabaseStaffAccessRepository(getServerSupabase())
  const audit = dependencies.audit ?? writeAuditLog
  const now = (dependencies.now ?? (() => new Date()))()
  const attemptedAt = now.toISOString()
  const credentialAlreadyActive = options.credentialAlreadyActive === true
  let emailConfig: EmailEnvironment | null

  if (attemptIsRecent(target, now)) {
    throw new HttpError(409, 'Ya existe un envio de acceso en proceso para este perfil')
  }

  if (credentialAlreadyActive) {
    await repository.updateProfile(target.id, {
      must_change_password: true,
      temporary_password_expires_at: null,
      password_changed_at: null,
    })
  }

  try {
    emailConfig = resolveEmailConfig(dependencies)
  } catch {
    return failWithoutRotation(
      target,
      options,
      repository,
      audit,
      attemptedAt,
      'email_configuration_invalid',
    )
  }

  if (!emailConfig) {
    return failWithoutRotation(
      target,
      options,
      repository,
      audit,
      attemptedAt,
      'email_configuration_missing',
    )
  }

  const temporaryPassword = options.temporaryPassword ?? (dependencies.generatePassword ?? generateTemporaryPassword)()
  const credentialVersion = target.credential_version + 1
  const claimed = await repository.claimAttempt(target, credentialVersion, attemptedAt, credentialAlreadyActive
    ? {
        must_change_password: true,
        temporary_password_expires_at: null,
        password_changed_at: null,
      }
    : {})

  if (!claimed) {
    throw new HttpError(409, 'El estado de acceso cambio mientras se preparaba el envio')
  }

  const delivery = await (dependencies.sendEmail ?? sendStaffAccessEmail)({
    profileId: target.id,
    credentialVersion,
    fullName: target.full_name,
    email: target.email,
    role: target.role,
    temporaryPassword,
  }, emailConfig)

  if (delivery.ok === false) {
    const errorCode = safeErrorCode(delivery.code)
    await repository.updateProfile(target.id, {
      access_email_status: 'failed',
      access_email_error_code: errorCode,
    })
    await recordOutcome(target, options.actorId, credentialVersion, false, errorCode, audit)
    return { profileId: target.id, ok: false, errorCode }
  }

  if (!credentialAlreadyActive) {
    await repository.updateProfile(target.id, {
      must_change_password: true,
      temporary_password_expires_at: null,
      password_changed_at: null,
    })

    const activated = await repository.activateCredential(target.id, temporaryPassword)
    if (!activated) {
      const errorCode = 'auth_update_failed_after_email'
      await repository.updateProfile(target.id, {
        must_change_password: target.must_change_password,
        temporary_password_expires_at: target.temporary_password_expires_at,
        password_changed_at: target.password_changed_at,
        access_email_status: 'failed',
        access_email_error_code: errorCode,
      })
      await recordOutcome(target, options.actorId, credentialVersion, false, errorCode, audit)
      return { profileId: target.id, ok: false, errorCode }
    }
  }

  await repository.updateProfile(target.id, {
    must_change_password: true,
    temporary_password_expires_at: null,
    password_changed_at: null,
    access_email_status: 'sent',
    access_email_sent_at: new Date(now.getTime()).toISOString(),
    access_email_error_code: null,
  })
  await recordOutcome(target, options.actorId, credentialVersion, true, null, audit)
  return { profileId: target.id, ok: true, errorCode: null }
}
