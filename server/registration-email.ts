import { Resend } from 'resend'
import { effectiveSubmissionDeadline, formatEcuadorDateTime } from '../src/lib/dates.js'
import type { Tables, TablesUpdate } from '../src/types/database.js'
import { getRegistrationEmailEnvironment, type RegistrationEmailEnvironment } from './env.js'
import { getServerSupabase } from './supabase.js'

export interface RegistrationEmailJob {
  outbox: Tables<'registration_email_outbox'>
  team: Tables<'teams'>
  event: Tables<'events'>
  challenge: Tables<'challenges'>
  memberCount: number
}

export interface RegistrationEmailMessage {
  from: string
  to: string
  replyTo: string
  subject: string
  html: string
  text: string
  idempotencyKey: string
}

export type RegistrationEmailDeliveryResult =
  | { ok: true; providerId: string }
  | { ok: false; code: string; statusCode: number | null; retryAfter: string | null }

export interface RegistrationEmailTransport {
  send: (message: RegistrationEmailMessage) => Promise<RegistrationEmailDeliveryResult>
}

export interface RegistrationEmailRepository {
  loadByTeamId: (teamId: string) => Promise<RegistrationEmailJob | null>
  markConfigurationMissing: (outboxId: string) => Promise<void>
  markSent: (outboxId: string, attempts: number, providerId: string, sentAt: string) => Promise<void>
  markFailure: (
    outboxId: string,
    attempts: number,
    status: 'retry' | 'failed',
    code: string,
    nextAttemptAt: string | null,
  ) => Promise<void>
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function buildRegistrationEmail(
  job: RegistrationEmailJob,
  config: RegistrationEmailEnvironment,
): RegistrationEmailMessage {
  const deadline = effectiveSubmissionDeadline(
    job.challenge.submission_deadline_at,
    job.event.submissions_close_at,
  )
  const formattedDeadline = formatEcuadorDateTime(deadline)
  const portalUrl = `${config.appBaseUrl}/equipo`
  const teamName = escapeHtml(job.team.name)
  const eventName = escapeHtml(job.event.name)
  const challengeTitle = escapeHtml(job.challenge.title)
  const registrationCode = escapeHtml(job.team.registration_code)

  return {
    from: config.from,
    to: job.team.contact_email,
    replyTo: config.replyTo,
    subject: 'Tu equipo ya esta registrado en OpenAI Build Week Manta',
    idempotencyKey: job.outbox.idempotency_key,
    text: [
      `Felicitaciones, ${job.team.name}.`,
      `Tu equipo ya esta registrado en ${job.event.name}.`,
      `Reto: ${job.challenge.title}.`,
      `Integrantes: ${job.memberCount}.`,
      `Deadline: ${formattedDeadline}.`,
      `Portal del equipo: ${portalUrl}`,
      `Codigo de equipo: ${job.team.registration_code}`,
      `Ingresa con el correo del contacto principal: ${job.team.contact_email}.`,
      'Guarda este codigo y no lo compartas. Completa y envia el proyecto antes del cierre.',
      `Soporte: ${config.replyTo}`,
    ].join('\n\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:620px;margin:0 auto">
        <p style="font-size:14px;text-transform:uppercase;letter-spacing:.08em">${eventName}</p>
        <h1 style="font-size:28px;line-height:1.2">${teamName}, ya estan en orbita.</h1>
        <p>El equipo quedo registrado correctamente.</p>
        <ul>
          <li><strong>Reto:</strong> ${challengeTitle}</li>
          <li><strong>Integrantes:</strong> ${job.memberCount}</li>
          <li><strong>Deadline:</strong> ${escapeHtml(formattedDeadline)}</li>
        </ul>
        <p><a href="${portalUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:999px">Abrir portal del equipo</a></p>
        <p>Ingresa con el correo del contacto principal y este codigo:</p>
        <p style="font-size:26px;font-weight:700;letter-spacing:.16em">${registrationCode}</p>
        <p><strong>Guarda el codigo y no lo compartas.</strong> El codigo esta separado del enlace y nunca se incluye en la URL.</p>
        <p>Completa y envia el proyecto antes del cierre.</p>
        <p style="font-size:13px;color:#555">Soporte: ${escapeHtml(config.replyTo)}</p>
      </div>
    `.trim(),
  }
}

export function nextRegistrationEmailAttempt(
  attempts: number,
  now: Date,
  retryAfter: string | null,
): string {
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) && seconds >= 0) {
      return new Date(now.getTime() + seconds * 1000).toISOString()
    }
    const retryDate = new Date(retryAfter)
    if (!Number.isNaN(retryDate.getTime()) && retryDate.getTime() > now.getTime()) {
      return retryDate.toISOString()
    }
  }

  const delayMinutes = Math.min(360, 5 * (2 ** Math.max(0, attempts - 1)))
  return new Date(now.getTime() + delayMinutes * 60_000).toISOString()
}

export function isRetryableRegistrationEmailFailure(statusCode: number | null, code: string): boolean {
  return code === 'concurrent_idempotent_requests'
    || statusCode === null
    || statusCode === 429
    || statusCode >= 500
}

export class ResendRegistrationEmailTransport implements RegistrationEmailTransport {
  private readonly client: Resend

  constructor(apiKey: string) {
    this.client = new Resend(apiKey)
  }

  async send(message: RegistrationEmailMessage): Promise<RegistrationEmailDeliveryResult> {
    try {
      const result = await this.client.emails.send({
        from: message.from,
        to: [message.to],
        replyTo: message.replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }, { idempotencyKey: message.idempotencyKey })

      if (result.error) {
        return {
          ok: false,
          code: result.error.name,
          statusCode: result.error.statusCode,
          retryAfter: result.headers?.['retry-after'] ?? null,
        }
      }

      return { ok: true, providerId: result.data.id }
    } catch {
      return { ok: false, code: 'network_error', statusCode: null, retryAfter: null }
    }
  }
}

export class SupabaseRegistrationEmailRepository implements RegistrationEmailRepository {
  async loadByTeamId(teamId: string): Promise<RegistrationEmailJob | null> {
    const supabase = getServerSupabase()
    const [outboxResult, teamResult, teamChallengeResult, membersResult] = await Promise.all([
      supabase.from('registration_email_outbox').select('*').eq('team_id', teamId).maybeSingle(),
      supabase.from('teams').select('*').eq('id', teamId).maybeSingle(),
      supabase.from('team_challenges').select('*').eq('team_id', teamId).maybeSingle(),
      supabase.from('team_members').select('*').eq('team_id', teamId),
    ])

    if (outboxResult.error || teamResult.error || teamChallengeResult.error || membersResult.error) return null
    if (!outboxResult.data || !teamResult.data || !teamChallengeResult.data) return null

    const outbox = outboxResult.data as Tables<'registration_email_outbox'>
    const team = teamResult.data as Tables<'teams'>
    const teamChallenge = teamChallengeResult.data as Tables<'team_challenges'>
    const members: Tables<'team_members'>[] = membersResult.data ?? []
    const [eventResult, challengeResult] = await Promise.all([
      supabase.from('events').select('*').eq('id', team.event_id).maybeSingle(),
      supabase.from('challenges').select('*').eq('id', teamChallenge.challenge_id).maybeSingle(),
    ])

    if (eventResult.error || challengeResult.error || !eventResult.data || !challengeResult.data) return null

    return {
      outbox,
      team,
      event: eventResult.data as Tables<'events'>,
      challenge: challengeResult.data as Tables<'challenges'>,
      memberCount: members.length,
    }
  }

  async markConfigurationMissing(outboxId: string): Promise<void> {
    const values: TablesUpdate<'registration_email_outbox'> = {
      status: 'pending',
      next_attempt_at: null,
      last_error_code: 'configuration_missing',
    }
    await getServerSupabase().from('registration_email_outbox').update(values).eq('id', outboxId)
  }

  async markSent(outboxId: string, attempts: number, providerId: string, sentAt: string): Promise<void> {
    const values: TablesUpdate<'registration_email_outbox'> = {
      status: 'sent',
      attempts,
      next_attempt_at: null,
      provider_id: providerId,
      last_error_code: null,
      sent_at: sentAt,
    }
    await getServerSupabase().from('registration_email_outbox').update(values).eq('id', outboxId)
  }

  async markFailure(
    outboxId: string,
    attempts: number,
    status: 'retry' | 'failed',
    code: string,
    nextAttemptAt: string | null,
  ): Promise<void> {
    const values: TablesUpdate<'registration_email_outbox'> = {
      status,
      attempts,
      next_attempt_at: nextAttemptAt,
      provider_id: null,
      last_error_code: code.slice(0, 80),
      sent_at: null,
    }
    await getServerSupabase().from('registration_email_outbox').update(values).eq('id', outboxId)
  }
}

export interface ProcessRegistrationEmailDependencies {
  config?: RegistrationEmailEnvironment | null
  repository?: RegistrationEmailRepository
  transport?: RegistrationEmailTransport
  now?: Date
}

export async function processRegistrationEmailForTeam(
  teamId: string,
  dependencies: ProcessRegistrationEmailDependencies = {},
): Promise<void> {
  const repository = dependencies.repository ?? new SupabaseRegistrationEmailRepository()
  const job = await repository.loadByTeamId(teamId)
  if (!job || job.outbox.status === 'sent') return

  const config = dependencies.config === undefined
    ? getRegistrationEmailEnvironment()
    : dependencies.config

  if (!config) {
    await repository.markConfigurationMissing(job.outbox.id)
    return
  }

  const transport = dependencies.transport ?? new ResendRegistrationEmailTransport(config.apiKey)
  const now = dependencies.now ?? new Date()
  const attempts = job.outbox.attempts + 1
  const result = await transport.send(buildRegistrationEmail(job, config))

  if (result.ok === true) {
    await repository.markSent(job.outbox.id, attempts, result.providerId, now.toISOString())
    return
  }

  const retryable = isRetryableRegistrationEmailFailure(result.statusCode, result.code)
  await repository.markFailure(
    job.outbox.id,
    attempts,
    retryable ? 'retry' : 'failed',
    result.code,
    retryable ? nextRegistrationEmailAttempt(attempts, now, result.retryAfter) : null,
  )
}

export async function safelyProcessRegistrationEmailForTeam(teamId: string): Promise<void> {
  try {
    await processRegistrationEmailForTeam(teamId)
  } catch {
    // El outbox conserva el pendiente; el registro nunca depende del proveedor de correo.
  }
}
