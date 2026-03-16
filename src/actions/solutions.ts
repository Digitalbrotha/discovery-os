'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateSolution({
  solution_id,
  title,
  description,
  stage,
}: {
  solution_id: string
  title?: string
  description?: string
  stage?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description
  if (stage !== undefined) updates.stage = stage

  const { error } = await supabase
    .from('solutions')
    .update(updates)
    .eq('id', solution_id)
  if (error) throw new Error(error.message)

  revalidatePath('/tracker')
}

export async function createSolution({
  title,
  hypothesis_id,
}: {
  title: string
  hypothesis_id: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { data: solution, error: solError } = await supabase
    .from('solutions')
    .insert({ title, stage: 'exploring', created_by: user.id })
    .select()
    .single()
  if (solError) throw new Error(solError.message)

  const { error: linkError } = await supabase
    .from('hypothesis_solutions')
    .insert({ hypothesis_id, solution_id: solution.id })
  if (linkError) throw new Error(linkError.message)

  revalidatePath('/tracker')
  return solution
}

export async function updateTestingActivity({
  test_id,
  description,
  activity_type,
  status,
  learning,
  owner_id,
}: {
  test_id: string
  description?: string
  activity_type?: string
  status?: 'planned' | 'in_progress' | 'done'
  learning?: string
  owner_id?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const updates: Record<string, unknown> = {}
  if (description !== undefined) updates.description = description
  if (activity_type !== undefined) updates.activity_type = activity_type
  if (status !== undefined) updates.status = status
  if (learning !== undefined) updates.learning = learning
  if (owner_id !== undefined) updates.owner_id = owner_id

  const { error } = await supabase
    .from('testing_activities')
    .update(updates)
    .eq('id', test_id)
  if (error) throw new Error(error.message)

  revalidatePath('/tracker')
}

export async function updateTestStatus({
  test_id,
  status,
}: {
  test_id: string
  status: 'planned' | 'in_progress' | 'done'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase
    .from('testing_activities')
    .update({ status })
    .eq('id', test_id)
  if (error) throw new Error(error.message)

  revalidatePath('/tracker')
}

export async function deleteSolution({ solution_id }: { solution_id: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase.from('solutions').delete().eq('id', solution_id)
  if (error) throw new Error(error.message)

  revalidatePath('/tracker')
}

export async function deleteTestingActivity({ test_id }: { test_id: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase.from('testing_activities').delete().eq('id', test_id)
  if (error) throw new Error(error.message)

  revalidatePath('/tracker')
}

export async function createTestForSolution({
  title,
  solution_id,
  hypothesis_id,
  activity_type,
}: {
  title: string
  solution_id: string
  hypothesis_id: string
  activity_type?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { data: test, error } = await supabase
    .from('testing_activities')
    .insert({
      hypothesis_id,
      solution_id,
      activity_type: activity_type ?? 'other',
      description: title,
      status: 'planned',
      created_by_agent: false,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  revalidatePath('/tracker')
  return test
}
