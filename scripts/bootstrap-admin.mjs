import { createClient } from '@supabase/supabase-js'

const required = (name) => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Falta la variable ${name}`)
  return value
}

const supabaseUrl = required('SUPABASE_URL')
const secretKey = required('SUPABASE_SECRET_KEY')
const email = required('BOOTSTRAP_ADMIN_EMAIL').toLowerCase()
const password = required('BOOTSTRAP_ADMIN_PASSWORD')
const fullName = required('BOOTSTRAP_ADMIN_NAME')

if (password.length < 10) {
  throw new Error('BOOTSTRAP_ADMIN_PASSWORD debe tener al menos 10 caracteres')
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
  app_metadata: { role: 'admin' },
})

if (error || !data.user) {
  throw new Error(error?.message ?? 'No fue posible crear el administrador inicial')
}

console.log(`Administrador creado: ${data.user.email}`)
