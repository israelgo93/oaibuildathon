import type { Tables, TablesUpdate } from '@/types/database'
import { clearTeamSessionCookie, createTeamToken, hashTeamToken, setTeamSessionCookie, TEAM_COOKIE_NAME } from '../server/session.js'
import { getTeamByToken, getTeamPortalData } from '../server/team-data.js'
import { HttpError, parseJsonBody, readCookie, requireMethod, setPrivateResponse, withErrorHandling } from '../server/http.js'
import { getServerSupabase } from '../server/supabase.js'
import { submissionSchema, teamLoginSchema } from '../server/validation.js'

export default withErrorHandling(async (request, response) => {
  requireMethod(request, ['GET', 'POST', 'PATCH', 'DELETE'])
  const supabase = getServerSupabase()

  if (request.method === 'POST') {
    const login = teamLoginSchema.parse(parseJsonBody(request))
    const { data: teamRaw, error } = await supabase
      .from('teams')
      .select('*')
      .eq('registration_code', login.registrationCode)
      .eq('contact_email', login.contactEmail.toLowerCase())
      .maybeSingle()

    if (error || !teamRaw) throw new HttpError(401, 'El codigo o el correo no coinciden')
    const team = teamRaw as Tables<'teams'>
    const token = createTeamToken()
    const { error: updateError } = await supabase
      .from('teams')
      .update({ management_token_hash: hashTeamToken(token) } satisfies TablesUpdate<'teams'>)
      .eq('id', team.id)

    if (updateError) throw new HttpError(500, 'No fue posible iniciar la sesion del equipo')
    setTeamSessionCookie(response, token)
    setPrivateResponse(response)
    response.status(200).json(await getTeamPortalData(team))
    return
  }

  if (request.method === 'DELETE') {
    clearTeamSessionCookie(response)
    setPrivateResponse(response)
    response.status(204).send('')
    return
  }

  const token = readCookie(request, TEAM_COOKIE_NAME)
  if (!token) throw new HttpError(401, 'Debes ingresar con el codigo de tu equipo')
  const team = await getTeamByToken(token)

  if (request.method === 'PATCH') {
    const submission = submissionSchema.parse(parseJsonBody(request))
    const portal = await getTeamPortalData(team)

    if (!portal.event.submissions_open) throw new HttpError(409, 'La etapa de entregas esta cerrada')
    if (portal.submission.status === 'published') throw new HttpError(409, 'El proyecto publicado debe ser reabierto por administracion')

    const values: TablesUpdate<'project_submissions'> = {
      project_name: submission.projectName,
      short_description: submission.shortDescription,
      problem: submission.problem,
      solution: submission.solution,
      tech_stack: submission.techStack,
      repository_url: submission.repositoryUrl,
      demo_url: submission.demoUrl,
      presentation_url: submission.presentationUrl,
      video_url: submission.videoUrl,
      status: submission.submit ? 'submitted' : 'draft',
      submitted_at: submission.submit ? new Date().toISOString() : null,
      published_at: null,
    }
    const { error } = await supabase.from('project_submissions').update(values).eq('team_id', team.id)
    if (error) throw new HttpError(500, 'No fue posible guardar el proyecto')
  }

  setPrivateResponse(response)
  response.status(200).json(await getTeamPortalData(team))
})
