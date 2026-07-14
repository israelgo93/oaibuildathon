import {
  Resend,
  type CreateBatchOptions,
  type CreateBatchRequestOptions,
  type CreateBatchResponse,
} from 'resend'
import { isBroadcastRecipientEmail } from '../src/lib/broadcast-recipients.js'
export {
  BROADCAST_EMAIL_LENGTH_LIMIT,
  BROADCAST_IMPORT_BYTES_LIMIT,
  BROADCAST_RECIPIENT_LIMIT,
  BroadcastRecipientParseError,
  parseBroadcastRecipients,
} from '../src/lib/broadcast-recipients.js'

export const RESEND_BATCH_SIZE = 100

export type BroadcastCtaKey = 'none' | 'landing' | 'registration' | 'team_portal' | 'staff_login'

export type BroadcastEmailErrorCode =
  | 'invalid_app_base_url'
  | 'invalid_email_configuration'
  | 'invalid_recipient'
  | 'invalid_content'
  | 'invalid_campaign_id'
  | 'invalid_delivery_batch'

export class BroadcastEmailError extends Error {
  readonly code: BroadcastEmailErrorCode

  constructor(code: BroadcastEmailErrorCode, message: string) {
    super(message)
    this.name = 'BroadcastEmailError'
    this.code = code
  }
}

export interface BroadcastEmailConfiguration {
  from: string
  replyTo: string
  appBaseUrl: string
}

export interface BroadcastEmailInput {
  to: string
  subject: string
  message: string
  cta: BroadcastCtaKey
}

export interface BroadcastEmailMessage {
  from: string
  to: string
  replyTo: string
  subject: string
  html: string
  text: string
}

export interface BroadcastDeliveryMessage extends BroadcastEmailMessage {
  batchNumber: number
  idempotencyKey: string
}

export interface ResolvedBroadcastCta {
  label: string
  url: string
}

export type BroadcastRecipientDeliveryResult =
  | {
      ok: true
      email: string
      providerId: string
      batchIndex: number
      idempotencyKey: string
    }
  | {
      ok: false
      email: string
      code: string
      message: string
      statusCode: number | null
      retryAfter: string | null
      batchIndex: number
      idempotencyKey: string
    }

export type BroadcastBatchRequestOptions = CreateBatchRequestOptions & {
  batchValidation: 'permissive'
  idempotencyKey: string
}

export type BroadcastBatchSend = (
  payload: CreateBatchOptions,
  options: BroadcastBatchRequestOptions,
) => Promise<CreateBatchResponse<BroadcastBatchRequestOptions>>

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function validatedAppOrigin(appBaseUrl: string): string {
  let url: URL
  try {
    url = new URL(appBaseUrl)
  } catch {
    throw new BroadcastEmailError('invalid_app_base_url', 'APP_BASE_URL no contiene una URL valida')
  }

  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    throw new BroadcastEmailError('invalid_app_base_url', 'APP_BASE_URL debe ser un origen HTTPS valido')
  }

  return url.origin
}

export function resolveBroadcastCta(
  cta: BroadcastCtaKey,
  appBaseUrl: string,
): ResolvedBroadcastCta | null {
  const origin = validatedAppOrigin(appBaseUrl)
  switch (cta) {
    case 'none':
      return null
    case 'landing':
      return { label: 'Ver OpenAI Build Week Manta', url: `${origin}/` }
    case 'registration':
      return { label: 'Registrar equipo', url: `${origin}/registro` }
    case 'team_portal':
      return { label: 'Abrir portal del equipo', url: `${origin}/equipo` }
    case 'staff_login':
      return { label: 'Iniciar sesion', url: `${origin}/login` }
    default: {
      const exhaustiveCheck: never = cta
      return exhaustiveCheck
    }
  }
}

function validatedConfiguration(configuration: BroadcastEmailConfiguration): BroadcastEmailConfiguration {
  const from = configuration.from.trim()
  const replyTo = configuration.replyTo.trim()
  if (!from || !replyTo || from.length > 320 || replyTo.length > 254) {
    throw new BroadcastEmailError(
      'invalid_email_configuration',
      'La configuracion del remitente y correo de respuesta no es valida',
    )
  }

  validatedAppOrigin(configuration.appBaseUrl)
  return { from, replyTo, appBaseUrl: configuration.appBaseUrl }
}

export function buildBroadcastEmail(
  input: BroadcastEmailInput,
  configuration: BroadcastEmailConfiguration,
): BroadcastEmailMessage {
  const config = validatedConfiguration(configuration)
  const to = input.to.trim().toLowerCase()
  const subject = input.subject.trim()
  const message = input.message.trim()

  if (!isBroadcastRecipientEmail(to)) {
    throw new BroadcastEmailError('invalid_recipient', 'El destinatario no contiene un correo valido')
  }
  if (!subject || !message) {
    throw new BroadcastEmailError('invalid_content', 'El asunto y el mensaje son obligatorios')
  }

  const cta = resolveBroadcastCta(input.cta, config.appBaseUrl)
  const ctaText = cta ? `\n\n${cta.label}: ${cta.url}` : ''
  const ctaHtml = cta
    ? `<p style="margin:28px 0 8px"><a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:999px">${escapeHtml(cta.label)}</a></p>`
    : ''
  const messageHtml = escapeHtml(message).replace(/\r?\n/g, '<br />')

  return {
    from: config.from,
    to,
    replyTo: config.replyTo,
    subject,
    text: `${message}${ctaText}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:620px;margin:0 auto">
        <p style="font-size:14px;text-transform:uppercase;letter-spacing:.08em">OpenAI Build Week Manta</p>
        <h1 style="font-size:28px;line-height:1.2">${escapeHtml(subject)}</h1>
        <p>${messageHtml}</p>
        ${ctaHtml}
        <p style="font-size:13px;color:#555">Este es un mensaje informativo de la organizacion.</p>
      </div>
    `.trim(),
  }
}

export function chunkBroadcastMessages(messages: BroadcastEmailMessage[]): BroadcastEmailMessage[][] {
  const chunks: BroadcastEmailMessage[][] = []
  for (let index = 0; index < messages.length; index += RESEND_BATCH_SIZE) {
    chunks.push(messages.slice(index, index + RESEND_BATCH_SIZE))
  }
  return chunks
}

export function broadcastBatchIdempotencyKey(campaignId: string, batchIndex: number): string {
  const normalizedCampaignId = campaignId.trim()
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(normalizedCampaignId) || !Number.isInteger(batchIndex) || batchIndex < 0) {
    throw new BroadcastEmailError('invalid_campaign_id', 'La referencia de la campana no es valida')
  }

  return `broadcast/v2/${normalizedCampaignId}/${batchIndex}`
}

function groupedDeliveryBatches(messages: BroadcastDeliveryMessage[]): BroadcastDeliveryMessage[][] {
  const grouped = new Map<string, BroadcastDeliveryMessage[]>()
  for (const message of messages) {
    const expectedKey = broadcastBatchIdempotencyKey(
      message.idempotencyKey.split('/')[2] ?? '',
      message.batchNumber,
    )
    if (message.idempotencyKey !== expectedKey) {
      throw new BroadcastEmailError('invalid_delivery_batch', 'La clave idempotente del lote no es valida')
    }
    const batch = grouped.get(message.idempotencyKey) ?? []
    if (batch.length >= RESEND_BATCH_SIZE || batch.some((item) => item.batchNumber !== message.batchNumber)) {
      throw new BroadcastEmailError('invalid_delivery_batch', 'El lote de difusion no es valido')
    }
    batch.push(message)
    grouped.set(message.idempotencyKey, batch)
  }

  return [...grouped.values()].sort((left, right) => {
    const batchDifference = (left[0]?.batchNumber ?? 0) - (right[0]?.batchNumber ?? 0)
    if (batchDifference !== 0) return batchDifference
    return (left[0]?.idempotencyKey ?? '').localeCompare(right[0]?.idempotencyKey ?? '')
  })
}

function failedBatchResults(
  messages: BroadcastEmailMessage[],
  batchIndex: number,
  idempotencyKey: string,
  code: string,
  message: string,
  statusCode: number | null,
  retryAfter: string | null,
): BroadcastRecipientDeliveryResult[] {
  return messages.map((email) => ({
    ok: false,
    email: email.to,
    code,
    message,
    statusCode,
    retryAfter,
    batchIndex,
    idempotencyKey,
  }))
}

export class ResendBroadcastEmailTransport {
  private readonly sendBatch: BroadcastBatchSend

  constructor(apiKey: string, sendBatch?: BroadcastBatchSend) {
    const normalizedApiKey = apiKey.trim()
    if (!normalizedApiKey) {
      throw new BroadcastEmailError('invalid_email_configuration', 'Falta la clave de Resend')
    }

    if (sendBatch) {
      this.sendBatch = sendBatch
      return
    }

    const resend = new Resend(normalizedApiKey)
    this.sendBatch = (payload, options) => resend.batch.send(payload, options)
  }

  async send(
    messages: BroadcastDeliveryMessage[],
  ): Promise<BroadcastRecipientDeliveryResult[]> {
    const results: BroadcastRecipientDeliveryResult[] = []
    const chunks = groupedDeliveryBatches(messages)

    for (const chunk of chunks) {
      const batchIndex = chunk[0]?.batchNumber ?? 0
      const idempotencyKey = chunk[0]?.idempotencyKey ?? ''
      const payload: CreateBatchOptions = chunk.map((message) => ({
        from: message.from,
        to: [message.to],
        replyTo: message.replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }))
      const options: BroadcastBatchRequestOptions = {
        batchValidation: 'permissive',
        idempotencyKey,
      }

      try {
        const response = await this.sendBatch(payload, options)
        if (response.error) {
          results.push(...failedBatchResults(
            chunk,
            batchIndex,
            idempotencyKey,
            response.error.name,
            response.error.message,
            response.error.statusCode,
            response.headers?.['retry-after'] ?? null,
          ))
          continue
        }

        const validationErrors = new Map(
          response.data.errors.map((error) => [error.index, error.message]),
        )
        let successIndex = 0

        for (const [messageIndex, email] of chunk.entries()) {
          const validationError = validationErrors.get(messageIndex)
          if (validationError) {
            results.push({
              ok: false,
              email: email.to,
              code: 'validation_error',
              message: validationError,
              statusCode: 400,
              retryAfter: null,
              batchIndex,
              idempotencyKey,
            })
            continue
          }

          const providerId = response.data.data[successIndex]?.id
          successIndex += 1
          if (!providerId) {
            results.push({
              ok: false,
              email: email.to,
              code: 'unexpected_response',
              message: 'Resend no devolvio un identificador para el correo',
              statusCode: null,
              retryAfter: null,
              batchIndex,
              idempotencyKey,
            })
            continue
          }

          results.push({ ok: true, email: email.to, providerId, batchIndex, idempotencyKey })
        }
      } catch {
        results.push(...failedBatchResults(
          chunk,
          batchIndex,
          idempotencyKey,
          'network_error',
          'No fue posible conectar con Resend',
          null,
          null,
        ))
      }
    }

    return results
  }
}
