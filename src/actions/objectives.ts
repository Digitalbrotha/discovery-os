'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createObjective(input: { title: string; key_result?: string; team_id: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { data, error } = await supabase
    .from('objectives')
    .insert({ title: input.title, key_result: input.key_result ?? null, team_id: input.team_id, created_by: user.id })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/tracker')
  revalidatePath('/roadmap')
  return data
}

export async function updateObjective(input: { id: string; title?: string; key_result?: string; status?: 'active' | 'archived' }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase
    .from('objectives')
    .update({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.key_result !== undefined && { key_result: input.key_result }),
      ...(input.status !== undefined && { status: input.status }),
    })
    .eq('id', input.id)

  if (error) throw new Error(error.message)

  revalidatePath('/tracker')
  revalidatePath('/roadmap')
}

export async function deleteObjective({ id }: { id: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase.from('objectives').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/tracker')
  revalidatePath('/roadmap')
}

export async function connectHypothesisToObjective(input: {
  objective_id: string
  hypothesis_id: string
  now_next_later?: 'now' | 'next' | 'later'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase.from('objective_hypotheses').upsert({
    objective_id: input.objective_id,
    hypothesis_id: input.hypothesis_id,
    now_next_later: input.now_next_later ?? 'later',
  })

  if (error) throw new Error(error.message)

  revalidatePath('/tracker')
  revalidatePath('/roadmap')
}

export async function disconnectHypothesisFromObjective(input: {
  objective_id: string
  hypothesis_id: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase
    .from('objective_hypotheses')
    .delete()
    .eq('objective_id', input.objective_id)
    .eq('hypothesis_id', input.hypothesis_id)

  if (error) throw new Error(error.message)

  revalidatePath('/tracker')
  revalidatePath('/roadmap')
}
