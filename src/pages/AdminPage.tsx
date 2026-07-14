import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { authenticatedApiRequest, errorMessage } from '@/lib/api'
import { SystemLayout } from '@/components/system/SystemLayout'
import { StatusMessage } from '@/components/system/StatusMessage'
import { OptionalFieldLabel, RequiredFieldLabel, RequiredFieldsLegend } from '@/components/system/FormFieldLabel'
import { ecuadorDateTimeInputValue, ecuadorDateTimeToIso, effectiveSubmissionDeadline, formatEcuadorDateTime } from '@/lib/dates'
import type { AdminAction, AdminDashboardData, CreateStaffInput, RegistrationInput, RegistrationResult } from '@/types/api'
import type { Tables } from '@/types/database'

type AdminTab = 'summary' | 'event' | 'challenges' | 'teams' | 'staff' | 'assignments' | 'projects' | 'results'

interface AdminSectionProps {
  dashboard: AdminDashboardData
  mutate: (action: AdminAction) => Promise<void>
}

const tabs: { id: AdminTab; label: string }[] = [
  { id: 'summary', label: 'Resumen' },
  { id: 'event', label: 'Evento' },
  { id: 'challenges', label: 'Retos y rubrica' },
  { id: 'teams', label: 'Equipos' },
  { id: 'staff', label: 'Personas' },
  { id: 'assignments', label: 'Asignaciones' },
  { id: 'projects', label: 'Proyectos' },
  { id: 'results', label: 'Resultados' },
]

function formText(form: FormData, name: string): string {
  return String(form.get(name) ?? '').trim()
}

function localDateTime(value: string): string {
  return ecuadorDateTimeInputValue(value)
}

function optionalLocalDateTime(value: string | null): string {
  return value ? localDateTime(value) : ''
}

function optionalIsoDate(form: FormData, name: string): string | null {
  const value = formText(form, name)
  return value ? ecuadorDateTimeToIso(value) : null
}

function DashboardStat({ value, label, detail }: { value: number | string; label: string; detail: string }) {
  return <article className="system-card stat-card"><strong>{value}</strong><h2>{label}</h2><p>{detail}</p></article>
}

function SummarySection({ dashboard }: { dashboard: AdminDashboardData }) {
  const submitted = dashboard.submissions.filter((submission) => submission.status !== 'draft').length
  const published = dashboard.submissions.filter((submission) => submission.status === 'published').length
  const completedEvaluations = dashboard.evaluations.filter((evaluation) => evaluation.submitted).length

  return (
    <>
      <div className="stats-grid">
        <DashboardStat value={dashboard.teams.length} label="Equipos" detail={`${dashboard.members.length} participantes registrados`} />
        <DashboardStat value={submitted} label="Entregas" detail={`${published} publicadas en la landing`} />
        <DashboardStat value={dashboard.profiles.filter((profile) => profile.role === 'judge').length} label="Jurados" detail={`${completedEvaluations} evaluaciones completadas`} />
        <DashboardStat value={dashboard.profiles.filter((profile) => profile.role === 'mentor').length} label="Mentores" detail={`${dashboard.mentorAssignments.length} asignaciones activas`} />
      </div>
      <section className="system-card admin-note">
        <p className="system-eyebrow">Ruta operativa</p>
        <h2>Registro → construccion → entrega → evaluacion → publicacion</h2>
        <p>Los equipos solo aparecen en la vitrina publica cuando administracion cambia su entrega a <strong>publicada</strong>. Las calificaciones permanecen privadas hasta activar resultados publicos.</p>
      </section>
    </>
  )
}

function EventSection({ dashboard, mutate }: AdminSectionProps) {
  const event = dashboard.events[0]
  if (!event) return <StatusMessage kind="error">No existe un evento configurado.</StatusMessage>

  const submit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()
    const form = new FormData(submitEvent.currentTarget)
    await mutate({
      action: 'update_event',
      eventId: event.id,
      values: {
        name: formText(form, 'name'),
        tagline: formText(form, 'tagline'),
        location: formText(form, 'location'),
        starts_at: new Date(formText(form, 'startsAt')).toISOString(),
        ends_at: new Date(formText(form, 'endsAt')).toISOString(),
        registration_opens_at: optionalIsoDate(form, 'registrationOpensAt'),
        registration_closes_at: optionalIsoDate(form, 'registrationClosesAt'),
        submissions_close_at: optionalIsoDate(form, 'submissionsCloseAt'),
        scoring_opens_at: optionalIsoDate(form, 'scoringOpensAt'),
        scoring_closes_at: optionalIsoDate(form, 'scoringClosesAt'),
        registration_open: form.get('registrationOpen') === 'on',
        submissions_open: form.get('submissionsOpen') === 'on',
        scoring_open: form.get('scoringOpen') === 'on',
        results_public: form.get('resultsPublic') === 'on',
        showcase_enabled: form.get('showcaseEnabled') === 'on',
        min_team_size: Number(form.get('minTeamSize')),
        max_team_size: Number(form.get('maxTeamSize')),
      },
    })
  }

  return (
    <form className="system-card system-form admin-form" onSubmit={(submitEvent) => void submit(submitEvent)}>
      <div className="form-section-heading"><h2>Configuracion del evento</h2><p>Los limites siempre quedan acotados a un maximo absoluto de tres personas.</p></div>
      <div className="form-grid">
        <label>Nombre<input name="name" required defaultValue={event.name} /></label>
        <label>Frase corta<input name="tagline" defaultValue={event.tagline} /></label>
        <label>Ubicacion<input name="location" defaultValue={event.location} /></label>
        <label>Inicio<input name="startsAt" type="datetime-local" required defaultValue={localDateTime(event.starts_at)} /></label>
        <label>Fin<input name="endsAt" type="datetime-local" required defaultValue={localDateTime(event.ends_at)} /></label>
        <label>Apertura de registro<input name="registrationOpensAt" type="datetime-local" defaultValue={optionalLocalDateTime(event.registration_opens_at)} /></label>
        <label>Cierre de registro<input name="registrationClosesAt" type="datetime-local" defaultValue={optionalLocalDateTime(event.registration_closes_at)} /></label>
        <label>Cierre de entregas<input name="submissionsCloseAt" type="datetime-local" defaultValue={optionalLocalDateTime(event.submissions_close_at)} /></label>
        <label>Inicio de calificacion<input name="scoringOpensAt" type="datetime-local" defaultValue={optionalLocalDateTime(event.scoring_opens_at)} /></label>
        <label>Cierre de calificacion<input name="scoringClosesAt" type="datetime-local" defaultValue={optionalLocalDateTime(event.scoring_closes_at)} /></label>
        <label>Minimo por equipo<select name="minTeamSize" defaultValue={event.min_team_size}><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>
        <label>Maximo por equipo<select name="maxTeamSize" defaultValue={event.max_team_size}><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>
      </div>
      <div className="toggle-grid">
        <label><input type="checkbox" name="registrationOpen" defaultChecked={event.registration_open} /> Registro abierto</label>
        <label><input type="checkbox" name="submissionsOpen" defaultChecked={event.submissions_open} /> Entregas abiertas</label>
        <label><input type="checkbox" name="scoringOpen" defaultChecked={event.scoring_open} /> Calificacion abierta</label>
        <label><input type="checkbox" name="showcaseEnabled" defaultChecked={event.showcase_enabled} /> Vitrina habilitada</label>
        <label><input type="checkbox" name="resultsPublic" defaultChecked={event.results_public} /> Resultados publicos</label>
      </div>
      <button className="system-button system-button-primary" type="submit">Guardar configuracion</button>
    </form>
  )
}

function ChallengeEditor({ challenge, globalDeadline, mutate }: { challenge: Tables<'challenges'>; globalDeadline: string | null; mutate: AdminSectionProps['mutate'] }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const capacity = formText(form, 'maxTeams')
    await mutate({
      action: 'update_challenge',
      challengeId: challenge.id,
      title: formText(form, 'title'),
      description: formText(form, 'description'),
      requirements: formText(form, 'requirements'),
      active: form.get('active') === 'on',
      maxTeams: capacity ? Number(capacity) : null,
      submissionDeadlineAt: ecuadorDateTimeToIso(formText(form, 'submissionDeadlineAt')),
    })
  }

  return (
    <form className="system-card system-form inline-editor" onSubmit={(event) => void submit(event)}>
      <div className="editor-heading"><strong>Reto</strong><label className="inline-toggle"><input type="checkbox" name="active" defaultChecked={challenge.active} /> Activo</label></div>
      <label>Titulo<input name="title" required defaultValue={challenge.title} /></label>
      <label>Descripcion<textarea name="description" required rows={3} defaultValue={challenge.description} /></label>
      <label>Requisitos<textarea name="requirements" rows={2} defaultValue={challenge.requirements} /></label>
      <label>Cupo de equipos<input name="maxTeams" type="number" min="1" placeholder="Sin limite" defaultValue={challenge.max_teams ?? ''} /></label>
      <label>Deadline en America/Guayaquil (UTC-5)<input name="submissionDeadlineAt" type="datetime-local" required defaultValue={localDateTime(challenge.submission_deadline_at)} /></label>
      <small>Corte efectivo actual: {formatEcuadorDateTime(effectiveSubmissionDeadline(challenge.submission_deadline_at, globalDeadline))}</small>
      <button className="system-button" type="submit">Actualizar reto</button>
    </form>
  )
}

function CriterionEditor({ criterion, mutate }: { criterion: Tables<'evaluation_criteria'>; mutate: AdminSectionProps['mutate'] }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await mutate({
      action: 'update_criterion',
      criterionId: criterion.id,
      name: formText(form, 'name'),
      description: formText(form, 'description'),
      maxScore: Number(form.get('maxScore')),
      weight: Number(form.get('weight')),
      active: form.get('active') === 'on',
    })
  }

  return (
    <form className="system-card system-form inline-editor" onSubmit={(event) => void submit(event)}>
      <div className="editor-heading"><strong>Criterio</strong><label className="inline-toggle"><input type="checkbox" name="active" defaultChecked={criterion.active} /> Activo</label></div>
      <label>Nombre<input name="name" required defaultValue={criterion.name} /></label>
      <label>Descripcion<textarea name="description" required rows={3} defaultValue={criterion.description} /></label>
      <div className="form-grid"><label>Puntaje maximo<input name="maxScore" type="number" min="1" max="100" step="0.01" defaultValue={criterion.max_score} /></label><label>Peso<input name="weight" type="number" min="0.1" max="100" step="0.1" defaultValue={criterion.weight} /></label></div>
      <button className="system-button" type="submit">Actualizar criterio</button>
    </form>
  )
}

function ChallengesSection({ dashboard, mutate }: AdminSectionProps) {
  const event = dashboard.events[0]
  if (!event) return null

  const createChallenge = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()
    const form = new FormData(submitEvent.currentTarget)
    const capacity = formText(form, 'maxTeams')
    await mutate({ action: 'create_challenge', eventId: event.id, title: formText(form, 'title'), description: formText(form, 'description'), requirements: formText(form, 'requirements'), maxTeams: capacity ? Number(capacity) : null, submissionDeadlineAt: ecuadorDateTimeToIso(formText(form, 'submissionDeadlineAt')) })
    submitEvent.currentTarget.reset()
  }

  const createCriterion = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()
    const form = new FormData(submitEvent.currentTarget)
    await mutate({ action: 'create_criterion', eventId: event.id, name: formText(form, 'name'), description: formText(form, 'description'), maxScore: Number(form.get('maxScore')), weight: Number(form.get('weight')) })
    submitEvent.currentTarget.reset()
  }

  const activeMaxScore = dashboard.criteria.filter((criterion) => criterion.active).reduce((total, criterion) => total + criterion.max_score * criterion.weight, 0)

  return (
    <div className="admin-stack">
      <section><div className="admin-section-heading"><div><p className="system-eyebrow">Construccion</p><h2>Retos</h2></div><span>{dashboard.challenges.filter((challenge) => challenge.active).length} activos</span></div><div className="editor-grid">{dashboard.challenges.map((challenge) => <ChallengeEditor key={challenge.id} challenge={challenge} globalDeadline={event.submissions_close_at} mutate={mutate} />)}</div></section>
      <form className="system-card system-form create-row" onSubmit={(event) => void createChallenge(event)}><h3>Crear reto</h3><label>Titulo<input name="title" required /></label><label>Descripcion<textarea name="description" required rows={2} /></label><label>Requisitos<textarea name="requirements" rows={2} /></label><label>Cupo<input name="maxTeams" type="number" min="1" /></label><label>Deadline en America/Guayaquil (UTC-5)<input name="submissionDeadlineAt" type="datetime-local" required defaultValue={optionalLocalDateTime(event.submissions_close_at ?? event.ends_at)} /></label><button className="system-button system-button-primary" type="submit">Agregar</button></form>
      <section><div className="admin-section-heading"><div><p className="system-eyebrow">Evaluacion dinamica</p><h2>Rubrica del jurado</h2></div><span>Maximo ponderado {activeMaxScore}</span></div><div className="editor-grid">{dashboard.criteria.map((criterion) => <CriterionEditor key={criterion.id} criterion={criterion} mutate={mutate} />)}</div></section>
      <form className="system-card system-form create-row" onSubmit={(event) => void createCriterion(event)}><h3>Crear criterio</h3><label>Nombre<input name="name" required /></label><label>Descripcion<textarea name="description" required rows={2} /></label><label>Maximo<input name="maxScore" type="number" min="1" max="100" defaultValue="10" /></label><label>Peso<input name="weight" type="number" min="0.1" max="100" step="0.1" defaultValue="1" /></label><button className="system-button system-button-primary" type="submit">Agregar</button></form>
    </div>
  )
}

function ManualTeamForm({ dashboard, reload }: { dashboard: AdminDashboardData; reload: () => Promise<void> }) {
  const event = dashboard.events[0]
  const [message, setMessage] = useState('')
  if (!event) return null

  const submit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()
    const form = new FormData(submitEvent.currentTarget)
    const email = formText(form, 'email')
    const phone = formText(form, 'phone')
    const city = formText(form, 'city')
    const input: RegistrationInput = {
      eventId: event.id,
      teamName: formText(form, 'teamName'),
      organization: formText(form, 'organization'),
      city,
      contactEmail: email,
      contactPhone: phone,
      challengeId: formText(form, 'challengeId'),
      members: [{ fullName: formText(form, 'fullName'), email, phone, city, memberRole: formText(form, 'memberRole'), isPrimaryContact: true }],
      website: '',
    }
    try {
      const created = await authenticatedApiRequest<RegistrationResult>('/api/registrations', { method: 'POST', body: JSON.stringify(input) })
      setMessage(`Equipo creado. Codigo: ${created.registrationCode}`)
      submitEvent.currentTarget.reset()
      await reload()
    } catch (error) {
      setMessage(errorMessage(error))
    }
  }

  return (
    <form className="system-card system-form admin-form" onSubmit={(event) => void submit(event)}>
      <div className="form-section-heading"><h2>Crear equipo manualmente</h2><p>Registra el contacto principal; luego puedes agregar hasta dos participantes adicionales.</p></div>
      <RequiredFieldsLegend />
      {message ? <StatusMessage>{message}</StatusMessage> : null}
      <div className="form-grid">
        <label><RequiredFieldLabel>Nombre del equipo</RequiredFieldLabel><input name="teamName" required /></label><label><OptionalFieldLabel>Organizacion o comunidad</OptionalFieldLabel><input name="organization" /></label>
        <label><RequiredFieldLabel>Nombre del contacto</RequiredFieldLabel><input name="fullName" required /></label><label><RequiredFieldLabel>Correo</RequiredFieldLabel><input name="email" type="email" required /></label>
        <label><RequiredFieldLabel>WhatsApp o telefono</RequiredFieldLabel><input name="phone" type="tel" required /></label><label><RequiredFieldLabel>Ciudad</RequiredFieldLabel><input name="city" defaultValue="Manta" required /></label>
        <label><OptionalFieldLabel>Rol o fortaleza</OptionalFieldLabel><input name="memberRole" /></label><label><RequiredFieldLabel>Reto</RequiredFieldLabel><select name="challengeId" required defaultValue=""><option value="" disabled>Selecciona un reto</option>{dashboard.challenges.filter((challenge) => challenge.active).map((challenge) => <option key={challenge.id} value={challenge.id}>{challenge.title}</option>)}</select></label>
      </div>
      <button className="system-button system-button-primary" type="submit">Crear equipo</button>
    </form>
  )
}

function TeamsSection({ dashboard, mutate, reload }: AdminSectionProps & { reload: () => Promise<void> }) {
  const [selectedTeamId, setSelectedTeamId] = useState(dashboard.teams[0]?.id ?? '')
  const selectedTeam = dashboard.teams.find((team) => team.id === selectedTeamId)

  const addMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedTeam) return
    const form = new FormData(event.currentTarget)
    await mutate({ action: 'add_member', teamId: selectedTeam.id, eventId: selectedTeam.event_id, fullName: formText(form, 'fullName'), email: formText(form, 'email'), phone: formText(form, 'phone'), city: formText(form, 'city'), memberRole: formText(form, 'memberRole') })
    event.currentTarget.reset()
  }

  return (
    <div className="admin-stack">
      <ManualTeamForm dashboard={dashboard} reload={reload} />
      <section className="system-card table-card"><div className="admin-section-heading"><div><p className="system-eyebrow">Correo de confirmacion</p><h2>Outbox de registros</h2></div><span>{dashboard.registrationEmailOutbox.filter((item) => item.status === 'sent').length}/{dashboard.registrationEmailOutbox.length} enviados</span></div><div className="responsive-table"><table><thead><tr><th>Equipo</th><th>Estado</th><th>Intentos</th><th>Proximo intento</th><th>Accion</th></tr></thead><tbody>{dashboard.registrationEmailOutbox.map((item) => <tr key={item.id}><td>{dashboard.teams.find((team) => team.id === item.team_id)?.name ?? 'Equipo'}</td><td><span className={`status-pill status-${item.status}`}>{item.status}</span>{item.last_error_code ? <small>{item.last_error_code}</small> : null}</td><td>{item.attempts}</td><td>{formatEcuadorDateTime(item.next_attempt_at)}</td><td>{item.status !== 'sent' ? <button className="system-link-button" type="button" onClick={() => void mutate({ action: 'retry_registration_email', outboxId: item.id })}>Reintentar</button> : formatEcuadorDateTime(item.sent_at)}</td></tr>)}</tbody></table></div></section>
      <section className="system-card table-card"><div className="admin-section-heading"><div><p className="system-eyebrow">Registro</p><h2>Equipos y participantes</h2></div><span>{dashboard.teams.length} equipos</span></div><div className="responsive-table"><table><thead><tr><th>Equipo</th><th>Reto</th><th>Integrantes</th><th>Contacto</th><th>Estado</th></tr></thead><tbody>{dashboard.teams.map((team) => {
        const teamChallenge = dashboard.teamChallenges.find((item) => item.team_id === team.id)
        const challenge = dashboard.challenges.find((item) => item.id === teamChallenge?.challenge_id)
        const memberCount = dashboard.members.filter((member) => member.team_id === team.id).length
        return <tr key={team.id}><td><strong>{team.name}</strong><small>{team.city}</small></td><td>{challenge?.title ?? 'Sin reto'}</td><td>{memberCount}/3</td><td>{team.contact_email}</td><td><select value={team.status} onChange={(event) => void mutate({ action: 'set_team_status', teamId: team.id, status: event.target.value as Tables<'teams'>['status'] })}><option value="registered">Registrado</option><option value="active">Activo</option><option value="withdrawn">Retirado</option><option value="disqualified">Descalificado</option></select></td></tr>
      })}</tbody></table></div></section>
      <form className="system-card system-form create-row" onSubmit={(event) => void addMember(event)}><h3>Agregar participante</h3><label>Equipo<select value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)}>{dashboard.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label>Nombre<input name="fullName" required /></label><label>Correo<input name="email" type="email" required /></label><label>Telefono<input name="phone" required /></label><label>Ciudad<input name="city" required /></label><label>Rol<input name="memberRole" /></label><button className="system-button system-button-primary" type="submit">Agregar</button></form>
    </div>
  )
}

function StaffSection({ dashboard, reload }: { dashboard: AdminDashboardData; reload: () => Promise<void> }) {
  const [message, setMessage] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input: CreateStaffInput = { fullName: formText(form, 'fullName'), email: formText(form, 'email'), password: formText(form, 'password'), role: formText(form, 'role') as CreateStaffInput['role'] }
    try {
      await authenticatedApiRequest('/api/admin/staff', { method: 'POST', body: JSON.stringify(input) })
      setMessage('Usuario creado correctamente.')
      event.currentTarget.reset()
      await reload()
    } catch (error) { setMessage(errorMessage(error)) }
  }

  return <div className="admin-stack"><form className="system-card system-form admin-form" onSubmit={(event) => void submit(event)}><div className="form-section-heading"><h2>Crear administrador, jurado o mentor</h2><p>La contrasena se entrega por un canal seguro y debe cambiarse segun la politica del evento.</p></div>{message ? <StatusMessage>{message}</StatusMessage> : null}<div className="form-grid"><label>Nombre<input name="fullName" required /></label><label>Correo<input name="email" type="email" required /></label><label>Rol<select name="role"><option value="judge">Jurado</option><option value="mentor">Mentor</option><option value="admin">Administrador</option></select></label><label>Contrasena temporal<input name="password" type="password" minLength={10} required /></label></div><button className="system-button system-button-primary" type="submit">Crear usuario</button></form><section className="system-card table-card"><div className="admin-section-heading"><h2>Equipo operativo</h2><span>{dashboard.profiles.length} personas</span></div><div className="responsive-table"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th></tr></thead><tbody>{dashboard.profiles.map((profile) => <tr key={profile.id}><td>{profile.full_name}</td><td>{profile.email}</td><td>{profile.role}</td><td>{profile.active ? 'Activo' : 'Inactivo'}</td></tr>)}</tbody></table></div></section></div>
}

function AssignmentsSection({ dashboard, mutate }: AdminSectionProps) {
  const event = dashboard.events[0]
  if (!event) return null
  const judges = dashboard.profiles.filter((profile) => profile.role === 'judge' && profile.active)
  const mentors = dashboard.profiles.filter((profile) => profile.role === 'mentor' && profile.active)
  const assignJudge = async (submitEvent: FormEvent<HTMLFormElement>) => { submitEvent.preventDefault(); const form = new FormData(submitEvent.currentTarget); await mutate({ action: 'assign_judge', eventId: event.id, judgeId: formText(form, 'judgeId'), teamId: formText(form, 'teamId') }) }
  const assignMentor = async (submitEvent: FormEvent<HTMLFormElement>) => { submitEvent.preventDefault(); const form = new FormData(submitEvent.currentTarget); await mutate({ action: 'assign_mentor', eventId: event.id, mentorId: formText(form, 'mentorId'), teamId: formText(form, 'teamId'), notes: formText(form, 'notes') }) }
  const profileName = (id: string) => dashboard.profiles.find((profile) => profile.id === id)?.full_name ?? 'Perfil no disponible'
  const teamName = (id: string) => dashboard.teams.find((team) => team.id === id)?.name ?? 'Equipo no disponible'

  return <div className="assignment-grid"><form className="system-card system-form admin-form" onSubmit={(event) => void assignJudge(event)}><h2>Asignar jurado</h2><label>Jurado<select name="judgeId" required>{judges.map((judge) => <option key={judge.id} value={judge.id}>{judge.full_name}</option>)}</select></label><label>Equipo<select name="teamId" required>{dashboard.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><button className="system-button system-button-primary" type="submit">Asignar</button><ul className="assignment-list">{dashboard.judgeAssignments.map((assignment) => <li key={assignment.id}><span>{profileName(assignment.judge_id)} → {teamName(assignment.team_id)}</span><button type="button" onClick={() => void mutate({ action: 'remove_judge_assignment', assignmentId: assignment.id })}>Quitar</button></li>)}</ul></form><form className="system-card system-form admin-form" onSubmit={(event) => void assignMentor(event)}><h2>Asignar mentor</h2><label>Mentor<select name="mentorId" required>{mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.full_name}</option>)}</select></label><label>Equipo<select name="teamId" required>{dashboard.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label>Notas<textarea name="notes" rows={3} /></label><button className="system-button system-button-primary" type="submit">Asignar</button><ul className="assignment-list">{dashboard.mentorAssignments.map((assignment) => <li key={assignment.id}><span>{profileName(assignment.mentor_id)} → {teamName(assignment.team_id)}</span><button type="button" onClick={() => void mutate({ action: 'remove_mentor_assignment', assignmentId: assignment.id })}>Quitar</button></li>)}</ul></form></div>
}

function ProjectsSection({ dashboard, mutate }: AdminSectionProps) {
  const teamName = (teamId: string) => dashboard.teams.find((team) => team.id === teamId)?.name ?? 'Equipo'
  return <section className="system-card table-card"><div className="admin-section-heading"><div><p className="system-eyebrow">Entregas</p><h2>Proyectos y vitrina</h2></div><span>Publica solo entregas verificadas</span></div><div className="responsive-table"><table><thead><tr><th>Equipo / proyecto</th><th>Descripcion</th><th>Enlaces</th><th>Ultimo envio</th><th>Estado</th><th>Accion</th></tr></thead><tbody>{dashboard.submissions.map((submission) => <tr key={submission.id}><td><strong>{teamName(submission.team_id)}</strong><small>{submission.project_name || 'Sin nombre'}</small></td><td>{submission.short_description || 'Borrador incompleto'}</td><td><div className="table-links">{submission.demo_url ? <a href={submission.demo_url} target="_blank" rel="noreferrer">Demo</a> : null}{submission.repository_url ? <a href={submission.repository_url} target="_blank" rel="noreferrer">Codigo</a> : null}</div></td><td>{formatEcuadorDateTime(submission.submitted_at)}</td><td><span className={`status-pill status-${submission.status}`}>{submission.status}</span></td><td><select value={submission.status} onChange={(event) => void mutate({ action: 'set_submission_status', submissionId: submission.id, status: event.target.value as Tables<'project_submissions'>['status'] })}><option value="draft">Borrador</option><option value="submitted">Enviado</option><option value="published">Publicado</option></select></td></tr>)}</tbody></table></div></section>
}

function ResultsSection({ dashboard }: { dashboard: AdminDashboardData }) {
  const activeCriteria = dashboard.criteria.filter((criterion) => criterion.active)
  const maximum = activeCriteria.reduce((total, criterion) => total + criterion.max_score * criterion.weight, 0)
  const ranking = dashboard.teams.map((team) => {
    const evaluations = dashboard.evaluations.filter((evaluation) => evaluation.team_id === team.id && evaluation.submitted)
    const percentages = evaluations.map((evaluation) => {
      const scoreTotal = dashboard.scores.filter((score) => score.evaluation_id === evaluation.id).reduce((total, score) => {
        const criterion = activeCriteria.find((item) => item.id === score.criterion_id)
        return total + score.score * (criterion?.weight ?? 0)
      }, 0)
      return maximum > 0 ? (scoreTotal / maximum) * 100 : 0
    })
    const average = percentages.length > 0 ? percentages.reduce((total, value) => total + value, 0) / percentages.length : 0
    return { team, average, evaluationCount: evaluations.length }
  }).sort((left, right) => right.average - left.average)

  return <section className="system-card table-card"><div className="admin-section-heading"><div><p className="system-eyebrow">Vista privada</p><h2>Ranking por promedio ponderado</h2></div><span>{dashboard.events[0]?.results_public ? 'Resultados publicos' : 'Resultados privados'}</span></div><div className="responsive-table"><table><thead><tr><th>Posicion</th><th>Equipo</th><th>Promedio</th><th>Evaluaciones</th></tr></thead><tbody>{ranking.map((item, index) => <tr key={item.team.id}><td>#{index + 1}</td><td><strong>{item.team.name}</strong></td><td>{item.average.toFixed(2)}%</td><td>{item.evaluationCount}</td></tr>)}</tbody></table></div></section>
}

export function AdminPage() {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null)
  const [tab, setTab] = useState<AdminTab>('summary')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')

  const loadDashboard = useCallback(async () => {
    try {
      setDashboard(await authenticatedApiRequest<AdminDashboardData>('/api/admin/dashboard'))
      setMessage('')
    } catch (error) { setMessage(errorMessage(error)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void loadDashboard() }, [loadDashboard])

  const mutate = async (action: AdminAction) => {
    setMessage(''); setSuccess('')
    try {
      await authenticatedApiRequest('/api/admin/manage', { method: 'POST', body: JSON.stringify(action) })
      setSuccess('Cambio guardado correctamente.')
      await loadDashboard()
    } catch (error) { setMessage(errorMessage(error)) }
  }

  const content = useMemo<ReactNode>(() => {
    if (!dashboard) return null
    switch (tab) {
      case 'summary': return <SummarySection dashboard={dashboard} />
      case 'event': return <EventSection dashboard={dashboard} mutate={mutate} />
      case 'challenges': return <ChallengesSection dashboard={dashboard} mutate={mutate} />
      case 'teams': return <TeamsSection dashboard={dashboard} mutate={mutate} reload={loadDashboard} />
      case 'staff': return <StaffSection dashboard={dashboard} reload={loadDashboard} />
      case 'assignments': return <AssignmentsSection dashboard={dashboard} mutate={mutate} />
      case 'projects': return <ProjectsSection dashboard={dashboard} mutate={mutate} />
      case 'results': return <ResultsSection dashboard={dashboard} />
      default: { const exhaustiveCheck: never = tab; return exhaustiveCheck }
    }
  }, [dashboard, tab, loadDashboard])

  if (loading) return <SystemLayout eyebrow="Organizacion" title="Centro de control"><StatusMessage>Cargando el sistema...</StatusMessage></SystemLayout>
  if (!dashboard) return <SystemLayout eyebrow="Organizacion" title="Centro de control"><StatusMessage kind="error">{message || 'No fue posible cargar el panel.'}</StatusMessage><Link className="system-button" to="/login">Iniciar sesion</Link></SystemLayout>

  return (
    <SystemLayout eyebrow="Organizacion" title="Centro de control" profile={dashboard.profile}>
      <nav className="admin-tabs" aria-label="Secciones de administracion">{tabs.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} type="button" onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
      {message ? <StatusMessage kind="error">{message}</StatusMessage> : null}
      {success ? <StatusMessage kind="success">{success}</StatusMessage> : null}
      <div className="admin-content">{content}</div>
    </SystemLayout>
  )
}
