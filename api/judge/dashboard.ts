import type { JudgeDashboardData, JudgeTeamData } from '@/types/api'
import type { Tables } from '@/types/database'
import { requireRole } from '../../server/auth.js'
import { HttpError, requireMethod, setPrivateResponse, withErrorHandling } from '../../server/http.js'
import { getServerSupabase } from '../../server/supabase.js'

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['GET'])
  const { profile, publicProfile } = await requireRole(request, ['judge', 'admin'])
  const supabase = getServerSupabase()
  const { data: eventRaw, error: eventError } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: false })
    .limit(1)
    .single()

  if (eventError || !eventRaw) throw new HttpError(404, 'No hay un evento configurado')
  const event = eventRaw as Tables<'events'>
  const [criteriaResult, assignmentsResult] = await Promise.all([
    supabase.from('evaluation_criteria').select('*').eq('event_id', event.id).eq('active', true).order('sort_order'),
    supabase.from('judge_assignments').select('*').eq('event_id', event.id).eq('judge_id', profile.id),
  ])

  if (criteriaResult.error || assignmentsResult.error) throw new HttpError(500, 'No fue posible cargar las asignaciones')
  const criteria: Tables<'evaluation_criteria'>[] = criteriaResult.data ?? []
  const assignments: Tables<'judge_assignments'>[] = assignmentsResult.data ?? []
  let teams: JudgeTeamData[] = []

  if (assignments.length > 0) {
    const teamIds = assignments.map((assignment) => assignment.team_id)
    const [teamsResult, teamChallengesResult, submissionsResult, evaluationsResult] = await Promise.all([
      supabase.from('teams').select('*').in('id', teamIds),
      supabase.from('team_challenges').select('*').in('team_id', teamIds),
      supabase.from('project_submissions').select('*').in('team_id', teamIds),
      supabase.from('evaluations').select('*').eq('judge_id', profile.id).in('team_id', teamIds),
    ])

    if (teamsResult.error || teamChallengesResult.error || submissionsResult.error || evaluationsResult.error) {
      throw new HttpError(500, 'No fue posible cargar los equipos asignados')
    }

    const teamRows: Tables<'teams'>[] = teamsResult.data ?? []
    const teamChallenges: Tables<'team_challenges'>[] = teamChallengesResult.data ?? []
    const submissions: Tables<'project_submissions'>[] = submissionsResult.data ?? []
    const evaluations: Tables<'evaluations'>[] = evaluationsResult.data ?? []
    const challengeIds = [...new Set(teamChallenges.map((item) => item.challenge_id))]
    let challenges: Tables<'challenges'>[] = []

    if (challengeIds.length > 0) {
      const { data: challengesRaw, error: challengesError } = await supabase.from('challenges').select('*').in('id', challengeIds)
      if (challengesError) throw new HttpError(500, 'No fue posible cargar los retos')
      const loadedChallenges: Tables<'challenges'>[] = challengesRaw ?? []
      challenges = loadedChallenges
    }

    const evaluationIds = evaluations.map((evaluation) => evaluation.id)
    let scores: Tables<'evaluation_scores'>[] = []
    if (evaluationIds.length > 0) {
      const { data: scoresRaw, error: scoresError } = await supabase.from('evaluation_scores').select('*').in('evaluation_id', evaluationIds)
      if (scoresError) throw new HttpError(500, 'No fue posible cargar las calificaciones')
      const loadedScores: Tables<'evaluation_scores'>[] = scoresRaw ?? []
      scores = loadedScores
    }

    const teamById = new Map(teamRows.map((team) => [team.id, team]))
    const teamChallengeByTeam = new Map(teamChallenges.map((item) => [item.team_id, item]))
    const challengeById = new Map(challenges.map((challenge) => [challenge.id, challenge]))
    const submissionByTeam = new Map(submissions.map((submission) => [submission.team_id, submission]))
    const evaluationByTeam = new Map(evaluations.map((evaluation) => [evaluation.team_id, evaluation]))

    teams = assignments.flatMap((assignment) => {
      const team = teamById.get(assignment.team_id)
      if (!team) return []
      const teamChallenge = teamChallengeByTeam.get(team.id)
      const challenge = teamChallenge ? challengeById.get(teamChallenge.challenge_id) : undefined
      const evaluation = evaluationByTeam.get(team.id) ?? null
      return [{
        assignmentId: assignment.id,
        team: {
          id: team.id,
          event_id: team.event_id,
          name: team.name,
          organization: team.organization,
          city: team.city,
        },
        challenge: challenge ? { id: challenge.id, title: challenge.title } : null,
        submission: submissionByTeam.get(team.id) ?? null,
        evaluation,
        scores: evaluation ? scores.filter((score) => score.evaluation_id === evaluation.id) : [],
      }]
    })
  }

  const dashboard: JudgeDashboardData = { profile: publicProfile, event, criteria, teams }
  setPrivateResponse(response)
  response.status(200).json(dashboard)
})
