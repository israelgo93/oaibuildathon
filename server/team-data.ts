import type { TeamPortalData } from '../src/types/api.js'
import type { Tables } from '../src/types/database.js'
import { effectiveSubmissionDeadline } from '../src/lib/dates.js'
import { HttpError } from './http.js'
import { hashTeamToken } from './session.js'
import { getServerSupabase } from './supabase.js'

export async function getTeamByToken(token: string): Promise<Tables<'teams'>> {
  const supabase = getServerSupabase()
  const { data: teamRaw, error } = await supabase
    .from('teams')
    .select('*')
    .eq('management_token_hash', hashTeamToken(token))
    .maybeSingle()

  if (error || !teamRaw) {
    throw new HttpError(401, 'La sesion del equipo no es valida')
  }

  return teamRaw as Tables<'teams'>
}

export async function getTeamPortalData(team: Tables<'teams'>): Promise<TeamPortalData> {
  const supabase = getServerSupabase()
  const [eventResult, membersResult, teamChallengeResult, submissionResult] = await Promise.all([
    supabase.from('events').select('*').eq('id', team.event_id).single(),
    supabase.from('team_members').select('*').eq('team_id', team.id).order('position'),
    supabase.from('team_challenges').select('*').eq('team_id', team.id).single(),
    supabase.from('project_submissions').select('*').eq('team_id', team.id).single(),
  ])

  if (eventResult.error || !eventResult.data) throw new HttpError(404, 'El evento no esta disponible')
  if (membersResult.error) throw new HttpError(500, 'No fue posible consultar los participantes')
  if (teamChallengeResult.error || !teamChallengeResult.data) throw new HttpError(404, 'El equipo no tiene un reto asignado')
  if (submissionResult.error || !submissionResult.data) throw new HttpError(404, 'El proyecto del equipo no esta disponible')

  const event = eventResult.data as Tables<'events'>
  const members: Tables<'team_members'>[] = membersResult.data ?? []
  const teamChallenge = teamChallengeResult.data as Tables<'team_challenges'>
  const submission = submissionResult.data as Tables<'project_submissions'>
  const { data: challengeRaw, error: challengeError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', teamChallenge.challenge_id)
    .single()

  if (challengeError || !challengeRaw) throw new HttpError(404, 'El reto no esta disponible')
  const challenge = challengeRaw as Tables<'challenges'>

  return {
    event: {
      id: event.id,
      name: event.name,
      submissions_open: event.submissions_open,
      submissions_close_at: event.submissions_close_at,
    },
    team: {
      id: team.id,
      name: team.name,
      organization: team.organization,
      city: team.city,
      contact_email: team.contact_email,
      contact_phone: team.contact_phone,
      status: team.status,
      registration_code: team.registration_code,
    },
    members: members.map((member) => ({
      id: member.id,
      position: member.position,
      full_name: member.full_name,
      email: member.email,
      phone: member.phone,
      city: member.city,
      member_role: member.member_role,
      is_primary_contact: member.is_primary_contact,
    })),
    challenge: {
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      requirements: challenge.requirements,
      submission_deadline_at: challenge.submission_deadline_at,
    },
    submissionDeadlineAt: effectiveSubmissionDeadline(
      challenge.submission_deadline_at,
      event.submissions_close_at,
    ),
    submission: {
      id: submission.id,
      project_name: submission.project_name,
      short_description: submission.short_description,
      problem: submission.problem,
      solution: submission.solution,
      tech_stack: submission.tech_stack,
      repository_url: submission.repository_url,
      demo_url: submission.demo_url,
      presentation_url: submission.presentation_url,
      video_url: submission.video_url,
      status: submission.status,
      submitted_at: submission.submitted_at,
    },
  }
}
