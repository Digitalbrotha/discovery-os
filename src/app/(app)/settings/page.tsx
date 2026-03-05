import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: teamMemberships }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('team_members')
      .select('role, team:teams (id, name, company_id)')
      .eq('user_id', user.id),
  ])

  const teams = await Promise.all(
    (teamMemberships ?? []).map(async (tm) => {
      const team = tm.team as { id: string; name: string; company_id: string }
      const [{ data: members }, { data: invites }] = await Promise.all([
        supabase
          .from('team_members')
          .select('role, profile:profiles (id, full_name, email, role)')
          .eq('team_id', team.id),
        supabase
          .from('team_invites')
          .select('*')
          .eq('team_id', team.id)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString()),
      ])
      return { team, userRole: tm.role, members: members ?? [], invites: invites ?? [] }
    })
  )

  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .eq('admin_id', user.id)
    .single()

  return (
    <SettingsClient
      profile={profile}
      teams={teams}
      currentUserId={user.id}
      isCompanyAdmin={!!company}
      companyId={company?.id ?? null}
    />
  )
}