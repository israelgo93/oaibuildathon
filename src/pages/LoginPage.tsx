import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { SystemLayout } from '@/components/system/SystemLayout'
import { StatusMessage } from '@/components/system/StatusMessage'
import { errorMessage } from '@/lib/api'
import { getBrowserSupabase } from '@/lib/supabase'
import type { UserRole } from '@/types/database'

function readRole(value: unknown): UserRole | null {
  if (value === 'admin' || value === 'judge' || value === 'mentor') return value
  return null
}

function routeForRole(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'judge':
      return '/jurado'
    case 'mentor':
      return '/mentor'
    default: {
      const exhaustiveCheck: never = role
      return exhaustiveCheck
    }
  }
}

export function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    try {
      void getBrowserSupabase().auth.getSession().then(({ data }) => {
        const role = readRole(data.session?.user.app_metadata.role)
        if (role) navigate(routeForRole(role), { replace: true })
      })
    } catch {
      // El formulario mostrara el error de configuracion cuando se intente ingresar.
    }
  }, [navigate])

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    const form = new FormData(event.currentTarget)

    try {
      const { data, error } = await getBrowserSupabase().auth.signInWithPassword({
        email: String(form.get('email') ?? '').trim().toLowerCase(),
        password: String(form.get('password') ?? ''),
      })
      if (error) throw error
      const role = readRole(data.user.app_metadata.role)
      if (!role) {
        await getBrowserSupabase().auth.signOut()
        throw new Error('El usuario no tiene un rol habilitado')
      }
      navigate(routeForRole(role), { replace: true })
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SystemLayout eyebrow="Acceso interno" title="Administracion y evaluacion">
      <div className="auth-layout">
        <form className="system-card system-form auth-card" onSubmit={(event) => void login(event)}>
          <h2>Iniciar sesion</h2>
          <p>Acceso exclusivo para organizacion, jurado y mentores.</p>
          {message ? <StatusMessage kind="error">{message}</StatusMessage> : null}
          <label>Correo<input name="email" type="email" autoComplete="email" required /></label>
          <label>Contrasena<input name="password" type="password" autoComplete="current-password" required minLength={10} /></label>
          <button className="system-button system-button-primary" type="submit" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
        </form>
        <aside className="auth-aside jury-aside">
          <span>CONSTRUIR ES EL CENTRO</span>
          <h2>Un sistema para operar la Buildathon completa.</h2>
          <p>Retos, equipos, mentoria, entregas, jurado y resultados en un solo flujo.</p>
        </aside>
      </div>
    </SystemLayout>
  )
}
