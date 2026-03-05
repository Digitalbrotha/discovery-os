import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { companyName, teamName, userRole } = await req.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    // Profile must exist before company (companies.admin_id FK references profiles).
    // Use admin client to bypass RLS — this is a trusted server-side operation.
    const { error: profileError } = await createAdminClient().from('profiles').upsert({
      id: user.id,
      email: user.email ?? '',
      full_name: (user.user_metadata?.full_name as string) ?? null,
      role: userRole ?? null,
    })
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({ name: companyName, slug, admin_id: user.id })
      .select().single()
    if (companyError) return NextResponse.json({ error: companyError.message }, { status: 400 })

    // Link profile to company now that company exists
    await createAdminClient().from('profiles').update({ company_id: company.id }).eq('id', user.id)

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({ company_id: company.id, name: teamName, created_by: user.id })
      .select().single()
    if (teamError) return NextResponse.json({ error: teamError.message }, { status: 400 })

    const { error: memberError } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: user.id, role: userRole })
    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 400 })

    return NextResponse.json({ company, team })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[onboard]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}