import type { MentorDashboardData, MentorTeamData } from '../../src/types/api.js'
import type { Tables } from '../../src/types/database.js'
import { requireRole } from '../../server/auth.js'
import { HttpError, requireMethod, setPrivateResponse, withErrorHandling } from '../../server/http.js'
import { getServerSupabase } from '../../server/supabase.js'

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['GET'])
  const { profile, publicProfile } = await requireRole(request, ['mentor', 'admin'])
  const supabase = getServerSupabase()
  const { data: eventRaw, error: eventError } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: false })
    .limit(1)
    .single()

  if (eventError || !eventRaw) throw new HttpError(404, 'No hay un evento configurado')
  const event = eventRaw as Tables<'events'>
  const { data: assignmentsRaw, error: assignmentsError } = await supabase
    .from('mentor_assignments')
    .select('*')
    .eq('event_id', event.id)
    .eq('mentor_id', profile.id)

  if (assignmentsError) throw new HttpError(500, 'No fue posible cargar las asignaciones')
  const assignments: Tables<'mentor_assignments'>[] = assignmentsRaw ?? []
  let teams: MentorTeamData[] = []

  if (assignments.length > 0) {
    const teamIds = assignments.map((assignment) => assignment.team_id)
    const [teamsResult, membersResult, teamChallengesResult, submissionsResult] = await Promise.all([
      supabase.from('teams').select('*').in('id', teamIds),
      supabase.from('team_members').select('*').in('team_id', teamIds).order('position'),
      supabase.from('team_challenges').select('*').in('team_id', teamIds),
      supabase.from('project_submissions').select('*').in('team_id', teamIds),
    ])

    if (teamsResult.error || membersResult.error || teamChallengesResult.error || submissionsResult.error) {
      throw new HttpError(500, 'No fue posible cargar los equipos asignados')
    }

    const teamRows: Tables<'teams'>[] = teamsResult.data ?? []
    const members: Tables<'team_members'>[] = membersResult.data ?? []
    const teamChallenges: Tables<'team_challenges'>[] = teamChallengesResult.data ?? []
    const submissions: Tables<'project_submissions'>[] = submissionsResult.data ?? []
    const challengeIds = [...new Set(teamChallenges.map((item) => item.challenge_id))]
    let challenges: Tables<'challenges'>[] = []

    if (challengeIds.length > 0) {
      const { data: challengesRaw, error: challengesError } = await supabase.from('challenges').select('*').in('id', challengeIds)
      if (challengesError) throw new HttpError(500, 'No fue posible cargar los retos')
      const loadedChallenges: Tables<'challenges'>[] = challengesRaw ?? []
      challenges = loadedChallenges
    }

    const teamById = new Map(teamRows.map((team) => [team.id, team]))
    const teamChallengeByTeam = new Map(teamChallenges.map((item) => [item.team_id, item]))
    const challengeById = new Map(challenges.map((challenge) => [challenge.id, challenge]))
    const submissionByTeam = new Map(submissions.map((submission) => [submission.team_id, submission]))

    teams = assignments.flatMap((assignment) => {
      const team = teamById.get(assignment.team_id)
      if (!team) return []
      const teamChallenge = teamChallengeByTeam.get(team.id)
      const challenge = teamChallenge ? challengeById.get(teamChallenge.challenge_id) : undefined
      return [{
        assignmentId: assignment.id,
        notes: assignment.notes,
        team,
        members: members.filter((member) => member.team_id === team.id),
        challenge: challenge ? {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          requirements: challenge.requirements,
        } : null,
        submission: submissionByTeam.get(team.id) ?? null,
      }]
    })
  }

  const dashboard: MentorDashboardData = { profile: publicProfile, event, teams }
  setPrivateResponse(response)
  response.status(200).json(dashboard)
})
