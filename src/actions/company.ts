'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { sendInviteEmail } from '@/lib/email'

export async function setupCompany({ companyName, teamName, userRole }: { companyName: string; teamName: string; userRole: 'pm' | 'designer' | 'em' }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const { data: company, error: companyError } = await supabase.from('companies').insert({ name: companyName, slug, admin_id: user.id }).select().single()
  if (companyError) throw new Error(companyError.message)

  await supabase.from('profiles').update({ company_id: company.id }).eq('id', user.id)

  const { data: team, error: teamError } = await supabase.from('teams').insert({ company_id: company.id, name: teamName, created_by: user.id }).select().single()
  if (teamError) throw new Error(teamError.message)

  await supabase.from('team_members').insert({ team_id: team.id, user_id: user.id, role: userRole })

  revalidatePath('/tracker')
  return { company, team }
}

export async function createTeam({ company_id, name }: { company_id: string; name: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { data: team, error } = await supabase.from('teams').insert({ company_id, name, created_by: user.id }).select().single()
  if (error) throw new Error(error.message)

  revalidatePath('/settings')
  revalidatePath('/company')
  return team
}

export async function updateTeam({ team_id, name, description }: { team_id: string; name: string; description?: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('teams').update({ name, description }).eq('id', team_id)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  revalidatePath('/company')
}

export async function updateTeamName({ team_id, name }: { team_id: string; name: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('teams').update({ name }).eq('id', team_id)
  if (error) throw new Error(error.message)
  revalidatePath('/company')
}

export async function deleteTeam({ team_id }: { team_id: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('teams').delete().eq('id', team_id)
  if (error) throw new Error(error.message)
  revalidatePath('/company')
}

export async function inviteToTeam({ team_id, email, role }: { team_id: string; email: string; role: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  // Fetch team + company name for the email
  const { data: team } = await supabase
    .from('teams')
    .select('name, company:companies(name)')
    .eq('id', team_id)
    .single()

  const { data: invite, error } = await supabase
    .from('team_invites')
    .upsert({ team_id, email, role, invited_by: user.id }, { onConflict: 'team_id,email' })
    .select()
    .single()
  if (error) throw new Error(error.message)

  // Build the invite URL from the incoming request host
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = host.includes('localhost') ? 'http' : 'https'

  await sendInviteEmail({
    to: email,
    teamName: team?.name ?? 'your team',
    companyName: (team?.company as { name: string } | null)?.name ?? '',
    inviteUrl: `${proto}://${host}/invite/${invite.token}`,
    role,
  })

  revalidatePath('/company')
  revalidatePath('/settings')
  return invite
}

export async function acceptTeamInvite({ token }: { token: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { data: invite, error: inviteError } = await supabase
    .from('team_invites')
    .select('*, team:teams(company_id)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .is('accepted_at', null)
    .single()
  if (inviteError || !invite) throw new Error('Invalid or expired invite')

  const companyId = (invite.team as { company_id: string }).company_id
  const { error: memberError } = await supabase.from('team_members').insert({ team_id: invite.team_id, user_id: user.id, role: invite.role })
  if (memberError && !memberError.message.includes('duplicate')) throw new Error(memberError.message)

  await supabase.from('profiles').update({ company_id: companyId }).eq('id', user.id)
  await supabase.from('team_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)

  revalidatePath('/tracker')
  redirect('/tracker')
}

export async function revokeTeamInvite({ invite_id }: { invite_id: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('team_invites').delete().eq('id', invite_id)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}

export async function updateTeamMemberRole({ team_id, user_id, role }: { team_id: string; user_id: string; role: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('team_members').update({ role }).eq('team_id', team_id).eq('user_id', user_id)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  revalidatePath('/company')
}

export async function removeTeamMember({ team_id, user_id }: { team_id: string; user_id: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('team_members').delete().eq('team_id', team_id).eq('user_id', user_id)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  revalidatePath('/company')
}

export async function transferCompanyOwnership({ company_id, new_admin_id }: { company_id: string; new_admin_id: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase.from('companies').update({ admin_id: new_admin_id }).eq('id', company_id).eq('admin_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/company')
  revalidatePath('/settings')
}

export async function updateCompanyName({ company_id, name }: { company_id: string; name: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('companies').update({ name }).eq('id', company_id)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  revalidatePath('/company')
}

export async function updateProfile({ full_name, role }: { full_name: string; role: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase.from('profiles').update({ full_name, role }).eq('id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}
