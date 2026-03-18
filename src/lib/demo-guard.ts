import type { User } from '@supabase/supabase-js'

export function assertNotDemo(user: User) {
  const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL
  if (demoEmail && user.email === demoEmail) {
    throw new Error('Demo accounts cannot delete data.')
  }
}
