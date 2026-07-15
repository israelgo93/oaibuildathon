import type { Tables, TablesUpdate } from '../src/types/database.js'
import { isDeadlineReached } from '../src/lib/dates.js'
import { clearTeamSessionCookie, createTeamToken, hashTeamToken, setTeamSessionCookie, TEAM_COOKIE_NAME } from '../server/session.js'
import { getTeamByToken, getTeamPortalData } from '../server/team-data.js'
import { HttpError, parseJsonBody, readCookie, requireMethod, setPrivateResponse, withErrorHandling } from '../server/http.js'
import { getServerSupabase } from '../server/supabase.js'
import { submissionSchema, teamLoginSchema } from '../server/validation.js'
import { scheduleSubmissionAnalysisForSubmission } from '../server/submission-analysis-service.js'
import {
  isSubmissionResubmitCooldownActive,
  submissionContentMatchesInput,
} from '../server/submission-analysis-fingerprint.js'

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
    if (isDeadlineReached(portal.submissionDeadlineAt)) {
      throw new HttpError(409, 'El deadline de este reto ya finalizo')
    }
    if (portal.submission.status === 'published') throw new HttpError(409, 'El proyecto publicado debe ser reabierto por administracion')

    const isIdempotentFinalSubmission = submission.submit
      && portal.submission.status === 'submitted'
      && portal.submission.submitted_at !== null
      && isSubmissionResubmitCooldownActive(portal.submission.submitted_at)
      && submissionContentMatchesInput(portal.submission, {
        projectName: submission.projectName,
        shortDescription: submission.shortDescription,
        problem: submission.problem,
        solution: submission.solution,
        techStack: submission.techStack ?? [],
        repositoryUrl: submission.repositoryUrl ?? '',
        demoUrl: submission.demoUrl ?? '',
        presentationUrl: submission.presentationUrl ?? '',
        videoUrl: submission.videoUrl ?? '',
      })

    if (isIdempotentFinalSubmission) {
      setPrivateResponse(response)
      response.status(200).json(portal)
      return
    }

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
    const { data: savedRaw, error } = await supabase
      .from('project_submissions')
      .update(values)
      .eq('team_id', team.id)
      .select('*')
      .single()
    if (error || !savedRaw) throw new HttpError(500, 'No fue posible guardar el proyecto')
    const savedSubmission = savedRaw as Tables<'project_submissions'>
    await scheduleSubmissionAnalysisForSubmission(savedSubmission)
  }

  setPrivateResponse(response)
  response.status(200).json(await getTeamPortalData(team))
})
