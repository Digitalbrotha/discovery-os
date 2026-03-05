import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/invite/${token}`)
  }

  // Look up the invite
  const { data: invite } = await supabase
    .from('team_invites')
    .select('*, team:teams(name, company_id)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .is('accepted_at', null)
    .single()

  if (!invite) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3 px-4">
          <h1 className="text-xl font-semibold">Invite not found</h1>
          <p className="text-sm text-muted-foreground">
            This invite link is invalid or has already been used.
          </p>
          <a href="/tracker" className="text-sm text-primary hover:underline">
            Go to tracker →
          </a>
        </div>
      </main>
    )
  }

  const companyId = (invite.team as { company_id: string }).company_id

  // Add to team (ignore duplicate)
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({ team_id: invite.team_id, user_id: user.id, role: invite.role })
  if (memberError && !memberError.message.includes('duplicate')) {
    throw new Error(memberError.message)
  }

  // Link profile to company
  await supabase.from('profiles').update({ company_id: companyId }).eq('id', user.id)

  // Mark accepted
  await supabase
    .from('team_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  redirect('/tracker')
}
