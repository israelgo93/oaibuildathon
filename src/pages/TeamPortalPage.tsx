import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiClientError, apiRequest, errorMessage } from '@/lib/api'
import { SystemLayout } from '@/components/system/SystemLayout'
import { StatusMessage } from '@/components/system/StatusMessage'
import { ChallengeThemes } from '@/components/system/ChallengeThemes'
import { OptionalFieldLabel, RequiredFieldLabel, RequiredFieldsLegend } from '@/components/system/FormFieldLabel'
import { formatEcuadorDateTime, isDeadlineReached } from '@/lib/dates'
import { finalSubmissionError } from '@/lib/submission'
import { mapTechnologySelection, normalizeTechnologyStack, splitCustomTechnologies, TECHNOLOGY_OPTIONS, type TechnologyOption } from '@/lib/technologies'
import type { SubmissionInput, TeamLoginInput, TeamPortalData } from '@/types/api'

interface SubmissionFormState {
  projectName: string
  shortDescription: string
  problem: string
  solution: string
  selectedTechnologies: TechnologyOption[]
  customTechnologies: string
  includeOtherTechnologies: boolean
  repositoryUrl: string
  demoUrl: string
  presentationUrl: string
  videoUrl: string
}

function submissionState(portal: TeamPortalData): SubmissionFormState {
  const technologySelection = mapTechnologySelection(portal.submission.tech_stack)
  return {
    projectName: portal.submission.project_name,
    shortDescription: portal.submission.short_description,
    problem: portal.submission.problem,
    solution: portal.submission.solution,
    selectedTechnologies: technologySelection.selected,
    customTechnologies: technologySelection.custom.join(', '),
    includeOtherTechnologies: technologySelection.custom.length > 0,
    repositoryUrl: portal.submission.repository_url,
    demoUrl: portal.submission.demo_url,
    presentationUrl: portal.submission.presentation_url,
    videoUrl: portal.submission.video_url,
  }
}

export function TeamPortalPage() {
  const [portal, setPortal] = useState<TeamPortalData | null>(null)
  const [form, setForm] = useState<SubmissionFormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')

  const applyPortal = (data: TeamPortalData) => {
    setPortal(data)
    setForm(submissionState(data))
  }

  useEffect(() => {
    apiRequest<TeamPortalData>('/api/team')
      .then(applyPortal)
      .catch((error: unknown) => {
        if (!(error instanceof ApiClientError) || error.status !== 401) setMessage(errorMessage(error))
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    const formData = new FormData(event.currentTarget)
    const input: TeamLoginInput = {
      registrationCode: String(formData.get('registrationCode') ?? ''),
      contactEmail: String(formData.get('contactEmail') ?? ''),
    }

    try {
      applyPortal(await apiRequest<TeamPortalData>('/api/team', { method: 'POST', body: JSON.stringify(input) }))
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await apiRequest<null>('/api/team', { method: 'DELETE' })
    setPortal(null)
    setForm(null)
    setSuccess('')
  }

  const saveSubmission = async (submit: boolean) => {
    if (!form) return
    setMessage('')
    setSuccess('')
    const techStack = normalizeTechnologyStack([
      ...form.selectedTechnologies,
      ...(form.includeOtherTechnologies ? splitCustomTechnologies(form.customTechnologies) : []),
    ])
    const input: SubmissionInput = {
      projectName: form.projectName,
      shortDescription: form.shortDescription,
      problem: form.problem,
      solution: form.solution,
      techStack,
      repositoryUrl: form.repositoryUrl,
      demoUrl: form.demoUrl,
      presentationUrl: form.presentationUrl,
      videoUrl: form.videoUrl,
      submit,
    }

    if (submit) {
      const validationError = finalSubmissionError(input)
      if (validationError) {
        setMessage(validationError)
        return
      }
    }

    setSaving(true)

    try {
      const data = await apiRequest<TeamPortalData>('/api/team', { method: 'PATCH', body: JSON.stringify(input) })
      applyPortal(data)
      setSuccess(submit ? 'Entrega enviada al sistema. El equipo ya puede ser evaluado.' : 'Borrador guardado correctamente.')
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const toggleTechnology = (technology: TechnologyOption) => {
    if (!form) return
    const selected = form.selectedTechnologies.includes(technology)
      ? form.selectedTechnologies.filter((item) => item !== technology)
      : [...form.selectedTechnologies, technology]
    setForm({ ...form, selectedTechnologies: selected })
  }

  if (loading) {
    return <SystemLayout eyebrow="Equipos" title="Portal de construccion"><StatusMessage>Cargando...</StatusMessage></SystemLayout>
  }

  if (!portal || !form) {
    return (
      <SystemLayout eyebrow="Equipos" title="Continua tu proyecto">
        <div className="auth-layout">
          <form className="system-card system-form auth-card" onSubmit={(event) => void login(event)}>
            <h2>Acceso del equipo</h2>
            <p>Usa el codigo entregado al registrar y el correo del contacto principal.</p>
            {message ? <StatusMessage kind="error">{message}</StatusMessage> : null}
            <label>Codigo de equipo<input name="registrationCode" required minLength={8} maxLength={8} autoCapitalize="characters" /></label>
            <label>Correo de contacto<input name="contactEmail" type="email" required /></label>
            <button className="system-button system-button-primary" type="submit">Entrar al portal</button>
            <Link to="/registro">Registrar un equipo nuevo</Link>
          </form>
          <aside className="auth-aside">
            <span>DE CERO A DEMO</span>
            <h2>Construye. Documenta. Presenta.</h2>
            <p>El portal concentra el reto, los integrantes y la entrega que vera el jurado.</p>
          </aside>
        </div>
      </SystemLayout>
    )
  }

  const deadlineReached = isDeadlineReached(portal.submissionDeadlineAt)
  const locked = portal.submission.status === 'published' || !portal.event.submissions_open || deadlineReached
  const lockedMessage = portal.submission.status === 'published'
    ? 'El proyecto ya esta publicado en la vitrina.'
    : deadlineReached
      ? `El deadline finalizo el ${formatEcuadorDateTime(portal.submissionDeadlineAt)}.`
      : 'La etapa de entregas esta cerrada.'

  return (
    <SystemLayout eyebrow={portal.event.name} title={portal.team.name}>
      <div className="portal-toolbar">
        <div>
          <span className={`status-pill status-${portal.submission.status}`}>{portal.submission.status}</span>
          <span>Codigo {portal.team.registration_code}</span>
        </div>
        <button className="system-link-button" type="button" onClick={() => void logout()}>Salir del equipo</button>
      </div>
      {message ? <StatusMessage kind="error">{message}</StatusMessage> : null}
      {success ? <StatusMessage kind="success">{success}</StatusMessage> : null}
      {locked ? <StatusMessage>{lockedMessage}</StatusMessage> : null}
      <div className="portal-grid">
        <aside className="portal-sidebar">
          <section className="system-card compact-card">
            <p className="system-eyebrow">Reto elegido</p>
            <h2>{portal.challenge.title}</h2>
            <p>{portal.challenge.description}</p>
            <ChallengeThemes thematicAxes={portal.challenge.thematic_axes} suggestedTopics={portal.challenge.suggested_topics} />
            {portal.challenge.requirements ? <small>{portal.challenge.requirements}</small> : null}
            <p><strong>Deadline:</strong> {formatEcuadorDateTime(portal.submissionDeadlineAt)}</p>
          </section>
          <section className="system-card compact-card">
            <p className="system-eyebrow">Equipo · {portal.members.length}</p>
            <ul className="member-summary">
              {portal.members.map((member) => (
                <li key={member.id}><strong>{member.full_name}</strong><span>{member.member_role || 'Builder'}{member.is_primary_contact ? ' · Contacto' : ''}</span></li>
              ))}
            </ul>
          </section>
        </aside>

        <form className="system-card system-form submission-form" onSubmit={(event) => {
          event.preventDefault()
          const submitter = event.nativeEvent.submitter as HTMLButtonElement | null
          void saveSubmission(submitter?.value === 'final')
        }}>
          <div className="form-section-heading">
            <h2>Entrega del proyecto</h2>
            <p>Describe lo que construyeron. Solo los proyectos publicados por administracion aparecen en la landing.</p>
          </div>
          <RequiredFieldsLegend />
          <label><RequiredFieldLabel>Nombre del proyecto</RequiredFieldLabel><input required maxLength={100} disabled={locked} value={form.projectName} onChange={(event) => setForm({ ...form, projectName: event.target.value })} /></label>
          <label><RequiredFieldLabel>Descripcion corta</RequiredFieldLabel><textarea required maxLength={240} rows={3} disabled={locked} value={form.shortDescription} onChange={(event) => setForm({ ...form, shortDescription: event.target.value })} /></label>
          <label><RequiredFieldLabel>Problema</RequiredFieldLabel><textarea required maxLength={2000} rows={5} disabled={locked} value={form.problem} onChange={(event) => setForm({ ...form, problem: event.target.value })} /></label>
          <label><RequiredFieldLabel>Solucion construida</RequiredFieldLabel><textarea required maxLength={3000} rows={6} disabled={locked} value={form.solution} onChange={(event) => setForm({ ...form, solution: event.target.value })} /></label>
          <fieldset className="technology-fieldset">
            <legend><RequiredFieldLabel>Tecnologias</RequiredFieldLabel></legend>
            <div className="technology-grid">
              {TECHNOLOGY_OPTIONS.map((technology) => (
                <label key={technology}><input type="checkbox" disabled={locked} checked={form.selectedTechnologies.includes(technology)} onChange={() => toggleTechnology(technology)} /> {technology}</label>
              ))}
              <label><input type="checkbox" disabled={locked} checked={form.includeOtherTechnologies} onChange={(event) => setForm({ ...form, includeOtherTechnologies: event.target.checked, customTechnologies: event.target.checked ? form.customTechnologies : '' })} /> Otras</label>
            </div>
            {form.includeOtherTechnologies ? <label><OptionalFieldLabel>Tecnologias adicionales, separadas por comas</OptionalFieldLabel><input disabled={locked} maxLength={1200} value={form.customTechnologies} onChange={(event) => setForm({ ...form, customTechnologies: event.target.value })} placeholder="Otra herramienta, framework propio" /></label> : null}
          </fieldset>
          <div className="form-grid">
            <label><RequiredFieldLabel>URL de demo</RequiredFieldLabel><input required type="url" disabled={locked} value={form.demoUrl} onChange={(event) => setForm({ ...form, demoUrl: event.target.value })} /></label>
            <label><RequiredFieldLabel>Repositorio</RequiredFieldLabel><input required type="url" disabled={locked} value={form.repositoryUrl} onChange={(event) => setForm({ ...form, repositoryUrl: event.target.value })} /></label>
            <label><OptionalFieldLabel>Presentacion</OptionalFieldLabel><input type="url" disabled={locked} value={form.presentationUrl} onChange={(event) => setForm({ ...form, presentationUrl: event.target.value })} /></label>
            <label><OptionalFieldLabel>Video</OptionalFieldLabel><input type="url" disabled={locked} value={form.videoUrl} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} /></label>
          </div>
          {!locked ? (
            <div className="system-actions">
              <button className="system-button" type="submit" name="submissionAction" value="draft" formNoValidate disabled={saving}>{saving ? 'Guardando...' : 'Guardar borrador'}</button>
              <button className="system-button system-button-primary" type="submit" name="submissionAction" value="final" disabled={saving}>Enviar al jurado</button>
            </div>
          ) : null}
        </form>
      </div>
    </SystemLayout>
  )
}
