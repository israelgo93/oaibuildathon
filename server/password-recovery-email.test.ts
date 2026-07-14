import { describe, expect, it } from 'vitest'
import {
  createPasswordRecoveryEmailIdempotencyKey,
  createPasswordRecoveryRateLimitKey,
  sendPasswordRecoveryEmail,
  type PasswordRecoveryEmailDeliveryResult,
  type PasswordRecoveryEmailMessage,
  type PasswordRecoveryEmailTransport,
} from './password-recovery-email.js'

const teamSessionSecret = 'un-secreto-de-sesion-aislado-con-mas-de-32-caracteres'
const config = {
  apiKey: 're_test',
  from: 'OpenAI Build Week Manta <noreply@datatensei.ai>',
  replyTo: 'soporte@datatensei.ai',
}

class CapturingTransport implements PasswordRecoveryEmailTransport {
  messages: PasswordRecoveryEmailMessage[] = []

  constructor(private readonly result: PasswordRecoveryEmailDeliveryResult) {}

  async send(message: PasswordRecoveryEmailMessage): Promise<PasswordRecoveryEmailDeliveryResult> {
    this.messages.push(message)
    return this.result
  }
}

describe('correo de recuperacion de contrasena', () => {
  it('escapa el nombre y conserva el enlace exacto en texto y como atributo HTML seguro', async () => {
    const actionLink = 'https://iexmlbslfnckrdtkwuir.supabase.co/auth/v1/verify?token=secreto&redirect_to=https%3A%2F%2Foaibuildathon.vercel.app%2Frestablecer-contrasena'
    const transport = new CapturingTransport({ ok: true, providerId: 'email_123' })

    await sendPasswordRecoveryEmail({
      recipientName: '<Ana & "Orbita">',
      recipientEmail: 'ana@example.com',
      actionLink,
      idempotencyKey: createPasswordRecoveryEmailIdempotencyKey('request-1', teamSessionSecret),
    }, config, { transport })

    expect(transport.messages).toHaveLength(1)
    const message = transport.messages[0]
    expect(message?.html).toContain('&lt;Ana &amp; &quot;Orbita&quot;&gt;')
    expect(message?.html).not.toContain('<Ana & "Orbita">')
    expect(message?.html).toContain('token=secreto&amp;redirect_to=')
    expect(message?.text).toContain(actionLink)
    expect(message?.to).toBe('ana@example.com')
  })

  it('devuelve solo el resultado tipado del proveedor y usa una idempotency key opaca', async () => {
    const actionLink = 'https://example.supabase.co/auth/v1/verify?token=valor-sensible'
    const transport = new CapturingTransport({ ok: true, providerId: 'email_456' })
    const idempotencyKey = createPasswordRecoveryEmailIdempotencyKey('request-2', teamSessionSecret)

    const result = await sendPasswordRecoveryEmail({
      recipientName: 'Ana',
      recipientEmail: 'ana@example.com',
      actionLink,
      idempotencyKey,
    }, config, { transport })

    expect(result).toEqual({ ok: true, providerId: 'email_456' })
    expect(JSON.stringify(result)).not.toContain('valor-sensible')
    expect(idempotencyKey.value).toMatch(/^password-recovery\/v1\/[a-f0-9]{64}$/)
    expect(idempotencyKey.value).not.toContain('request-2')
    expect(transport.messages[0]?.idempotencyKey.value).toBe(idempotencyKey.value)
  })

  it('genera HMAC estable para el mismo correo normalizado sin revelar la identidad', () => {
    const first = createPasswordRecoveryRateLimitKey('email', ' Ana@Example.com ', teamSessionSecret)
    const second = createPasswordRecoveryRateLimitKey('email', 'ana@example.com', teamSessionSecret)
    const other = createPasswordRecoveryRateLimitKey('email', 'otra@example.com', teamSessionSecret)

    expect(first).toBe(second)
    expect(first).not.toBe(other)
    expect(first).toMatch(/^password-recovery-rate\/v1\/[a-f0-9]{64}$/)
    expect(first).not.toContain('ana@example.com')
  })

  it('separa los dominios HMAC de correo e IP aunque reciban el mismo valor', () => {
    const emailKey = createPasswordRecoveryRateLimitKey('email', 'identidad-compartida', teamSessionSecret)
    const ipKey = createPasswordRecoveryRateLimitKey('ip', 'identidad-compartida', teamSessionSecret)

    expect(emailKey).not.toBe(ipKey)
    expect(createPasswordRecoveryRateLimitKey('ip', ' IDENTIDAD-COMPARTIDA ', teamSessionSecret)).toBe(ipKey)
  })
})
