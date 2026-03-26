import { supabase } from './supabase'

export async function logActivity(
  clientId: number,
  actionType: string,
  description: string,
  meta?: Record<string, unknown>
) {
  await supabase.from('academic_activity_logs').insert({
    client_id:   clientId,
    action_type: actionType,
    description,
    meta: meta ?? null,
  })
}
