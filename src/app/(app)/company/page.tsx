import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CompanyAdminClient } from './company-client'

export default async function CompanyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('admin_id', user.id)
    .single()

  if (!company) redirect('/settings')

  const { data: teams } = await supabase
    .from('teams')
    .select(`
      *,
      members:team_members (
        id, role,
        profile:profiles (id, full_name, email, role)
      ),
      invites:team_invites (
        id, email, role, expires_at, accepted_at
      )
    `)
    .eq('company_id', company.id)
    .order('created_at')

  const memberIds = (teams ?? []).flatMap(t =>
    (t.members ?? [])
      .map((m: { profile: { id: string } | null }) => m.profile?.id)
      .filter(Boolean) as string[]
  )

  const { data: allProfiles } = memberIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', memberIds)
    : { data: [] }

  return (
    <CompanyAdminClient
      company={company}
      teams={(teams ?? []) as any}
      allProfiles={allProfiles ?? []}
      currentUserId={user.id}
    />
  )
}
