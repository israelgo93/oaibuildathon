import type { AuthenticatedProfile } from '../src/types/api.js'
import type { Tables, UserRole } from '../src/types/database.js'
import { HttpError } from './http.js'
import { getServerSupabase } from './supabase.js'
import type { ApiRequest } from './types.js'

export interface AuthorizedUser {
  profile: Tables<'profiles'>
  publicProfile: AuthenticatedProfile
}

function getBearerToken(request: ApiRequest): string {
  const authorization = request.headers.authorization
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : ''

  if (!token) {
    throw new HttpError(401, 'Debes iniciar sesion')
  }

  return token
}

export async function requireAuthenticatedProfile(request: ApiRequest): Promise<AuthorizedUser> {
  const supabase = getServerSupabase()
  const token = getBearerToken(request)
  const { data: userData, error: userError } = await supabase.auth.getUser(token)

  if (userError || !userData.user) {
    throw new HttpError(401, 'La sesion no es valida o ya expiro')
  }

  const { data: profileRaw, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .single()

  if (profileError || !profileRaw) {
    throw new HttpError(403, 'El usuario no tiene un perfil autorizado')
  }

  const profile = profileRaw as Tables<'profiles'>
  if (!profile.active) {
    throw new HttpError(403, 'El perfil no esta activo')
  }

  return {
    profile,
    publicProfile: {
      id: profile.id,
      role: profile.role,
      fullName: profile.full_name,
      email: profile.email,
      mustChangePassword: profile.must_change_password,
      temporaryPasswordExpiresAt: profile.temporary_password_expires_at,
    },
  }
}

export async function requireRole(request: ApiRequest, allowedRoles: UserRole[]): Promise<AuthorizedUser> {
  const authorizedUser = await requireAuthenticatedProfile(request)

  if (authorizedUser.profile.must_change_password) {
    throw new HttpError(428, 'Debes cambiar tu contrasena temporal antes de continuar')
  }

  if (!allowedRoles.includes(authorizedUser.profile.role)) {
    throw new HttpError(403, 'No tienes permisos para realizar esta accion')
  }

  return authorizedUser
}
