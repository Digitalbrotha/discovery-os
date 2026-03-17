'use server'

import { createClient } from '@/lib/supabase/server'

export async function joinWaitlist(email: string): Promise<{ ok: boolean; message: string }> {
  if (!email?.trim()) return { ok: false, message: 'Please enter your email.' }

  const supabase = await createClient()
  const { error } = await supabase.from('waitlist').insert({ email: email.trim().toLowerCase() })

  if (error) {
    if (error.code === '23505') {
      // unique violation — already signed up
      return { ok: true, message: "You're already on the list — we'll be in touch!" }
    }
    return { ok: false, message: 'Something went wrong. Please try again.' }
  }

  return { ok: true, message: "Thanks! We'll get in contact when we launch." }
}
