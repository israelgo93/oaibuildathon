import type { StaffAccessAction, StaffAccessResult } from '../../src/types/api.js'
import type { Tables } from '../../src/types/database.js'
import { writeAuditLog } from '../audit.js'
import { requireRole } from '../auth.js'
import { HttpError, parseJsonBody, requireMethod, setPrivateResponse, withErrorHandling } from '../http.js'
import { rotateAndNotifyStaffAccess, type StaffAccessOutcome } from '../staff-access.js'
import { getServerSupabase } from '../supabase.js'
import { staffAccessSchema } from '../validation.js'

const NOTIFICATION_CONCURRENCY = 3

async function notifyWithLimitedConcurrency(
  profiles: Tables<'profiles'>[],
  actorId: string,
): Promise<StaffAccessOutcome[]> {
  const results: StaffAccessOutcome[] = []
  let nextIndex = 0

  const worker = async (): Promise<void> => {
    while (nextIndex < profiles.length) {
      const profile = profiles[nextIndex]
      nextIndex += 1
      if (!profile) continue

      try {
        results.push(await rotateAndNotifyStaffAccess(profile, { actorId }))
      } catch {
        results.push({ profileId: profile.id, ok: false, errorCode: 'unexpected_error' })
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(NOTIFICATION_CONCURRENCY, profiles.length) }, () => worker()),
  )
  return results
}

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['POST'])
  const { profile: actor } = await requireRole(request, ['admin'])
  const input: StaffAccessAction = staffAccessSchema.parse(parseJsonBody(request))
  const supabase = getServerSupabase()
  let targets: Tables<'profiles'>[] = []

  switch (input.action) {
    case 'notify_one': {
      const { data: targetRaw, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', input.profileId)
        .single()
      if (error || !targetRaw) throw new HttpError(404, 'No se encontro el perfil')
      const target = targetRaw as Tables<'profiles'>
      if (!target.active || (target.role !== 'judge' && target.role !== 'mentor')) {
        throw new HttpError(400, 'Solo se puede notificar a un mentor o jurado activo')
      }
      targets = [target]
      break
    }
    case 'notify_unnotified': {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['judge', 'mentor'])
        .eq('active', true)
        .neq('access_email_status', 'sent')
        .order('full_name')
      if (error) throw new HttpError(500, 'No fue posible cargar los perfiles pendientes')
      const profiles: Tables<'profiles'>[] = data ?? []
      targets = profiles
      break
    }
    case 'notify_all': {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['judge', 'mentor'])
        .eq('active', true)
        .order('full_name')
      if (error) throw new HttpError(500, 'No fue posible cargar los perfiles')
      const profiles: Tables<'profiles'>[] = data ?? []
      targets = profiles
      break
    }
    default: {
      const exhaustiveCheck: never = input
      return exhaustiveCheck
    }
  }

  const outcomes = await notifyWithLimitedConcurrency(targets, actor.id)
  const sent = outcomes.filter((outcome) => outcome.ok).length
  const result: StaffAccessResult = {
    total: targets.length,
    sent,
    failed: targets.length - sent,
  }

  await writeAuditLog(actor.id, 'staff.access_batch_completed', 'profile', null, {
    action: input.action,
    total: result.total,
    sent: result.sent,
    failed: result.failed,
  })
  setPrivateResponse(response)
  response.status(200).json(result)
})
