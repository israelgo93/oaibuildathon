import type { Json, TablesInsert } from '@/types/database'
import { getServerSupabase } from './supabase.js'

export async function writeAuditLog(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Json = {},
): Promise<void> {
  const values: TablesInsert<'audit_logs'> = {
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  }
  const { error } = await getServerSupabase().from('audit_logs').insert(values)

  if (error && process.env.NODE_ENV === 'development') {
    console.error('No fue posible guardar el registro de auditoria', error.message)
  }
}
