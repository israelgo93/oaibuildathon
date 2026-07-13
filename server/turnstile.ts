import { z } from 'zod'
import { getServerEnvironment } from './env.js'
import { HttpError } from './http.js'

const turnstileResponseSchema = z.object({
  success: z.boolean(),
})

export async function verifyTurnstile(token: string | undefined, remoteIp: string | null): Promise<void> {
  const secretKey = getServerEnvironment().turnstileSecretKey
  if (!secretKey) return

  if (!token) {
    throw new HttpError(400, 'Completa la verificacion de seguridad')
  }

  const formData = new URLSearchParams({ secret: secretKey, response: token })
  if (remoteIp) formData.set('remoteip', remoteIp)

  const verificationResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  })
  const verificationBody: unknown = await verificationResponse.json()
  const verification = turnstileResponseSchema.safeParse(verificationBody)

  if (!verification.success || !verification.data.success) {
    throw new HttpError(400, 'No se pudo validar la verificacion de seguridad')
  }
}
