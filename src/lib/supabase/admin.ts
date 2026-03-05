import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Admin client uses the service role key — bypasses RLS.
// Only use server-side, never expose to the client.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
