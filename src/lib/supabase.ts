import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

let browserClient: SupabaseClient<Database> | null = null

export function getBrowserSupabase(): SupabaseClient<Database> {
  if (browserClient) return browserClient

  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!url || !publishableKey) {
    throw new Error('Supabase Auth aun no esta configurado en este entorno')
  }

  browserClient = createClient<Database>(url, publishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
  return browserClient
}
