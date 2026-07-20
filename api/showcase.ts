import type { ShowcaseProject } from '../src/types/api.js'
import type { Tables } from '../src/types/database.js'
import { HttpError, requireMethod, setPublicCache, withErrorHandling } from '../server/http.js'
import { getServerSupabase } from '../server/supabase.js'

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['GET'])
  const supabase = getServerSupabase()
  const { data: eventsRaw, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .eq('showcase_enabled', true)
    .order('starts_at', { ascending: false })

  if (eventsError) throw new HttpError(500, 'No fue posible consultar la vitrina')
  const events: Tables<'events'>[] = eventsRaw ?? []
  if (events.length === 0) {
    setPublicCache(response, 30)
    response.status(200).json([] satisfies ShowcaseProject[])
    return
  }

  const eventIds = events.map((event) => event.id)
  const { data: submissionsRaw, error: submissionsError } = await supabase
    .from('project_submissions')
    .select('*')
    .in('event_id', eventIds)
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
  const eventById = new Map(events.map((event) => [event.id, event]))
  const teamById = new Map(teams.map((team) => [team.id, team]))
  const teamChallengeByTeam = new Map(teamChallenges.map((item) => [item.team_id, item]))
  const challengeById = new Map(challenges.map((challenge) => [challenge.id, challenge]))
  const eventOrder = new Map(events.map((event, index) => [event.id, index]))
  const projects: ShowcaseProject[] = submissions
    .flatMap((submission) => {
      const event = eventById.get(submission.event_id)
      const team = teamById.get(submission.team_id)
      const teamChallenge = teamChallengeByTeam.get(submission.team_id)
      const challenge = teamChallenge ? challengeById.get(teamChallenge.challenge_id) : undefined

      if (!event || !team || !challenge) return []
      return [{
        id: submission.id,
        eventId: event.id,
        eventName: event.name,
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
    .sort((left, right) => (eventOrder.get(left.eventId) ?? 0) - (eventOrder.get(right.eventId) ?? 0))

  setPublicCache(response, 30)
  response.status(200).json(projects)
})
