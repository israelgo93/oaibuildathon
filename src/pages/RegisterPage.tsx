import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest, errorMessage } from '@/lib/api'
import { SystemLayout } from '@/components/system/SystemLayout'
import { StatusMessage } from '@/components/system/StatusMessage'
import { ChallengeThemes } from '@/components/system/ChallengeThemes'
import { OptionalFieldLabel, RequiredFieldLabel, RequiredFieldsLegend } from '@/components/system/FormFieldLabel'
import { effectiveSubmissionDeadline, formatEcuadorDateTime } from '@/lib/dates'
import type { PublicEventConfig, RegistrationInput, RegistrationMemberInput, RegistrationResult } from '@/types/api'

const emptyMember = (isPrimaryContact: boolean): RegistrationMemberInput => ({
  fullName: '',
  email: '',
  phone: '',
  city: '',
  memberRole: '',
  isPrimaryContact,
})

function TurnstileWidget() {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim()

  useEffect(() => {
    if (!siteKey || document.querySelector('script[data-buildathon-turnstile]')) return
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    script.dataset.buildathonTurnstile = 'true'
    document.head.appendChild(script)
  }, [siteKey])

  return siteKey ? <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" /> : null
}

export function RegisterPage() {
  const [config, setConfig] = useState<PublicEventConfig | null>(null)
  const [members, setMembers] = useState<RegistrationMemberInput[]>([emptyMember(true)])
  const [challengeId, setChallengeId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<RegistrationResult | null>(null)

  useEffect(() => {
    apiRequest<PublicEventConfig>('/api/public-config')
      .then((data) => {
        setConfig(data)
        setChallengeId('')
      })
      .catch((error: unknown) => setMessage(errorMessage(error)))
      .finally(() => setLoading(false))
  }, [])

  const updateMember = (index: number, values: Partial<RegistrationMemberInput>) => {
    setMembers((current) => current.map((member, memberIndex) => (
      memberIndex === index ? { ...member, ...values } : member
    )))
  }

  const addMember = () => {
    const maxTeamSize = Math.min(config?.event.max_team_size ?? 3, 3)
    if (members.length < maxTeamSize) setMembers((current) => [...current, emptyMember(false)])
  }

  const removeMember = (index: number) => {
    if (index === 0) return
    setMembers((current) => current.filter((_, memberIndex) => memberIndex !== index))
  }

  const submitRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!config) return
    setSubmitting(true)
    setMessage('')
    const form = new FormData(event.currentTarget)
    const primaryMember = members[0]

    if (!primaryMember) {
      setMessage('Agrega al menos un participante')
      setSubmitting(false)
      return
    }

    const input: RegistrationInput = {
      eventId: config.event.id,
      teamName: String(form.get('teamName') ?? ''),
      organization: String(form.get('organization') ?? ''),
      city: String(form.get('teamCity') ?? ''),
      contactEmail: primaryMember.email,
      contactPhone: primaryMember.phone,
      challengeId,
      members,
      website: String(form.get('website') ?? ''),
      turnstileToken: String(form.get('cf-turnstile-response') ?? '') || undefined,
    }

    try {
      const registrationResult = await apiRequest<RegistrationResult>('/api/registrations', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      setResult(registrationResult)
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <SystemLayout eyebrow="Registro completado" title={`Bienvenido, ${result.teamName}`}>
        <section className="system-card success-card">
          <span className="success-orbit" aria-hidden="true">✓</span>
          <h2>El equipo ya esta en orbita.</h2>
          <p>Guarda este codigo. Junto con el correo del contacto principal permite recuperar el acceso al portal.</p>
          <strong className="registration-code">{result.registrationCode}</strong>
          <div className="system-actions">
            <Link className="system-button system-button-primary" to="/equipo">Completar el proyecto</Link>
            <Link className="system-button" to="/">Volver a la landing</Link>
          </div>
        </section>
      </SystemLayout>
    )
  }

  return (
    <SystemLayout eyebrow="Registro global" title="Registra tu equipo">
      <div className="system-intro">
        <p>Una sola persona registra al equipo completo. Pueden participar individualmente, en pareja o en un grupo de hasta tres builders.</p>
        <Link to="/equipo">Ya tengo un codigo de equipo</Link>
      </div>
      {loading ? <StatusMessage>Cargando la configuracion del evento...</StatusMessage> : null}
      {message ? <StatusMessage kind="error">{message}</StatusMessage> : null}
      {config && !config.event.registration_open ? <StatusMessage kind="info">El registro esta cerrado por el momento.</StatusMessage> : null}
      {config && config.event.registration_open ? (
        <form className="system-form registration-form" onSubmit={(event) => void submitRegistration(event)}>
          <RequiredFieldsLegend />
          <section className="system-card form-section">
            <div className="section-number">01</div>
            <div className="form-section-heading">
              <h2>Identidad del equipo</h2>
              <p>Esta informacion se usara en el panel, las demos y la vitrina publica.</p>
            </div>
            <div className="form-grid">
              <label><RequiredFieldLabel>Nombre del equipo</RequiredFieldLabel><input name="teamName" required maxLength={80} /></label>
              <label><OptionalFieldLabel>Organizacion o comunidad</OptionalFieldLabel><input name="organization" maxLength={120} /></label>
              <label><RequiredFieldLabel>Ciudad base</RequiredFieldLabel><input name="teamCity" required maxLength={80} defaultValue={config.event.location.split(',')[0]?.trim() ?? ''} /></label>
            </div>
            <label className="honeypot" aria-hidden="true">Sitio web<input name="website" tabIndex={-1} autoComplete="off" /></label>
          </section>

          <section className="system-card form-section">
            <div className="section-number">02</div>
            <div className="form-section-heading">
              <h2>Participantes</h2>
              <p>El primer participante sera el contacto principal y administrara la entrega.</p>
            </div>
            <div className="member-list">
              {members.map((member, index) => (
                <fieldset className="member-card" key={`member-${index + 1}`}>
                  <legend>{index === 0 ? 'Contacto principal' : `Participante ${index + 1}`}</legend>
                  {index > 0 ? <button className="remove-member" type="button" onClick={() => removeMember(index)}>Quitar</button> : null}
                  <div className="form-grid">
                    <label><RequiredFieldLabel>Nombre completo</RequiredFieldLabel><input required maxLength={120} value={member.fullName} onChange={(event) => updateMember(index, { fullName: event.target.value })} /></label>
                    <label><RequiredFieldLabel>Correo</RequiredFieldLabel><input required type="email" maxLength={254} value={member.email} onChange={(event) => updateMember(index, { email: event.target.value })} /></label>
                    <label><RequiredFieldLabel>WhatsApp o telefono</RequiredFieldLabel><input required type="tel" maxLength={30} value={member.phone} onChange={(event) => updateMember(index, { phone: event.target.value })} /></label>
                    <label><RequiredFieldLabel>Ciudad</RequiredFieldLabel><input required maxLength={80} value={member.city} onChange={(event) => updateMember(index, { city: event.target.value })} /></label>
                    <label><OptionalFieldLabel>Rol o fortaleza</OptionalFieldLabel><input maxLength={80} placeholder="Desarrollo, diseno, producto..." value={member.memberRole} onChange={(event) => updateMember(index, { memberRole: event.target.value })} /></label>
                  </div>
                </fieldset>
              ))}
            </div>
            {members.length < Math.min(config.event.max_team_size, 3) ? (
              <button className="system-button" type="button" onClick={addMember}>+ Agregar participante</button>
            ) : null}
          </section>

          <section className="system-card form-section">
            <div className="section-number">03</div>
            <fieldset className="challenge-fieldset" aria-required="true">
              <legend><RequiredFieldLabel>Elige un reto</RequiredFieldLabel></legend>
              <p>El reto define el contexto de construccion; podras explicar la solucion en la entrega.</p>
              <div className="challenge-grid">
                {config.challenges.map((challenge) => (
                  <label className={`challenge-option${challengeId === challenge.id ? ' selected' : ''}`} key={challenge.id}>
                    <input required type="radio" name="challenge" value={challenge.id} checked={challengeId === challenge.id} onChange={() => setChallengeId(challenge.id)} />
                    <strong>{challenge.title}</strong>
                    <span>{challenge.description}</span>
                    <ChallengeThemes thematicAxes={challenge.thematic_axes} suggestedTopics={challenge.suggested_topics} compact />
                    {challenge.requirements ? <small><strong>Requisito:</strong> {challenge.requirements}</small> : null}
                    <small><strong>Entrega:</strong> {formatEcuadorDateTime(effectiveSubmissionDeadline(challenge.submission_deadline_at, config.event.submissions_close_at))}</small>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <TurnstileWidget />
          <div className="form-submit-row">
            <p>Al registrar confirmas que los datos del equipo son correctos y que una sola persona gestiona este registro.</p>
            <button className="system-button system-button-primary" type="submit" disabled={submitting || !challengeId}>
              {submitting ? 'Registrando...' : 'Registrar equipo'}
            </button>
          </div>
        </form>
      ) : null}
    </SystemLayout>
  )
}
