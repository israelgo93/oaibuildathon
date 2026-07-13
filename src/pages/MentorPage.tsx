import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authenticatedApiRequest, errorMessage } from '@/lib/api'
import { SystemLayout } from '@/components/system/SystemLayout'
import { StatusMessage } from '@/components/system/StatusMessage'
import type { MentorDashboardData } from '@/types/api'

export function MentorPage() {
  const [dashboard, setDashboard] = useState<MentorDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    authenticatedApiRequest<MentorDashboardData>('/api/mentor/dashboard')
      .then(setDashboard)
      .catch((error: unknown) => setMessage(errorMessage(error)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <SystemLayout eyebrow="Mentoria" title="Equipos asignados"><StatusMessage>Cargando equipos...</StatusMessage></SystemLayout>
  if (!dashboard) return <SystemLayout eyebrow="Mentoria" title="Equipos asignados"><StatusMessage kind="error">{message || 'No fue posible cargar el panel.'}</StatusMessage><Link className="system-button" to="/login">Iniciar sesion</Link></SystemLayout>

  return (
    <SystemLayout eyebrow={dashboard.event.name} title="Acompanamiento de equipos" profile={dashboard.profile}>
      {dashboard.teams.length === 0 ? <section className="system-card empty-state"><h2>Aun no tienes equipos asignados.</h2><p>Las asignaciones se administran desde el centro de control.</p></section> : <div className="mentor-grid">{dashboard.teams.map((item) => <article className="system-card mentor-card" key={item.assignmentId}><div className="mentor-card-heading"><div><p className="system-eyebrow">{item.challenge?.title ?? 'Reto'}</p><h2>{item.team.name}</h2></div><span className={`status-pill status-${item.submission?.status ?? 'draft'}`}>{item.submission?.status ?? 'draft'}</span></div><p>{item.challenge?.description}</p><h3>Builders</h3><ul className="member-summary">{item.members.map((member) => <li key={member.id}><strong>{member.full_name}</strong><span>{member.member_role || 'Builder'} · {member.email}</span></li>)}</ul>{item.submission?.short_description ? <div className="mentor-project"><h3>{item.submission.project_name}</h3><p>{item.submission.short_description}</p><div className="table-links">{item.submission.demo_url ? <a href={item.submission.demo_url} target="_blank" rel="noreferrer">Demo</a> : null}{item.submission.repository_url ? <a href={item.submission.repository_url} target="_blank" rel="noreferrer">Codigo</a> : null}</div></div> : <StatusMessage>El equipo aun no completo su entrega.</StatusMessage>}{item.notes ? <aside className="mentor-notes"><strong>Notas de organizacion</strong><p>{item.notes}</p></aside> : null}</article>)}</div>}
    </SystemLayout>
  )
}
