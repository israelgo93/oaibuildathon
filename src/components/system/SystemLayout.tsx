import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import type { AuthenticatedProfile } from '@/types/api'
import { getBrowserSupabase } from '@/lib/supabase'

interface SystemLayoutProps {
  title: string
  eyebrow: string
  children: ReactNode
  profile?: AuthenticatedProfile
}

const roleNavigation = {
  admin: [{ to: '/admin', label: 'Administracion' }],
  judge: [{ to: '/jurado', label: 'Jurado' }],
  mentor: [{ to: '/mentor', label: 'Mentoria' }],
} as const

export function SystemLayout({ title, eyebrow, children, profile }: SystemLayoutProps) {
  const navigate = useNavigate()

  const signOut = async () => {
    await getBrowserSupabase().auth.signOut()
    navigate('/login', { replace: true })
  }

  const navigation = profile ? roleNavigation[profile.role] : []

  return (
    <div className="system-page">
      <header className="system-header">
        <Link className="system-brand" to="/" aria-label="Volver a OpenAI Build Week Manta">
          <span>OAI</span>
          <strong>Build Week Manta</strong>
        </Link>
        <nav aria-label="Navegacion del sistema">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to}>{item.label}</NavLink>
          ))}
          <Link to="/equipo">Portal de equipo</Link>
          {profile ? <button type="button" className="system-link-button" onClick={() => void signOut()}>Cerrar sesion</button> : null}
        </nav>
      </header>
      <main className="system-main">
        <div className="system-titlebar">
          <div>
            <p className="system-eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          {profile ? <p className="system-profile">{profile.fullName}<span>{profile.role}</span></p> : null}
        </div>
        {children}
      </main>
      <footer className="system-footer">
        <span>OpenAI Build Week Manta</span>
        <Link to="/">Volver a la landing</Link>
      </footer>
    </div>
  )
}
