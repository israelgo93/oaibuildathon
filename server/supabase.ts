import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database.js'
import { getServerEnvironment } from './env.js'

let serverClient: SupabaseClient<Database> | null = null

export function getServerSupabase(): SupabaseClient<Database> {
  if (serverClient) return serverClient

  const environment = getServerEnvironment()
  serverClient = createClient<Database>(environment.supabaseUrl, environment.supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return serverClient
}
