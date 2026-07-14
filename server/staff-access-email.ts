import { Resend } from 'resend'
import type { UserRole } from '../src/types/database.js'
import { staffAccessIdempotencyKey } from './staff-credentials.js'

export interface StaffAccessEmailConfig {
  apiKey: string
  from: string
  replyTo: string
  appBaseUrl: string
}

export interface StaffAccessEmailInput {
  profileId: string
  credentialVersion: number
  fullName: string
  email: string
  role: UserRole
  temporaryPassword: string
}

export interface StaffAccessEmailMessage {
  from: string
  to: string
  replyTo: string
  subject: string
  html: string
  text: string
  idempotencyKey: string
}

export type StaffAccessEmailDeliveryResult =
  | { ok: true; providerId: string }
  | { ok: false; code: string; statusCode: number | null; retryAfter: string | null }

export interface StaffAccessEmailTransport {
  send: (message: StaffAccessEmailMessage) => Promise<StaffAccessEmailDeliveryResult>
}

interface RoleInstructions {
  label: string
  subject: string
  steps: string[]
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function instructionsForRole(role: UserRole): RoleInstructions {
  switch (role) {
    case 'admin':
      return {
        label: 'administracion',
        subject: 'Tu acceso de administracion a OpenAI Build Week Manta',
        steps: [
          'Revisa la configuracion, fechas y etapas del evento antes de abrir cada flujo.',
          'Administra retos, equipos, staff, asignaciones, entregas y resultados desde el centro de control.',
          'Protege los datos personales y publica un proyecto solo despues de verificar su entrega.',
        ],
      }
    case 'judge':
      return {
        label: 'jurado',
        subject: 'Tu acceso como jurado a OpenAI Build Week Manta',
        steps: [
          'Ingresa al panel de jurado y revisa unicamente los equipos que te fueron asignados.',
          'Espera el envio final del proyecto antes de revisar su contenido o completar la rubrica.',
          'Guarda un borrador si lo necesitas y envia la calificacion completa dentro de la etapa habilitada.',
        ],
      }
    case 'mentor':
      return {
        label: 'mentor',
        subject: 'Tu acceso como mentor a OpenAI Build Week Manta',
        steps: [
          'Ingresa al panel de mentoria y revisa los equipos que te fueron asignados.',
          'Consulta integrantes, reto, contexto tematico, avance y enlaces disponibles antes de cada acompanamiento.',
          'Orienta la construccion sin modificar entregas ni calificaciones del jurado.',
        ],
      }
    default: {
      const exhaustiveCheck: never = role
      return exhaustiveCheck
    }
  }
}

function staffLoginUrl(appBaseUrl: string): string {
  const url = new URL('/login', appBaseUrl)
  if (url.protocol !== 'https:') throw new Error('APP_BASE_URL debe usar HTTPS')
  url.search = ''
  url.hash = ''
  return url.toString()
}

export function buildStaffAccessEmail(
  input: StaffAccessEmailInput,
  config: StaffAccessEmailConfig,
): StaffAccessEmailMessage {
  const instructions = instructionsForRole(input.role)
  const loginUrl = staffLoginUrl(config.appBaseUrl)
  const escapedName = escapeHtml(input.fullName)
  const escapedRole = escapeHtml(instructions.label)
  const escapedEmail = escapeHtml(input.email)
  const escapedPassword = escapeHtml(input.temporaryPassword)
  const escapedLoginUrl = escapeHtml(loginUrl)
  const escapedReplyTo = escapeHtml(config.replyTo)
  const instructionText = instructions.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')
  const instructionHtml = instructions.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')

  return {
    from: config.from,
    to: input.email,
    replyTo: config.replyTo,
    subject: instructions.subject,
    idempotencyKey: staffAccessIdempotencyKey(input.profileId, input.credentialVersion),
    text: [
      `Hola, ${input.fullName}.`,
      `Tu cuenta de ${instructions.label} para OpenAI Build Week Manta ya esta habilitada.`,
      `Correo de acceso: ${input.email}`,
      `Contrasena temporal: ${input.temporaryPassword}`,
      `Ingreso: ${loginUrl}`,
      'Por seguridad, debes cambiar esta contrasena temporal al iniciar sesion por primera vez. No la compartas.',
      'Pasos para tu rol:',
      instructionText,
      `Soporte: ${config.replyTo}`,
    ].join('\n\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:620px;margin:0 auto">
        <p style="font-size:14px;text-transform:uppercase;letter-spacing:.08em">OpenAI Build Week Manta</p>
        <h1 style="font-size:28px;line-height:1.2">Hola, ${escapedName}.</h1>
        <p>Tu cuenta de <strong>${escapedRole}</strong> ya esta habilitada.</p>
        <div style="padding:16px;border:1px solid #d7d7d7;border-radius:12px;background:#f7f7f7">
          <p style="margin:0 0 8px"><strong>Correo de acceso:</strong> ${escapedEmail}</p>
          <p style="margin:0"><strong>Contrasena temporal:</strong> <span style="font-family:monospace;font-size:18px">${escapedPassword}</span></p>
        </div>
        <p><a href="${escapedLoginUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:999px">Ingresar a la plataforma</a></p>
        <p><strong>Debes cambiar esta contrasena temporal al iniciar sesion por primera vez.</strong> No la compartas.</p>
        <h2 style="font-size:20px">Pasos para tu rol</h2>
        <ol>${instructionHtml}</ol>
        <p style="font-size:13px;color:#555">Soporte: ${escapedReplyTo}</p>
      </div>
    `.trim(),
  }
}

export class ResendStaffAccessEmailTransport implements StaffAccessEmailTransport {
  private readonly client: Resend

  constructor(apiKey: string) {
    this.client = new Resend(apiKey)
  }

  async send(message: StaffAccessEmailMessage): Promise<StaffAccessEmailDeliveryResult> {
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

export async function sendStaffAccessEmail(
  input: StaffAccessEmailInput,
  config: StaffAccessEmailConfig,
  transport: StaffAccessEmailTransport = new ResendStaffAccessEmailTransport(config.apiKey),
): Promise<StaffAccessEmailDeliveryResult> {
  return transport.send(buildStaffAccessEmail(input, config))
}
