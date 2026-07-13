import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiClientError, apiRequest, errorMessage } from '@/lib/api'
import { SystemLayout } from '@/components/system/SystemLayout'
import { StatusMessage } from '@/components/system/StatusMessage'
import type { SubmissionInput, TeamLoginInput, TeamPortalData } from '@/types/api'

interface SubmissionFormState {
  projectName: string
  shortDescription: string
  problem: string
  solution: string
  techStack: string
  repositoryUrl: string
  demoUrl: string
  presentationUrl: string
  videoUrl: string
}

function submissionState(portal: TeamPortalData): SubmissionFormState {
  return {
    projectName: portal.submission.project_name,
    shortDescription: portal.submission.short_description,
    problem: portal.submission.problem,
    solution: portal.submission.solution,
    techStack: portal.submission.tech_stack.join(', '),
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
    setSaving(true)
    setMessage('')
    setSuccess('')
    const input: SubmissionInput = {
      projectName: form.projectName,
      shortDescription: form.shortDescription,
      problem: form.problem,
      solution: form.solution,
      techStack: form.techStack.split(',').map((item) => item.trim()).filter(Boolean),
      repositoryUrl: form.repositoryUrl,
      demoUrl: form.demoUrl,
      presentationUrl: form.presentationUrl,
      videoUrl: form.videoUrl,
      submit,
    }

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

  const locked = portal.submission.status === 'published' || !portal.event.submissions_open

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
      {locked ? <StatusMessage>{portal.submission.status === 'published' ? 'El proyecto ya esta publicado en la vitrina.' : 'La etapa de entregas esta cerrada.'}</StatusMessage> : null}
      <div className="portal-grid">
        <aside className="portal-sidebar">
          <section className="system-card compact-card">
            <p className="system-eyebrow">Reto elegido</p>
            <h2>{portal.challenge.title}</h2>
            <p>{portal.challenge.description}</p>
            {portal.challenge.requirements ? <small>{portal.challenge.requirements}</small> : null}
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
          void saveSubmission(false)
        }}>
          <div className="form-section-heading">
            <h2>Entrega del proyecto</h2>
            <p>Describe lo que construyeron. Solo los proyectos publicados por administracion aparecen en la landing.</p>
          </div>
          <label>Nombre del proyecto<input required maxLength={100} disabled={locked} value={form.projectName} onChange={(event) => setForm({ ...form, projectName: event.target.value })} /></label>
          <label>Descripcion corta<textarea required maxLength={240} rows={3} disabled={locked} value={form.shortDescription} onChange={(event) => setForm({ ...form, shortDescription: event.target.value })} /></label>
          <label>Problema<textarea required maxLength={2000} rows={5} disabled={locked} value={form.problem} onChange={(event) => setForm({ ...form, problem: event.target.value })} /></label>
          <label>Solucion construida<textarea required maxLength={3000} rows={6} disabled={locked} value={form.solution} onChange={(event) => setForm({ ...form, solution: event.target.value })} /></label>
          <label>Tecnologias, separadas por comas<input disabled={locked} value={form.techStack} onChange={(event) => setForm({ ...form, techStack: event.target.value })} placeholder="OpenAI API, Codex, React, Supabase" /></label>
          <div className="form-grid">
            <label>URL de demo<input type="url" disabled={locked} value={form.demoUrl} onChange={(event) => setForm({ ...form, demoUrl: event.target.value })} /></label>
            <label>Repositorio<input type="url" disabled={locked} value={form.repositoryUrl} onChange={(event) => setForm({ ...form, repositoryUrl: event.target.value })} /></label>
            <label>Presentacion<input type="url" disabled={locked} value={form.presentationUrl} onChange={(event) => setForm({ ...form, presentationUrl: event.target.value })} /></label>
            <label>Video<input type="url" disabled={locked} value={form.videoUrl} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} /></label>
          </div>
          {!locked ? (
            <div className="system-actions">
              <button className="system-button" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar borrador'}</button>
              <button className="system-button system-button-primary" type="button" disabled={saving} onClick={() => void saveSubmission(true)}>Enviar al jurado</button>
            </div>
          ) : null}
        </form>
      </div>
    </SystemLayout>
  )
}
