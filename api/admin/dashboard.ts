import type { AdminDashboardData } from '@/types/api'
import type { Tables } from '@/types/database'
import { requireRole } from '../../server/auth.js'
import { HttpError, requireMethod, setPrivateResponse, withErrorHandling } from '../../server/http.js'
import { getServerSupabase } from '../../server/supabase.js'

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['GET'])
  const { publicProfile } = await requireRole(request, ['admin'])
  const supabase = getServerSupabase()
  const [
    eventsResult,
    challengesResult,
    teamsResult,
    membersResult,
    teamChallengesResult,
    submissionsResult,
    criteriaResult,
    profilesResult,
    judgeAssignmentsResult,
    mentorAssignmentsResult,
    evaluationsResult,
    scoresResult,
  ] = await Promise.all([
    supabase.from('events').select('*').order('starts_at', { ascending: false }),
    supabase.from('challenges').select('*').order('sort_order'),
    supabase.from('teams').select('*').order('registered_at', { ascending: false }),
    supabase.from('team_members').select('*').order('position'),
    supabase.from('team_challenges').select('*'),
    supabase.from('project_submissions').select('*').order('updated_at', { ascending: false }),
    supabase.from('evaluation_criteria').select('*').order('sort_order'),
    supabase.from('profiles').select('*').order('full_name'),
    supabase.from('judge_assignments').select('*'),
    supabase.from('mentor_assignments').select('*'),
    supabase.from('evaluations').select('*'),
    supabase.from('evaluation_scores').select('*'),
  ])

  const failedResult = [
    eventsResult, challengesResult, teamsResult, membersResult, teamChallengesResult,
    submissionsResult, criteriaResult, profilesResult, judgeAssignmentsResult,
    mentorAssignmentsResult, evaluationsResult, scoresResult,
  ].find((result) => result.error)

  if (failedResult?.error) throw new HttpError(500, 'No fue posible cargar el panel administrativo')

  const events: Tables<'events'>[] = eventsResult.data ?? []
  const challenges: Tables<'challenges'>[] = challengesResult.data ?? []
  const teams: Tables<'teams'>[] = teamsResult.data ?? []
  const members: Tables<'team_members'>[] = membersResult.data ?? []
  const teamChallenges: Tables<'team_challenges'>[] = teamChallengesResult.data ?? []
  const submissions: Tables<'project_submissions'>[] = submissionsResult.data ?? []
  const criteria: Tables<'evaluation_criteria'>[] = criteriaResult.data ?? []
  const profiles: Tables<'profiles'>[] = profilesResult.data ?? []
  const judgeAssignments: Tables<'judge_assignments'>[] = judgeAssignmentsResult.data ?? []
  const mentorAssignments: Tables<'mentor_assignments'>[] = mentorAssignmentsResult.data ?? []
  const evaluations: Tables<'evaluations'>[] = evaluationsResult.data ?? []
  const scores: Tables<'evaluation_scores'>[] = scoresResult.data ?? []
  const dashboard: AdminDashboardData = {
    profile: publicProfile,
    events,
    challenges,
    teams,
    members,
    teamChallenges,
    submissions,
    criteria,
    profiles,
    judgeAssignments,
    mentorAssignments,
    evaluations,
    scores,
  }

  setPrivateResponse(response)
  response.status(200).json(dashboard)
})
