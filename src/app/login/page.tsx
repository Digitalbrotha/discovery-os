import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './login-form'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { next } = await searchParams

  if (user) {
    if (next) redirect(next)
    const { data: memberships } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
    redirect(memberships && memberships.length > 0 ? '/tracker' : '/onboarding')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Discovery OS</h1>
          <p className="text-sm text-muted-foreground">
            Continuous discovery for product trios
          </p>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  )
}
