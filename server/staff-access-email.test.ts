import { describe, expect, it } from 'vitest'
import type { UserRole } from '../src/types/database.js'
import {
  buildStaffAccessEmail,
  sendStaffAccessEmail,
  type StaffAccessEmailConfig,
  type StaffAccessEmailDeliveryResult,
  type StaffAccessEmailInput,
  type StaffAccessEmailMessage,
  type StaffAccessEmailTransport,
} from './staff-access-email.js'

const config: StaffAccessEmailConfig = {
  apiKey: 're_test',
  from: 'OpenAI Build Week Manta <noreply@datatensei.ai>',
  replyTo: 'soporte@datatensei.ai',
  appBaseUrl: 'https://oaibuildathon.vercel.app/base?ignorar=1#fragmento',
}

const baseInput: StaffAccessEmailInput = {
  profileId: '30000000-0000-4000-8000-000000000001',
  credentialVersion: 2,
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 'judge',
  temporaryPassword: 'Temporal9!Segura',
}

const roleExpectations: Record<UserRole, string[]> = {
  admin: ['configuracion, fechas y etapas', 'retos, equipos, staff, asignaciones', 'publica un proyecto'],
  judge: ['equipos que te fueron asignados', 'envio final del proyecto', 'calificacion completa'],
  mentor: ['equipos que te fueron asignados', 'integrantes, reto, contexto tematico', 'sin modificar entregas ni calificaciones'],
}

class FakeTransport implements StaffAccessEmailTransport {
  readonly messages: StaffAccessEmailMessage[] = []

  constructor(private readonly result: StaffAccessEmailDeliveryResult) {}

  async send(message: StaffAccessEmailMessage): Promise<StaffAccessEmailDeliveryResult> {
    this.messages.push(message)
    return this.result
  }
}

describe('correo de acceso para staff', () => {
  it.each<UserRole>(['admin', 'judge', 'mentor'])('incluye instrucciones completas para el rol %s', (role) => {
    const message = buildStaffAccessEmail({ ...baseInput, role }, config)

    expect(message.from).toBe(config.from)
    expect(message.replyTo).toBe(config.replyTo)
    expect(message.to).toBe(baseInput.email)
    expect(message.html).toContain(baseInput.email)
    expect(message.html).toContain(baseInput.temporaryPassword)
    expect(message.text).toContain(baseInput.email)
    expect(message.text).toContain(baseInput.temporaryPassword)
    expect(message.html).toContain('https://oaibuildathon.vercel.app/login')
    expect(message.text).toContain('https://oaibuildathon.vercel.app/login')
    expect(message.html).not.toContain('/login?')
    expect(message.html).not.toContain('/login#')
    expect(message.idempotencyKey).toBe(`staff-access/v1/${baseInput.profileId}/${baseInput.credentialVersion}`)

    for (const expectation of roleExpectations[role]) {
      expect(message.text).toContain(expectation)
    }
  })

  it('escapa todos los valores dinamicos en HTML', () => {
    const message = buildStaffAccessEmail({
      ...baseInput,
      fullName: '<script>alert("nombre")</script>',
      email: 'ada+<staff>@example.com',
      temporaryPassword: '<Clave&"9!>',
    }, {
      ...config,
      replyTo: 'soporte+<staff>@example.com',
    })

    expect(message.html).not.toContain('<script>')
    expect(message.html).not.toContain('<Clave&"9!>')
    expect(message.html).toContain('&lt;script&gt;')
    expect(message.html).toContain('&lt;Clave&amp;&quot;9!&gt;')
    expect(message.html).toContain('soporte+&lt;staff&gt;@example.com')
  })

  it('envia un solo mensaje tipado y no devuelve la contrasena', async () => {
    const transport = new FakeTransport({ ok: true, providerId: 'email_123' })
    const result = await sendStaffAccessEmail(baseInput, config, transport)

    expect(transport.messages).toHaveLength(1)
    expect(result).toEqual({ ok: true, providerId: 'email_123' })
    expect(JSON.stringify(result)).not.toContain(baseInput.temporaryPassword)
  })

  it('devuelve un fallo saneado sin incluir la contrasena', async () => {
    const transport = new FakeTransport({
      ok: false,
      code: 'rate_limit_exceeded',
      statusCode: 429,
      retryAfter: '60',
    })
    const result = await sendStaffAccessEmail(baseInput, config, transport)

    expect(result).toEqual({
      ok: false,
      code: 'rate_limit_exceeded',
      statusCode: 429,
      retryAfter: '60',
    })
    expect(JSON.stringify(result)).not.toContain(baseInput.temporaryPassword)
  })

  it('rechaza una URL base que no use HTTPS', () => {
    expect(() => buildStaffAccessEmail(baseInput, {
      ...config,
      appBaseUrl: 'http://oaibuildathon.vercel.app',
    })).toThrow('APP_BASE_URL debe usar HTTPS')
  })
})
