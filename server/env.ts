interface ServerEnvironment {
  supabaseUrl: string
  supabaseSecretKey: string
  teamSessionSecret: string
  turnstileSecretKey: string | null
}

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
