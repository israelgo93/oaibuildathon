import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { SystemLayout } from '@/components/system/SystemLayout'
import { RequiredFieldLabel, RequiredFieldsLegend } from '@/components/system/FormFieldLabel'
import { StatusMessage } from '@/components/system/StatusMessage'
import { apiRequest, authenticatedApiRequest, errorMessage } from '@/lib/api'
import { getBrowserSupabase } from '@/lib/supabase'
import type { AuthProfileResult, PasswordRecoveryInput } from '@/types/api'
import type { UserRole } from '@/types/database'

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
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [success, setSuccess] = useState('')

  const navigateForCurrentProfile = async () => {
    const { profile } = await authenticatedApiRequest<AuthProfileResult>('/api/auth/me')
    navigate(profile.mustChangePassword ? '/cambiar-contrasena' : routeForRole(profile.role), { replace: true })
  }

  useEffect(() => {
    try {
      void getBrowserSupabase().auth.getSession()
        .then(({ data }) => {
          if (data.session) {
            void navigateForCurrentProfile().catch(async (error: unknown) => {
              setMessage(errorMessage(error))
              await getBrowserSupabase().auth.signOut()
            })
          }
        })
        .catch((error: unknown) => setMessage(errorMessage(error)))
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
      const { error } = await getBrowserSupabase().auth.signInWithPassword({
        email: String(form.get('email') ?? '').trim().toLowerCase(),
        password: String(form.get('password') ?? ''),
      })
      if (error) throw error
      await navigateForCurrentProfile()
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const requestRecovery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setSuccess('')
    const form = new FormData(event.currentTarget)
    const input: PasswordRecoveryInput = {
      email: String(form.get('email') ?? '').trim().toLowerCase(),
    }

    try {
      const result = await apiRequest<{ message: string }>('/api/auth/password-recovery', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      setSuccess(result.message)
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SystemLayout eyebrow="Acceso interno" title="Administracion y evaluacion">
      <div className="auth-layout">
        {recoveryMode ? (
          <form className="system-card system-form auth-card" onSubmit={(event) => void requestRecovery(event)}>
            <h2>Restablecer contrasena</h2>
            <p>Te enviaremos un enlace personal si existe una cuenta activa para ese correo.</p>
            <RequiredFieldsLegend />
            {message ? <StatusMessage kind="error">{message}</StatusMessage> : null}
            {success ? <StatusMessage kind="success">{success}</StatusMessage> : null}
            <label><RequiredFieldLabel>Correo</RequiredFieldLabel><input name="email" type="email" autoComplete="email" required /></label>
            <button className="system-button system-button-primary" type="submit" disabled={loading}>{loading ? 'Enviando...' : 'Enviar enlace'}</button>
            <button className="system-link-button" type="button" onClick={() => { setRecoveryMode(false); setMessage(''); setSuccess('') }}>Volver al inicio de sesion</button>
          </form>
        ) : (
          <form className="system-card system-form auth-card" onSubmit={(event) => void login(event)}>
            <h2>Iniciar sesion</h2>
            <p>Acceso exclusivo para organizacion, jurado y mentores.</p>
            {message ? <StatusMessage kind="error">{message}</StatusMessage> : null}
            <label>Correo<input name="email" type="email" autoComplete="email" required /></label>
            <label>Contrasena<input name="password" type="password" autoComplete="current-password" required minLength={10} /></label>
            <button className="system-button system-button-primary" type="submit" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
            <button className="system-link-button" type="button" onClick={() => { setRecoveryMode(true); setMessage(''); setSuccess('') }}>Olvide mi contrasena</button>
          </form>
        )}
        <aside className="auth-aside jury-aside">
          <span>CONSTRUIR ES EL CENTRO</span>
          <h2>Un sistema para operar la Buildathon completa.</h2>
          <p>Retos, equipos, mentoria, entregas, jurado y resultados en un solo flujo.</p>
        </aside>
      </div>
    </SystemLayout>
  )
}
