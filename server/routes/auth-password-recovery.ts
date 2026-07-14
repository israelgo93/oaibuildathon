import { waitUntil } from '@vercel/functions'
import type { PasswordRecoveryInput } from '../../src/types/api.js'
import type { Tables, TablesUpdate } from '../../src/types/database.js'
import { getEmailEnvironment, getServerEnvironment } from '../env.js'
import { getRequestIp, parseJsonBody, requireMethod, setPrivateResponse, withErrorHandling } from '../http.js'
import {
  createPasswordRecoveryEmailIdempotencyKey,
  createPasswordRecoveryRateLimitKey,
  sendPasswordRecoveryEmail,
} from '../password-recovery-email.js'
import { getServerSupabase } from '../supabase.js'
import { passwordRecoverySchema } from '../validation.js'

const RATE_LIMIT_WINDOW_MINUTES = 15
const EMAIL_RATE_LIMIT = 3
const IP_RATE_LIMIT = 10
const GENERIC_MESSAGE = 'Si existe una cuenta activa para ese correo, recibiras un enlace para restablecer tu contrasena.'

type PasswordResetOutcome = Tables<'password_reset_requests'>['outcome']

function digestFromRateLimitKey(key: string): string {
  return key.slice(-64)
}

async function updateRequestOutcome(requestId: string, outcome: PasswordResetOutcome): Promise<void> {
  const values: TablesUpdate<'password_reset_requests'> = { outcome }
  const { error } = await getServerSupabase().from('password_reset_requests').update(values).eq('id', requestId)
  if (error) throw new Error('No fue posible actualizar el resultado de recuperacion')
}

async function processPasswordRecovery(input: PasswordRecoveryInput, requestIp: string): Promise<void> {
  const serverEnvironment = getServerEnvironment()
  const email = input.email.toLowerCase()
  const emailHash = digestFromRateLimitKey(
    createPasswordRecoveryRateLimitKey('email', email, serverEnvironment.teamSessionSecret),
  )
  const ipHash = digestFromRateLimitKey(
    createPasswordRecoveryRateLimitKey('ip', requestIp, serverEnvironment.teamSessionSecret),
  )
  const supabase = getServerSupabase()
  const { data: requestIdRaw, error: claimError } = await supabase.rpc('claim_password_reset_request', {
    p_email_hash: emailHash,
    p_ip_hash: ipHash,
    p_window_minutes: RATE_LIMIT_WINDOW_MINUTES,
    p_email_limit: EMAIL_RATE_LIMIT,
    p_ip_limit: IP_RATE_LIMIT,
  })
  const requestId: string | null = requestIdRaw

  if (claimError || !requestId) return

  const { data: profileRaw, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .eq('active', true)
    .maybeSingle()

  if (profileError) {
    await updateRequestOutcome(requestId, 'failed')
    return
  }
  if (!profileRaw) return

  const profile = profileRaw as Tables<'profiles'>
  const emailEnvironment = getEmailEnvironment()
  if (!emailEnvironment) {
    await updateRequestOutcome(requestId, 'failed')
    return
  }

  const redirectTo = new URL('/', emailEnvironment.appBaseUrl).toString()
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  if (linkError || !linkData.properties.action_link) {
    await updateRequestOutcome(requestId, 'failed')
    return
  }

  const delivery = await sendPasswordRecoveryEmail({
    recipientName: profile.full_name,
    recipientEmail: profile.email,
    actionLink: linkData.properties.action_link,
    idempotencyKey: createPasswordRecoveryEmailIdempotencyKey(requestId, serverEnvironment.teamSessionSecret),
  }, emailEnvironment)
  await updateRequestOutcome(requestId, delivery.ok ? 'sent' : 'failed')
}

async function safelyProcessPasswordRecovery(input: PasswordRecoveryInput, requestIp: string): Promise<void> {
  try {
    await processPasswordRecovery(input, requestIp)
  } catch {
    // La recuperacion falla cerrada y nunca modifica Auth si no puede validar cuota, perfil o proveedor.
  }
}

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['POST'])
  const input: PasswordRecoveryInput = passwordRecoverySchema.parse(parseJsonBody(request))
  const recoveryTask = safelyProcessPasswordRecovery(input, getRequestIp(request) ?? 'unknown')

  try {
    waitUntil(recoveryTask)
  } catch {
    void recoveryTask
  }

  setPrivateResponse(response)
  response.status(202).json({ message: GENERIC_MESSAGE })
})
