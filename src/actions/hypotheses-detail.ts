'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Stage, Confidence } from '@/types/database'

interface UpdateHypothesisDetailInput {
  title?: string
  statement?: string
  confidence?: Confidence
  stage?: Stage
  owner_id?: string
  notes?: string
  test_types?: string[]
}

export async function updateHypothesisDetail(
  hypothesisId: string,
  updates: UpdateHypothesisDetailInput
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase
    .from('hypotheses')
    .update(updates)
    .eq('id', hypothesisId)

  if (error) throw new Error(error.message)

  revalidatePath('/tracker')
  revalidatePath('/roadmap')
}

export async function fetchHypothesisDetail(hypothesisId: string) {
  const supabase = await createClient()

  const [
    { data: activities },
    { data: history },
    { data: objectiveJoins },
  ] = await Promise.all([
    supabase
      .from('testing_activities')
      .select('*')
      .eq('hypothesis_id', hypothesisId)
      .order('created_at', { ascending: false }),
    supabase
      .from('stage_history')
      .select('*')
      .eq('hypothesis_id', hypothesisId)
      .order('changed_at', { ascending: false }),
    supabase
      .from('objective_hypotheses')
      .select('objective_id')
      .eq('hypothesis_id', hypothesisId),
  ])

  return {
    activities: activities ?? [],
    stageHistory: history ?? [],
    connectedObjectiveIds: (objectiveJoins ?? []).map((j) => j.objective_id),
  }
}
