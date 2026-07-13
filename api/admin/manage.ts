import type { AdminAction } from '../../src/types/api.js'
import type { Json, Tables, TablesInsert, TablesUpdate } from '../../src/types/database.js'
import { writeAuditLog } from '../../server/audit.js'
import { requireRole } from '../../server/auth.js'
import { HttpError, parseJsonBody, requireMethod, setPrivateResponse, withErrorHandling } from '../../server/http.js'
import { getServerSupabase } from '../../server/supabase.js'
import { adminActionSchema } from '../../server/validation.js'

async function requireStaffRole(profileId: string, role: 'judge' | 'mentor'): Promise<void> {
  const { data: profileRaw, error } = await getServerSupabase()
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (error || !profileRaw) throw new HttpError(404, 'El perfil no existe')
  const profile = profileRaw as Tables<'profiles'>
  if (!profile.active || profile.role !== role) throw new HttpError(400, `El perfil no es un ${role} activo`)
}

async function requireTeamEvent(teamId: string, eventId: string): Promise<void> {
  const { data: teamRaw, error } = await getServerSupabase()
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single()

  if (error || !teamRaw) throw new HttpError(404, 'El equipo no existe')
  const team = teamRaw as Tables<'teams'>
  if (team.event_id !== eventId) throw new HttpError(400, 'El equipo no pertenece a este evento')
}

async function publishSubmission(submissionId: string): Promise<void> {
  const supabase = getServerSupabase()
  const { data: submissionRaw, error } = await supabase
    .from('project_submissions')
    .select('*')
    .eq('id', submissionId)
    .single()

  if (error || !submissionRaw) throw new HttpError(404, 'La entrega no existe')
  const submission = submissionRaw as Tables<'project_submissions'>
  if (!submission.project_name || !submission.short_description || (!submission.demo_url && !submission.repository_url)) {
    throw new HttpError(409, 'La entrega necesita nombre, descripcion y una URL de demo o repositorio antes de publicarse')
  }

  const values: TablesUpdate<'project_submissions'> = {
    status: 'published',
    submitted_at: submission.submitted_at ?? new Date().toISOString(),
    published_at: new Date().toISOString(),
  }
  const { error: updateError } = await supabase.from('project_submissions').update(values).eq('id', submissionId)
  if (updateError) throw new HttpError(500, 'No fue posible publicar la entrega')
}

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['POST'])
  const { profile } = await requireRole(request, ['admin'])
  const input: AdminAction = adminActionSchema.parse(parseJsonBody(request))
  const supabase = getServerSupabase()
  let auditEntityType = ''
  let auditEntityId: string | null = null
  let auditMetadata: Json = {}

  switch (input.action) {
    case 'update_event': {
      const values: TablesUpdate<'events'> = input.values
      if (values.min_team_size && values.max_team_size && values.min_team_size > values.max_team_size) {
        throw new HttpError(400, 'El minimo del equipo no puede superar el maximo')
      }
      const { error } = await supabase.from('events').update(values).eq('id', input.eventId)
      if (error) throw new HttpError(400, error.message)
      auditEntityType = 'event'
      auditEntityId = input.eventId
      auditMetadata = { fields: Object.keys(input.values) }
      break
    }
    case 'create_challenge': {
      const values: TablesInsert<'challenges'> = {
        event_id: input.eventId,
        title: input.title,
        description: input.description,
        requirements: input.requirements,
        max_teams: input.maxTeams,
      }
      const { data: challengeRaw, error } = await supabase.from('challenges').insert(values).select('*').single()
      if (error || !challengeRaw) throw new HttpError(400, error?.message ?? 'No fue posible crear el reto')
      const challenge = challengeRaw as Tables<'challenges'>
      auditEntityType = 'challenge'
      auditEntityId = challenge.id
      break
    }
    case 'update_challenge': {
      const values: TablesUpdate<'challenges'> = {
        title: input.title,
        description: input.description,
        requirements: input.requirements,
        active: input.active,
        max_teams: input.maxTeams,
      }
      const { error } = await supabase.from('challenges').update(values).eq('id', input.challengeId)
      if (error) throw new HttpError(400, error.message)
      auditEntityType = 'challenge'
      auditEntityId = input.challengeId
      break
    }
    case 'create_criterion': {
      const values: TablesInsert<'evaluation_criteria'> = {
        event_id: input.eventId,
        name: input.name,
        description: input.description,
        max_score: input.maxScore,
        weight: input.weight,
      }
      const { data: criterionRaw, error } = await supabase.from('evaluation_criteria').insert(values).select('*').single()
      if (error || !criterionRaw) throw new HttpError(400, error?.message ?? 'No fue posible crear el criterio')
      const criterion = criterionRaw as Tables<'evaluation_criteria'>
      auditEntityType = 'criterion'
      auditEntityId = criterion.id
      break
    }
    case 'update_criterion': {
      const values: TablesUpdate<'evaluation_criteria'> = {
        name: input.name,
        description: input.description,
        max_score: input.maxScore,
        weight: input.weight,
        active: input.active,
      }
      const { error } = await supabase.from('evaluation_criteria').update(values).eq('id', input.criterionId)
      if (error) throw new HttpError(400, error.message)
      auditEntityType = 'criterion'
      auditEntityId = input.criterionId
      break
    }
    case 'set_team_status': {
      const { error } = await supabase.from('teams').update({ status: input.status } satisfies TablesUpdate<'teams'>).eq('id', input.teamId)
      if (error) throw new HttpError(400, error.message)
      auditEntityType = 'team'
      auditEntityId = input.teamId
      auditMetadata = { status: input.status }
      break
    }
    case 'set_submission_status': {
      if (input.status === 'published') {
        await publishSubmission(input.submissionId)
      } else {
        const values: TablesUpdate<'project_submissions'> = {
          status: input.status,
          published_at: null,
          submitted_at: input.status === 'draft' ? null : new Date().toISOString(),
        }
        const { error } = await supabase.from('project_submissions').update(values).eq('id', input.submissionId)
        if (error) throw new HttpError(400, error.message)
      }
      auditEntityType = 'submission'
      auditEntityId = input.submissionId
      auditMetadata = { status: input.status }
      break
    }
    case 'add_member': {
      await requireTeamEvent(input.teamId, input.eventId)
      const [membersResult, eventResult] = await Promise.all([
        supabase.from('team_members').select('*').eq('team_id', input.teamId).order('position'),
        supabase.from('events').select('*').eq('id', input.eventId).single(),
      ])
      if (membersResult.error || eventResult.error || !eventResult.data) throw new HttpError(400, 'No fue posible validar el equipo')
      const members: Tables<'team_members'>[] = membersResult.data ?? []
      const event = eventResult.data as Tables<'events'>
      if (members.length >= event.max_team_size || members.length >= 3) throw new HttpError(409, 'El equipo ya alcanzo el maximo de participantes')

      const values: TablesInsert<'team_members'> = {
        team_id: input.teamId,
        event_id: input.eventId,
        position: members.length + 1,
        full_name: input.fullName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        city: input.city,
        member_role: input.memberRole,
        is_primary_contact: false,
      }
      const { data: memberRaw, error } = await supabase.from('team_members').insert(values).select('*').single()
      if (error || !memberRaw) throw new HttpError(400, error?.message ?? 'No fue posible agregar el participante')
      const member = memberRaw as Tables<'team_members'>
      auditEntityType = 'team_member'
      auditEntityId = member.id
      auditMetadata = { team_id: input.teamId }
      break
    }
    case 'assign_judge': {
      await Promise.all([requireStaffRole(input.judgeId, 'judge'), requireTeamEvent(input.teamId, input.eventId)])
      const values: TablesInsert<'judge_assignments'> = {
        event_id: input.eventId,
        judge_id: input.judgeId,
        team_id: input.teamId,
      }
      const { data: assignmentRaw, error } = await supabase.from('judge_assignments').insert(values).select('*').single()
      if (error || !assignmentRaw) throw new HttpError(400, error?.message ?? 'No fue posible asignar el jurado')
      const assignment = assignmentRaw as Tables<'judge_assignments'>
      auditEntityType = 'judge_assignment'
      auditEntityId = assignment.id
      break
    }
    case 'assign_mentor': {
      await Promise.all([requireStaffRole(input.mentorId, 'mentor'), requireTeamEvent(input.teamId, input.eventId)])
      const values: TablesInsert<'mentor_assignments'> = {
        event_id: input.eventId,
        mentor_id: input.mentorId,
        team_id: input.teamId,
        notes: input.notes,
      }
      const { data: assignmentRaw, error } = await supabase.from('mentor_assignments').insert(values).select('*').single()
      if (error || !assignmentRaw) throw new HttpError(400, error?.message ?? 'No fue posible asignar el mentor')
      const assignment = assignmentRaw as Tables<'mentor_assignments'>
      auditEntityType = 'mentor_assignment'
      auditEntityId = assignment.id
      break
    }
    case 'remove_judge_assignment': {
      const { error } = await supabase.from('judge_assignments').delete().eq('id', input.assignmentId)
      if (error) throw new HttpError(400, error.message)
      auditEntityType = 'judge_assignment'
      auditEntityId = input.assignmentId
      break
    }
    case 'remove_mentor_assignment': {
      const { error } = await supabase.from('mentor_assignments').delete().eq('id', input.assignmentId)
      if (error) throw new HttpError(400, error.message)
      auditEntityType = 'mentor_assignment'
      auditEntityId = input.assignmentId
      break
    }
    default: {
      const exhaustiveCheck: never = input
      return exhaustiveCheck
    }
  }

  await writeAuditLog(profile.id, `admin.${input.action}`, auditEntityType, auditEntityId, auditMetadata)
  setPrivateResponse(response)
  response.status(200).json({ ok: true })
})
