import type { ShowcaseProject } from '@/types/api'
import type { Tables } from '@/types/database'
import { HttpError, requireMethod, setPublicCache, withErrorHandling } from '../server/http.js'
import { getServerSupabase } from '../server/supabase.js'

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['GET'])
  const supabase = getServerSupabase()
  const { data: eventRaw, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('showcase_enabled', true)
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (eventError) throw new HttpError(500, 'No fue posible consultar la vitrina')
  if (!eventRaw) {
    setPublicCache(response, 30)
    response.status(200).json([] satisfies ShowcaseProject[])
    return
  }

  const event = eventRaw as Tables<'events'>
  const { data: submissionsRaw, error: submissionsError } = await supabase
    .from('project_submissions')
    .select('*')
    .eq('event_id', event.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (submissionsError) throw new HttpError(500, 'No fue posible consultar los proyectos')
  const submissions: Tables<'project_submissions'>[] = submissionsRaw ?? []

  if (submissions.length === 0) {
    setPublicCache(response, 30)
    response.status(200).json([] satisfies ShowcaseProject[])
    return
  }

  const teamIds = submissions.map((submission) => submission.team_id)
  const [teamsResult, teamChallengesResult] = await Promise.all([
    supabase.from('teams').select('*').in('id', teamIds),
    supabase.from('team_challenges').select('*').in('team_id', teamIds),
  ])

  if (teamsResult.error || teamChallengesResult.error) throw new HttpError(500, 'No fue posible completar la vitrina')
  const teams: Tables<'teams'>[] = teamsResult.data ?? []
  const teamChallenges: Tables<'team_challenges'>[] = teamChallengesResult.data ?? []
  const challengeIds = [...new Set(teamChallenges.map((item) => item.challenge_id))]
  const { data: challengesRaw, error: challengesError } = await supabase
    .from('challenges')
    .select('*')
    .in('id', challengeIds)

  if (challengesError) throw new HttpError(500, 'No fue posible completar la vitrina')
  const challenges: Tables<'challenges'>[] = challengesRaw ?? []
  const teamById = new Map(teams.map((team) => [team.id, team]))
  const teamChallengeByTeam = new Map(teamChallenges.map((item) => [item.team_id, item]))
  const challengeById = new Map(challenges.map((challenge) => [challenge.id, challenge]))
  const projects: ShowcaseProject[] = submissions.flatMap((submission) => {
    const team = teamById.get(submission.team_id)
    const teamChallenge = teamChallengeByTeam.get(submission.team_id)
    const challenge = teamChallenge ? challengeById.get(teamChallenge.challenge_id) : undefined

    if (!team || !challenge) return []
    return [{
      id: submission.id,
      teamName: team.name,
      projectName: submission.project_name,
      shortDescription: submission.short_description,
      challengeTitle: challenge.title,
      techStack: submission.tech_stack,
      demoUrl: submission.demo_url,
      repositoryUrl: submission.repository_url,
      publishedAt: submission.published_at,
    }]
  })

  setPublicCache(response, 30)
  response.status(200).json(projects)
})
