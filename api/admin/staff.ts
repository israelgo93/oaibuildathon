import type { CreateStaffInput } from '../../src/types/api.js'
import { writeAuditLog } from '../../server/audit.js'
import { requireRole } from '../../server/auth.js'
import { HttpError, parseJsonBody, requireMethod, setPrivateResponse, withErrorHandling } from '../../server/http.js'
import { getServerSupabase } from '../../server/supabase.js'
import { staffSchema } from '../../server/validation.js'

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['POST'])
  const { profile } = await requireRole(request, ['admin'])
  const input: CreateStaffInput = staffSchema.parse(parseJsonBody(request))
  const supabase = getServerSupabase()
  const { data: userData, error } = await supabase.auth.admin.createUser({
    email: input.email.toLowerCase(),
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
    app_metadata: { role: input.role },
  })

  if (error || !userData.user) {
    throw new HttpError(error?.status === 422 ? 409 : 400, error?.message ?? 'No fue posible crear el usuario')
  }

  await writeAuditLog(profile.id, 'staff.created', 'profile', userData.user.id, {
    role: input.role,
    email: input.email.toLowerCase(),
  })
  setPrivateResponse(response)
  response.status(201).json({
    id: userData.user.id,
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    role: input.role,
  })
})
