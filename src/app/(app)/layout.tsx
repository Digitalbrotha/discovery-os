import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Nav from '@/components/layout/nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*, company:companies(id, admin_id)')
      .eq('id', user.id)
      .single(),
    supabase
      .from('team_members')
      .select('id')
      .eq('user_id', user.id)
      .limit(1),
  ])

  if (!memberships || memberships.length === 0) redirect('/onboarding')

  const company = profile?.company as { id: string; admin_id: string } | null
  const isCompanyAdmin = company?.admin_id === user.id

  return (
    <div className="flex min-h-screen flex-col">
      <Nav profile={profile} isCompanyAdmin={isCompanyAdmin} />
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  )
}
