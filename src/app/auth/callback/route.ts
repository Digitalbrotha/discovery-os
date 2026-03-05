import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code)

    if (user) {
      const { data: memberships } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
      return NextResponse.redirect(`${origin}${memberships && memberships.length > 0 ? '/tracker' : '/onboarding'}`)
    }
  }

  return NextResponse.redirect(`${origin}/tracker`)
}
