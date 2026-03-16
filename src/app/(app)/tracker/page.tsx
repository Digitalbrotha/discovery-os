import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TrackerClient } from './tracker-client'

export default async function TrackerPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get the user's team (first membership) — join company through team
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id, team:teams(id, name, company:companies(id, name))')
    .eq('user_id', user.id)
    .order('joined_at')
    .limit(1)
    .single()

  const teamId      = membership?.team_id ?? null
  const team        = membership?.team as { name?: string; company?: { name?: string } | null } | null
  const teamName    = team?.name ?? null
  const companyName = team?.company?.name ?? null

  const [
    { data: hypotheses },
    { data: objectives },
    { data: rawMembers },
  ] = await Promise.all([
    teamId
      ? supabase
          .from('hypotheses')
          .select(`
            *,
            owner:profiles!hypotheses_owner_id_fkey(id, full_name, role),
            hypothesis_solutions(
              solutions(
                id, title, description, stage, created_at,
                testing_activities(id, activity_type, description, status, owner_id, created_at)
              )
            )
          `)
          .eq('team_id', teamId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    teamId
      ? supabase
          .from('objectives')
          .select('id, title')
          .eq('team_id', teamId)
          .eq('status', 'active')
          .order('position')
      : Promise.resolve({ data: [] }),
    teamId
      ? supabase
          .from('team_members')
          .select('profile:profiles(id, full_name, role)')
          .eq('team_id', teamId)
      : Promise.resolve({ data: [] }),
  ])

  const teamMembers = (rawMembers ?? [])
    .map((m: { profile: unknown }) => m.profile)
    .filter(Boolean) as { id: string; full_name: string | null; role: string | null }[]

  return (
    <TrackerClient
      hypotheses={hypotheses ?? []}
      count={hypotheses?.length ?? 0}
      objectives={objectives ?? []}
      teamMembers={teamMembers}
      currentUserId={user.id}
      teamId={teamId ?? ''}
      teamName={teamName}
      companyName={companyName}
    />
  )
}
