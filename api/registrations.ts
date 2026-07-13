import type { Json, Tables } from '../src/types/database.js'
import { requireRole } from '../server/auth.js'
import { getRequestIp, HttpError, parseJsonBody, requireMethod, setPrivateResponse, withErrorHandling } from '../server/http.js'
import { createRegistrationCode, createTeamToken, hashTeamToken, setTeamSessionCookie } from '../server/session.js'
import { getServerSupabase } from '../server/supabase.js'
import { verifyTurnstile } from '../server/turnstile.js'
import { registrationSchema } from '../server/validation.js'

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['POST'])
  const registration = registrationSchema.parse(parseJsonBody(request))
  if (request.headers.authorization?.startsWith('Bearer ')) {
    await requireRole(request, ['admin'])
  } else {
    await verifyTurnstile(registration.turnstileToken, getRequestIp(request))
  }

  const supabase = getServerSupabase()
  const token = createTeamToken()
  const registrationCode = createRegistrationCode()
  const members: Json = registration.members.map((member) => ({
    full_name: member.fullName,
    email: member.email,
    phone: member.phone,
    city: member.city,
    member_role: member.memberRole,
    is_primary_contact: member.isPrimaryContact,
  }))
  const { data: teamRaw, error } = await supabase.rpc('register_team', {
    p_event_id: registration.eventId,
    p_name: registration.teamName,
    p_organization: registration.organization,
    p_city: registration.city,
    p_contact_email: registration.contactEmail,
    p_contact_phone: registration.contactPhone,
    p_registration_code: registrationCode,
    p_management_token_hash: hashTeamToken(token),
    p_challenge_id: registration.challengeId,
    p_members: members,
  })

  if (error || !teamRaw) {
    const duplicate = error?.code === '23505'
    const expectedMessages = [
      'El registro no esta disponible',
      'El registro aun no ha iniciado',
      'El registro ha finalizado',
      'El equipo debe tener entre',
      'El reto seleccionado no esta disponible',
      'El reto seleccionado ya completo su capacidad',
    ]
    const expectedMessage = expectedMessages.find((message) => error?.message.startsWith(message))
    throw new HttpError(
      duplicate ? 409 : 400,
      duplicate
        ? 'El equipo o uno de sus correos ya esta registrado'
        : expectedMessage
          ? error?.message ?? expectedMessage
          : 'No fue posible registrar el equipo',
    )
  }

  const team = teamRaw as Tables<'teams'>
  setTeamSessionCookie(response, token)
  setPrivateResponse(response)
  response.status(201).json({
    teamId: team.id,
    teamName: team.name,
    registrationCode: team.registration_code,
  })
})
