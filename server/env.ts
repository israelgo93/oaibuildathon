interface ServerEnvironment {
  supabaseUrl: string
  supabaseSecretKey: string
  teamSessionSecret: string
  turnstileSecretKey: string | null
}

export const TRANSACTIONAL_EMAIL_FROM = 'OpenAI Build Week Manta <noreply@datatensei.ai>'

export interface EmailEnvironment {
  apiKey: string
  from: string
  replyTo: string
  appBaseUrl: string
}

export type RegistrationEmailEnvironment = EmailEnvironment

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`)
  }

  return value
}

export function getServerEnvironment(): ServerEnvironment {
  const teamSessionSecret = requiredEnvironmentValue('TEAM_SESSION_SECRET')

  if (teamSessionSecret.length < 32) {
    throw new Error('TEAM_SESSION_SECRET debe tener al menos 32 caracteres')
  }

  return {
    supabaseUrl: requiredEnvironmentValue('SUPABASE_URL'),
    supabaseSecretKey: requiredEnvironmentValue('SUPABASE_SECRET_KEY'),
    teamSessionSecret,
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY?.trim() || null,
  }
}

export function getEmailEnvironment(): EmailEnvironment | null {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM?.trim()
  const replyTo = process.env.RESEND_REPLY_TO?.trim()
  const appBaseUrl = process.env.APP_BASE_URL?.trim()

  if (!apiKey || !from || !replyTo || !appBaseUrl) return null

  if (from !== TRANSACTIONAL_EMAIL_FROM) {
    throw new Error(`RESEND_FROM debe ser ${TRANSACTIONAL_EMAIL_FROM}`)
  }

  const url = new URL(appBaseUrl)
  if (url.protocol !== 'https:') throw new Error('APP_BASE_URL debe usar HTTPS')

  return {
    apiKey,
    from,
    replyTo,
    appBaseUrl: url.toString().replace(/\/$/, ''),
  }
}

export function getRegistrationEmailEnvironment(): RegistrationEmailEnvironment | null {
  return getEmailEnvironment()
}
