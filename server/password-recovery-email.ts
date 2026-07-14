import { createHmac } from 'node:crypto'
import { Resend } from 'resend'

const passwordRecoveryIdempotencyKeyBrand: unique symbol = Symbol('passwordRecoveryIdempotencyKey')

const IDEMPOTENCY_DOMAIN = 'oaibuildathon/password-recovery-email/idempotency/v1'
const EMAIL_RATE_LIMIT_DOMAIN = 'oaibuildathon/password-recovery/rate-limit/email/v1'
const IP_RATE_LIMIT_DOMAIN = 'oaibuildathon/password-recovery/rate-limit/ip/v1'

export interface PasswordRecoveryEmailConfig {
  apiKey: string
  from: string
  replyTo: string
}

export interface PasswordRecoveryEmailIdempotencyKey {
  readonly value: string
  readonly [passwordRecoveryIdempotencyKeyBrand]: true
}

export interface PasswordRecoveryEmailInput {
  recipientName: string
  recipientEmail: string
  actionLink: string
  idempotencyKey: PasswordRecoveryEmailIdempotencyKey
}

export interface PasswordRecoveryEmailMessage {
  from: string
  to: string
  replyTo: string
  subject: string
  html: string
  text: string
  idempotencyKey: PasswordRecoveryEmailIdempotencyKey
}

export type PasswordRecoveryEmailDeliveryResult =
  | { ok: true; providerId: string }
  | { ok: false; code: string; statusCode: number | null; retryAfter: string | null }

export interface PasswordRecoveryEmailTransport {
  send: (message: PasswordRecoveryEmailMessage) => Promise<PasswordRecoveryEmailDeliveryResult>
}

export type PasswordRecoveryRateLimitDimension = 'email' | 'ip'

function requireSecret(secret: string): string {
  if (secret.length < 32) {
    throw new Error('TEAM_SESSION_SECRET debe tener al menos 32 caracteres')
  }

  return secret
}

function requireText(value: string, field: string): string {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${field} es obligatorio`)
  return normalized
}

function hmacSha256(secret: string, domain: string, value: string): string {
  return createHmac('sha256', requireSecret(secret))
    .update(domain, 'utf8')
    .update('\0', 'utf8')
    .update(value, 'utf8')
    .digest('hex')
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function normalizedRateLimitIdentity(
  dimension: PasswordRecoveryRateLimitDimension,
  identity: string,
): { domain: string; value: string } {
  switch (dimension) {
    case 'email':
      return {
        domain: EMAIL_RATE_LIMIT_DOMAIN,
        value: requireText(identity, 'El correo').toLowerCase(),
      }
    case 'ip':
      return {
        domain: IP_RATE_LIMIT_DOMAIN,
        value: requireText(identity, 'La direccion IP').toLowerCase(),
      }
    default: {
      const exhaustiveCheck: never = dimension
      return exhaustiveCheck
    }
  }
}

export function createPasswordRecoveryEmailIdempotencyKey(
  requestId: string,
  teamSessionSecret: string,
): PasswordRecoveryEmailIdempotencyKey {
  const digest = hmacSha256(
    teamSessionSecret,
    IDEMPOTENCY_DOMAIN,
    requireText(requestId, 'El identificador de la solicitud'),
  )

  return {
    value: `password-recovery/v1/${digest}`,
    [passwordRecoveryIdempotencyKeyBrand]: true,
  }
}

export function createPasswordRecoveryRateLimitKey(
  dimension: PasswordRecoveryRateLimitDimension,
  identity: string,
  teamSessionSecret: string,
): string {
  const normalized = normalizedRateLimitIdentity(dimension, identity)
  return `password-recovery-rate/v1/${hmacSha256(teamSessionSecret, normalized.domain, normalized.value)}`
}

function buildPasswordRecoveryEmail(
  input: PasswordRecoveryEmailInput,
  config: PasswordRecoveryEmailConfig,
): PasswordRecoveryEmailMessage {
  const recipientName = requireText(input.recipientName, 'El nombre')
  const recipientEmail = requireText(input.recipientEmail, 'El correo')
  const actionLink = requireText(input.actionLink, 'El enlace de recuperacion')
  const parsedActionLink = new URL(actionLink)

  if (parsedActionLink.protocol !== 'https:') {
    throw new Error('El enlace de recuperacion debe usar HTTPS')
  }

  const escapedName = escapeHtml(recipientName)
  const escapedActionLink = escapeHtml(actionLink)

  return {
    from: requireText(config.from, 'El remitente'),
    to: recipientEmail,
    replyTo: requireText(config.replyTo, 'El correo de respuesta'),
    subject: 'Restablece tu contrasena de OpenAI Build Week Manta',
    idempotencyKey: input.idempotencyKey,
    text: [
      `Hola, ${recipientName}.`,
      'Recibimos una solicitud para restablecer la contrasena de tu cuenta.',
      `Crea una nueva contrasena desde este enlace: ${actionLink}`,
      'El enlace es personal y temporal. No lo compartas con nadie.',
      'Si no solicitaste este cambio, ignora este mensaje y conserva tu contrasena actual.',
    ].join('\n\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:620px;margin:0 auto">
        <p style="font-size:14px;text-transform:uppercase;letter-spacing:.08em">OpenAI Build Week Manta</p>
        <h1 style="font-size:28px;line-height:1.2">Restablece tu contrasena</h1>
        <p>Hola, ${escapedName}.</p>
        <p>Recibimos una solicitud para restablecer la contrasena de tu cuenta.</p>
        <p><a href="${escapedActionLink}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:999px">Crear nueva contrasena</a></p>
        <p><strong>El enlace es personal y temporal.</strong> No lo compartas con nadie.</p>
        <p>Si no solicitaste este cambio, ignora este mensaje y conserva tu contrasena actual.</p>
        <p style="font-size:13px;color:#555">Soporte: ${escapeHtml(config.replyTo)}</p>
      </div>
    `.trim(),
  }
}

export class ResendPasswordRecoveryEmailTransport implements PasswordRecoveryEmailTransport {
  private readonly client: Resend

  constructor(apiKey: string) {
    this.client = new Resend(requireText(apiKey, 'La credencial de Resend'))
  }

  async send(message: PasswordRecoveryEmailMessage): Promise<PasswordRecoveryEmailDeliveryResult> {
    try {
      const result = await this.client.emails.send({
        from: message.from,
        to: [message.to],
        replyTo: message.replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }, { idempotencyKey: message.idempotencyKey.value })

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

export interface SendPasswordRecoveryEmailDependencies {
  transport?: PasswordRecoveryEmailTransport
}

export async function sendPasswordRecoveryEmail(
  input: PasswordRecoveryEmailInput,
  config: PasswordRecoveryEmailConfig,
  dependencies: SendPasswordRecoveryEmailDependencies = {},
): Promise<PasswordRecoveryEmailDeliveryResult> {
  const transport = dependencies.transport ?? new ResendPasswordRecoveryEmailTransport(config.apiKey)
  return transport.send(buildPasswordRecoveryEmail(input, config))
}
