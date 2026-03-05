'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { NowNextLater } from '@/types/database'

// ============================================================
// CONNECT HYPOTHESIS TO OBJECTIVE WITH LANE
// ============================================================

export async function connectHypothesisToObjective({
  objective_id,
  hypothesis_id,
  now_next_later = 'later',
}: {
  objective_id: string
  hypothesis_id: string
  now_next_later?: NowNextLater
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase
    .from('objective_hypotheses')
    .upsert({ objective_id, hypothesis_id, now_next_later }, { onConflict: 'objective_id,hypothesis_id' })

  if (error) throw new Error(error.message)
  revalidatePath('/roadmap')
}

// ============================================================
// MOVE HYPOTHESIS BETWEEN LANES
// ============================================================

export async function moveHypothesisLane({
  objective_id,
  hypothesis_id,
  now_next_later,
  position = 0,
}: {
  objective_id: string
  hypothesis_id: string
  now_next_later: NowNextLater
  position?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase
    .from('objective_hypotheses')
    .update({ now_next_later, position })
    .eq('objective_id', objective_id)
    .eq('hypothesis_id', hypothesis_id)

  if (error) throw new Error(error.message)
  revalidatePath('/roadmap')
}

// ============================================================
// DISCONNECT HYPOTHESIS FROM OBJECTIVE
// ============================================================

export async function disconnectHypothesisFromObjective({
  objective_id,
  hypothesis_id,
}: {
  objective_id: string
  hypothesis_id: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase
    .from('objective_hypotheses')
    .delete()
    .eq('objective_id', objective_id)
    .eq('hypothesis_id', hypothesis_id)

  if (error) throw new Error(error.message)
  revalidatePath('/roadmap')
}
