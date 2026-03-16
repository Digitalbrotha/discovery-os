'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Stage, Confidence, Persona, ActivityType, ActivityStatus } from '@/types/database'

export async function deleteHypothesis({ hypothesis_id }: { hypothesis_id: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase.from('hypotheses').delete().eq('id', hypothesis_id)
  if (error) throw new Error(error.message)

  revalidatePath('/tracker')
}

// ============================================================
// CREATE HYPOTHESIS
// Used by: UI form, Claude agent (decision 004)
// ============================================================

interface CreateHypothesisInput {
  title: string
  statement?: string
  origin?: 'interview' | 'survey' | 'observation' | 'data' | 'intuition' | 'other'
  stage?: Stage
  confidence?: Confidence
  persona?: Persona[]
  notes?: string
  team_id?: string
  owner_id?: string
  objective_id?: string         // optional: connect to objective on creation
  now_next_later?: 'now' | 'next' | 'later'
  created_by_agent?: boolean
}

export async function createHypothesis(input: CreateHypothesisInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { data: hypothesis, error } = await supabase
    .from('hypotheses')
    .insert({
      title: input.title,
      statement: input.statement ?? null,
      origin: input.origin ?? null,
      stage: input.stage ?? 'captured',
      confidence: input.confidence ?? 'low',
      persona: input.persona ?? null,
      notes: input.notes ?? null,
      team_id: input.team_id ?? null,
      owner_id: input.owner_id ?? user.id,
      created_by: user.id,
      created_by_agent: input.created_by_agent ?? false,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Log initial stage to history
  await supabase.from('stage_history').insert({
    hypothesis_id: hypothesis.id,
    from_stage: null,
    to_stage: hypothesis.stage,
    changed_by: user.id,
    changed_by_agent: input.created_by_agent ?? false,
  })

  // Connect to objective if provided
  if (input.objective_id) {
    await supabase.from('objective_hypotheses').insert({
      objective_id: input.objective_id,
      hypothesis_id: hypothesis.id,
      now_next_later: input.now_next_later ?? 'later',
    })
  }

  revalidatePath('/tracker')
  revalidatePath('/roadmap')

  return hypothesis
}


// ============================================================
// MOVE HYPOTHESIS STAGE
// Used by: UI drag/select, Claude agent (decision 004)
// ============================================================

interface MoveStageInput {
  hypothesis_id: string
  to_stage: Stage
  evidence_note?: string
  changed_by_agent?: boolean
}

export async function moveHypothesisStage(input: MoveStageInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  // Get current stage for history
  const { data: current } = await supabase
    .from('hypotheses')
    .select('stage')
    .eq('id', input.hypothesis_id)
    .single()

  if (!current) throw new Error('Hypothesis not found')

  // Update stage
  const { error } = await supabase
    .from('hypotheses')
    .update({ stage: input.to_stage })
    .eq('id', input.hypothesis_id)

  if (error) throw new Error(error.message)

  // Log to history
  await supabase.from('stage_history').insert({
    hypothesis_id: input.hypothesis_id,
    from_stage: current.stage,
    to_stage: input.to_stage,
    evidence_note: input.evidence_note ?? null,
    changed_by: user.id,
    changed_by_agent: input.changed_by_agent ?? false,
  })

  revalidatePath('/tracker')
  revalidatePath('/roadmap')
}


// ============================================================
// LOG TESTING ACTIVITY
// Used by: UI form, Claude agent (decision 004)
// ============================================================

interface LogActivityInput {
  hypothesis_id: string
  activity_type: ActivityType
  description?: string
  learning?: string
  status?: ActivityStatus
  owner_id?: string
  activity_date?: string
  created_by_agent?: boolean
}

export async function logTestingActivity(input: LogActivityInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase.from('testing_activities').insert({
    hypothesis_id: input.hypothesis_id,
    activity_type: input.activity_type,
    description: input.description ?? null,
    learning: input.learning ?? null,
    status: input.status ?? 'planned',
    owner_id: input.owner_id ?? user.id,
    activity_date: input.activity_date ?? null,
    created_by_agent: input.created_by_agent ?? false,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/tracker')
}


// ============================================================
// UPDATE NOW/NEXT/LATER
// Used by: roadmap drag-and-drop UI
// ============================================================

interface UpdateLaneInput {
  objective_id: string
  hypothesis_id: string
  now_next_later: 'now' | 'next' | 'later'
  position?: number
}

export async function updateHypothesisLane(input: UpdateLaneInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase
    .from('objective_hypotheses')
    .update({
      now_next_later: input.now_next_later,
      position: input.position ?? 0,
    })
    .eq('objective_id', input.objective_id)
    .eq('hypothesis_id', input.hypothesis_id)

  if (error) throw new Error(error.message)

  revalidatePath('/roadmap')
}
