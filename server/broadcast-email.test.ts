import { describe, expect, it } from 'vitest'
import {
  BROADCAST_IMPORT_BYTES_LIMIT,
  BROADCAST_RECIPIENT_LIMIT,
  BroadcastEmailError,
  BroadcastRecipientParseError,
  ResendBroadcastEmailTransport,
  broadcastBatchIdempotencyKey,
  buildBroadcastEmail,
  parseBroadcastRecipients,
  resolveBroadcastCta,
  type BroadcastBatchRequestOptions,
  type BroadcastBatchSend,
  type BroadcastEmailConfiguration,
  type BroadcastDeliveryMessage,
} from './broadcast-email.js'
import type { CreateBatchOptions } from 'resend'

const configuration: BroadcastEmailConfiguration = {
  from: 'OpenAI Build Week Manta <noreply@datatensei.ai>',
  replyTo: 'soporte@datatensei.ai',
  appBaseUrl: 'https://oaibuildathon.vercel.app/',
}

function expectBroadcastError(action: () => unknown, code: BroadcastEmailError['code']): void {
  try {
    action()
    throw new Error('La operacion debio fallar')
  } catch (error) {
    expect(error).toBeInstanceOf(BroadcastEmailError)
    if (!(error instanceof BroadcastEmailError)) return
    expect(error.code).toBe(code)
  }
}

function expectRecipientParseError(
  action: () => unknown,
  code: BroadcastRecipientParseError['code'],
): void {
  try {
    action()
    throw new Error('La operacion debio fallar')
  } catch (error) {
    expect(error).toBeInstanceOf(BroadcastRecipientParseError)
    if (!(error instanceof BroadcastRecipientParseError)) return
    expect(error.code).toBe(code)
  }
}

function messageFor(index: number, campaignId = 'campaign_123'): BroadcastDeliveryMessage {
  const batchNumber = Math.floor(index / 100)
  return {
    ...buildBroadcastEmail({
      to: `persona${index}@example.com`,
      subject: 'Informacion del evento',
      message: 'Completa el registro de tu equipo.',
      cta: 'registration',
    }, configuration),
    batchNumber,
    idempotencyKey: broadcastBatchIdempotencyKey(campaignId, batchNumber),
  }
}

describe('parseBroadcastRecipients', () => {
  it('tolera BOM, encabezado, comas, punto y coma, saltos, comillas y deduplica', () => {
    const result = parseBroadcastRecipients(
      '\uFEFFemail\r\n ANA@Example.COM;bob@example.com,bob@EXAMPLE.com\nno-es-correo\n"carla@example.com"',
    )

    expect(result).toEqual({
      emails: ['ana@example.com', 'bob@example.com', 'carla@example.com'],
      invalid: ['no-es-correo'],
      duplicates: ['bob@example.com'],
    })
  })

  it('omite encabezados email sin convertirlos en invalidos', () => {
    expect(parseBroadcastRecipients('EMAIL\nuno@example.com')).toEqual({
      emails: ['uno@example.com'],
      invalid: [],
      duplicates: [],
    })
  })

  it('rechaza archivos mayores de 256 KiB', () => {
    expectRecipientParseError(
      () => parseBroadcastRecipients('a'.repeat(BROADCAST_IMPORT_BYTES_LIMIT + 1)),
      'input_too_large',
    )
  })

  it('rechaza mas de 500 destinatarios unicos', () => {
    const source = Array.from(
      { length: BROADCAST_RECIPIENT_LIMIT + 1 },
      (_, index) => `persona${index}@example.com`,
    ).join('\n')

    expectRecipientParseError(() => parseBroadcastRecipients(source), 'too_many_recipients')
  })

  it('extrae la columna correo de un CSV real e ignora las demas columnas', () => {
    const result = parseBroadcastRecipients(
      'Nombre,Correo,Ciudad\r\n"Perez, Ana",ANA@example.com,Manta\r\nBob,bob@example.com,Portoviejo',
    )

    expect(result).toEqual({
      emails: ['ana@example.com', 'bob@example.com'],
      invalid: [],
      duplicates: [],
    })
  })

  it('acepta encabezado correo electronico y separador punto y coma', () => {
    const result = parseBroadcastRecipients(
      'Nombre;Correo electrónico\nAna;ana@example.com\nBob;bob@example.com',
    )

    expect(result.emails).toEqual(['ana@example.com', 'bob@example.com'])
    expect(result.invalid).toEqual([])
  })

  it('rechaza correos mayores de 254 caracteres en cliente y servidor', () => {
    const oversized = `${'a'.repeat(245)}@example.com`
    const result = parseBroadcastRecipients(oversized)
    expect(result.emails).toEqual([])
    expect(result.invalid).toEqual([oversized])
  })
})

describe('CTA y plantilla de difusion', () => {
  it('resuelve solamente rutas internas conocidas', () => {
    expect(resolveBroadcastCta('none', configuration.appBaseUrl)).toBeNull()
    expect(resolveBroadcastCta('landing', configuration.appBaseUrl)?.url).toBe('https://oaibuildathon.vercel.app/')
    expect(resolveBroadcastCta('registration', configuration.appBaseUrl)?.url).toBe('https://oaibuildathon.vercel.app/registro')
    expect(resolveBroadcastCta('team_portal', configuration.appBaseUrl)?.url).toBe('https://oaibuildathon.vercel.app/equipo')
    expect(resolveBroadcastCta('staff_login', configuration.appBaseUrl)?.url).toBe('https://oaibuildathon.vercel.app/login')
  })

  it('rechaza una APP_BASE_URL no segura', () => {
    expectBroadcastError(() => resolveBroadcastCta('registration', 'http://example.com'), 'invalid_app_base_url')
  })

  it('usa el remitente de configuracion, escapa HTML y conserva texto plano', () => {
    const email = buildBroadcastEmail({
      to: 'PARTICIPANTE@example.com',
      subject: 'Aviso <importante>',
      message: 'Hola <script>alert("x")</script>\nContinua tu registro.',
      cta: 'registration',
    }, configuration)

    expect(email.from).toBe(configuration.from)
    expect(email.to).toBe('participante@example.com')
    expect(email.subject).toBe('Aviso <importante>')
    expect(email.html).toContain('Aviso &lt;importante&gt;')
    expect(email.html).toContain('Hola &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;<br />Continua tu registro.')
    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('https://oaibuildathon.vercel.app/registro')
    expect(email.text).toBe(
      'Hola <script>alert("x")</script>\nContinua tu registro.\n\nRegistrar equipo: https://oaibuildathon.vercel.app/registro',
    )
  })

  it('no agrega enlaces cuando el CTA es none', () => {
    const email = buildBroadcastEmail({
      to: 'participante@example.com',
      subject: 'Aviso',
      message: 'Mensaje informativo.',
      cta: 'none',
    }, configuration)

    expect(email.html).not.toContain('<a href=')
    expect(email.text).toBe('Mensaje informativo.')
  })
})

describe('ResendBroadcastEmailTransport', () => {
  it('envia lotes de maximo 100 con claves idempotentes estables', async () => {
    const calls: { payload: CreateBatchOptions; options: BroadcastBatchRequestOptions }[] = []
    const sender: BroadcastBatchSend = async (payload, options) => {
      calls.push({ payload, options })
      return {
        data: {
          data: payload.map((_, index) => ({ id: `provider-${calls.length}-${index}` })),
          errors: [],
        },
        error: null,
        headers: {},
      }
    }
    const transport = new ResendBroadcastEmailTransport('re_test', sender)
    const messages = Array.from({ length: 201 }, (_, index) => messageFor(index))

    const first = await transport.send(messages)
    const second = await transport.send(messages)

    expect(calls.map((call) => call.payload.length)).toEqual([100, 100, 1, 100, 100, 1])
    expect(calls.slice(0, 3).map((call) => call.options.idempotencyKey)).toEqual([
      'broadcast/v2/campaign_123/0',
      'broadcast/v2/campaign_123/1',
      'broadcast/v2/campaign_123/2',
    ])
    expect(calls.slice(3).map((call) => call.options.idempotencyKey)).toEqual(
      calls.slice(0, 3).map((call) => call.options.idempotencyKey),
    )
    expect(calls.every((call) => call.options.batchValidation === 'permissive')).toBe(true)
    expect(calls[0]?.payload[0]?.to).toEqual(['persona0@example.com'])
    expect(first).toHaveLength(201)
    expect(second).toHaveLength(201)
    expect(first.every((result) => result.ok)).toBe(true)
  })

  it('mapea los errores permisivos sin perder la correspondencia de IDs', async () => {
    const sender: BroadcastBatchSend = async () => ({
      data: {
        data: [{ id: 'provider-0' }, { id: 'provider-2' }],
        errors: [{ index: 1, message: 'Correo rechazado por validacion' }],
      },
      error: null,
      headers: {},
    })
    const transport = new ResendBroadcastEmailTransport('re_test', sender)

    const results = await transport.send([
      messageFor(0, 'campaign_456'),
      messageFor(1, 'campaign_456'),
      messageFor(2, 'campaign_456'),
    ])

    expect(results).toEqual([
      {
        ok: true,
        email: 'persona0@example.com',
        providerId: 'provider-0',
        batchIndex: 0,
        idempotencyKey: 'broadcast/v2/campaign_456/0',
      },
      {
        ok: false,
        email: 'persona1@example.com',
        code: 'validation_error',
        message: 'Correo rechazado por validacion',
        statusCode: 400,
        retryAfter: null,
        batchIndex: 0,
        idempotencyKey: 'broadcast/v2/campaign_456/0',
      },
      {
        ok: true,
        email: 'persona2@example.com',
        providerId: 'provider-2',
        batchIndex: 0,
        idempotencyKey: 'broadcast/v2/campaign_456/0',
      },
    ])
  })

  it('propaga errores del proveedor y Retry-After a cada destinatario', async () => {
    const sender: BroadcastBatchSend = async () => ({
      data: null,
      error: {
        name: 'rate_limit_exceeded',
        message: 'Demasiadas solicitudes',
        statusCode: 429,
      },
      headers: { 'retry-after': '2' },
    })
    const transport = new ResendBroadcastEmailTransport('re_test', sender)

    const results = await transport.send([messageFor(0, 'campaign_789'), messageFor(1, 'campaign_789')])

    expect(results).toHaveLength(2)
    expect(results.every((result) => !result.ok && result.code === 'rate_limit_exceeded')).toBe(true)
    expect(results.every((result) => !result.ok && result.retryAfter === '2')).toBe(true)
  })

  it('convierte excepciones de red en fallos tipados', async () => {
    const sender: BroadcastBatchSend = async () => {
      throw new Error('sin red')
    }
    const transport = new ResendBroadcastEmailTransport('re_test', sender)

    const results = await transport.send([messageFor(0, 'campaign_network')])

    expect(results).toEqual([{
      ok: false,
      email: 'persona0@example.com',
      code: 'network_error',
      message: 'No fue posible conectar con Resend',
      statusCode: null,
      retryAfter: null,
      batchIndex: 0,
      idempotencyKey: 'broadcast/v2/campaign_network/0',
    }])
  })

  it('valida la referencia usada en la idempotencia', () => {
    expect(broadcastBatchIdempotencyKey('campaign_1', 0)).toBe('broadcast/v2/campaign_1/0')
    expectBroadcastError(() => broadcastBatchIdempotencyKey('../campaign', 0), 'invalid_campaign_id')
  })
})
