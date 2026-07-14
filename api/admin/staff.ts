import type { CreateStaffInput, CreateStaffResult } from '../../src/types/api.js'
import type { Tables } from '../../src/types/database.js'
import { writeAuditLog } from '../../server/audit.js'
import { requireRole } from '../../server/auth.js'
import { HttpError, parseJsonBody, requireMethod, setPrivateResponse, withErrorHandling } from '../../server/http.js'
import { getServerSupabase } from '../../server/supabase.js'
import { rotateAndNotifyStaffAccess } from '../../server/staff-access.js'
import { generateTemporaryPassword } from '../../server/staff-credentials.js'
import { staffSchema } from '../../server/validation.js'

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['POST'])
  const { profile } = await requireRole(request, ['admin'])
  const input: CreateStaffInput = staffSchema.parse(parseJsonBody(request))
  const supabase = getServerSupabase()
  const temporaryPassword = input.password ?? generateTemporaryPassword()
  const { data: userData, error } = await supabase.auth.admin.createUser({
    email: input.email.toLowerCase(),
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
    app_metadata: { role: input.role },
  })

  if (error || !userData.user) {
    throw new HttpError(error?.status === 422 ? 409 : 400, error?.message ?? 'No fue posible crear el usuario')
  }

  const { data: createdProfileRaw, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .single()

  if (profileError || !createdProfileRaw) {
    throw new HttpError(500, 'El usuario fue creado, pero no fue posible preparar su acceso')
  }

  const createdProfile = createdProfileRaw as Tables<'profiles'>
  await writeAuditLog(profile.id, 'staff.created', 'profile', userData.user.id, {
    role: input.role,
    email: input.email.toLowerCase(),
  })
  const delivery = await rotateAndNotifyStaffAccess(createdProfile, {
    actorId: profile.id,
    allowAdmin: true,
    credentialAlreadyActive: true,
    temporaryPassword,
  })

  setPrivateResponse(response)
  const result: CreateStaffResult = {
    id: userData.user.id,
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    role: input.role,
    emailSent: delivery.ok,
  }
  response.status(201).json(result)
})
