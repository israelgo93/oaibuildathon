import type { PublicEventConfig } from '../src/types/api.js'
import type { Tables } from '../src/types/database.js'
import { HttpError, requireMethod, setPublicCache, withErrorHandling } from '../server/http.js'
import { getServerSupabase } from '../server/supabase.js'

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['GET'])
  const supabase = getServerSupabase()
  const { data: eventRaw, error: eventError } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: false })
    .limit(1)
    .single()

  if (eventError || !eventRaw) throw new HttpError(404, 'No hay un evento configurado')
  const event = eventRaw as Tables<'events'>
  const { data: challengesRaw, error: challengesError } = await supabase
    .from('challenges')
    .select('*')
    .eq('event_id', event.id)
    .eq('active', true)
    .order('sort_order')

  if (challengesError) throw new HttpError(500, 'No fue posible consultar los retos')
  const challenges: Tables<'challenges'>[] = challengesRaw ?? []
  const result: PublicEventConfig = {
    event: {
      id: event.id,
      name: event.name,
      tagline: event.tagline,
      location: event.location,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      registration_open: event.registration_open,
      submissions_open: event.submissions_open,
      submissions_close_at: event.submissions_close_at,
      min_team_size: event.min_team_size,
      max_team_size: event.max_team_size,
    },
    challenges: challenges.map((challenge) => ({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      thematic_axes: challenge.thematic_axes,
      suggested_topics: challenge.suggested_topics,
      requirements: challenge.requirements,
      max_teams: challenge.max_teams,
      sort_order: challenge.sort_order,
      submission_deadline_at: challenge.submission_deadline_at,
    })),
  }

  setPublicCache(response, 30)
  response.status(200).json(result)
})
