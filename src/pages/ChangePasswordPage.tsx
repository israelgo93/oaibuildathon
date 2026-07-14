import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { RequiredFieldLabel, RequiredFieldsLegend } from '@/components/system/FormFieldLabel'
import { SystemLayout } from '@/components/system/SystemLayout'
import { StatusMessage } from '@/components/system/StatusMessage'
import { errorMessage } from '@/lib/api'
import { getBrowserSupabase } from '@/lib/supabase'

export function ChangePasswordPage() {
  const [sessionReady, setSessionReady] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    try {
      const supabase = getBrowserSupabase()
      void supabase.auth.getSession()
        .then(({ data }) => setSessionReady(Boolean(data.session)))
        .catch((error: unknown) => {
          setMessage(errorMessage(error))
          setSessionReady(false)
        })
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) setSessionReady(true)
      })
      unsubscribe = () => listener.subscription.unsubscribe()
    } catch (error) {
      setMessage(errorMessage(error))
      setSessionReady(false)
    }
    return () => unsubscribe?.()
  }, [])

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    const confirmation = String(form.get('confirmation') ?? '')
    setMessage('')

    if (password.length < 12) {
      setMessage('La nueva contrasena debe tener al menos 12 caracteres.')
      return
    }
    if (password !== confirmation) {
      setMessage('Las contrasenas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const supabase = getBrowserSupabase()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      await supabase.auth.signOut()
      setCompleted(true)
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SystemLayout eyebrow="Seguridad" title="Cambia tu contrasena">
      <div className="auth-layout">
        <section className="system-card system-form auth-card">
          {sessionReady === null ? <StatusMessage>Validando el enlace o la sesion...</StatusMessage> : null}
          {sessionReady === false && !completed ? (
            <>
              <h2>El enlace no esta disponible</h2>
              <p>{message || 'Solicita un nuevo enlace de recuperacion desde la pantalla de acceso.'}</p>
              <Link className="system-button system-button-primary" to="/login">Volver al acceso</Link>
            </>
          ) : null}
          {sessionReady && !completed ? (
            <form className="system-form" onSubmit={(event) => void updatePassword(event)}>
              <h2>Define una clave nueva</h2>
              <p>Usa al menos 12 caracteres. Al guardar, la sesion se cerrara para que ingreses nuevamente.</p>
              <RequiredFieldsLegend />
              {message ? <StatusMessage kind="error">{message}</StatusMessage> : null}
              <label><RequiredFieldLabel>Nueva contrasena</RequiredFieldLabel><input name="password" type="password" autoComplete="new-password" minLength={12} required /></label>
              <label><RequiredFieldLabel>Confirmar contrasena</RequiredFieldLabel><input name="confirmation" type="password" autoComplete="new-password" minLength={12} required /></label>
              <button className="system-button system-button-primary" type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar contrasena'}</button>
            </form>
          ) : null}
          {completed ? (
            <>
              <StatusMessage kind="success">Tu contrasena fue actualizada correctamente.</StatusMessage>
              <Link className="system-button system-button-primary" to="/login">Iniciar sesion</Link>
            </>
          ) : null}
        </section>
        <aside className="auth-aside jury-aside">
          <span>ACCESO PROTEGIDO</span>
          <h2>Una clave personal para cada rol.</h2>
          <p>No compartas enlaces de recuperacion ni contrasenas temporales con otras personas.</p>
        </aside>
      </div>
    </SystemLayout>
  )
}
