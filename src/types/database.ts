// ============================================================
// Database types — mirrors schema.sql
// Regenerate with: npx supabase gen types typescript --local
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Stage =
  | 'captured'
  | 'assumption_testing'
  | 'solution_exploration'
  | 'validated'
  | 'invalidated'
  | 'parked'

export type Confidence = 'low' | 'medium' | 'high'

export type NowNextLater = 'now' | 'next' | 'later'

export type Persona = 'pm' | 'designer' | 'em'

export type TestType = 'survey' | 'data' | 'prototype'

export type ActivityType =
  | 'interview'
  | 'survey'
  | 'observation'
  | 'data_analysis'
  | 'prototype_test'
  | 'feasibility_check'
  | 'other'

export type ActivityStatus = 'planned' | 'in_progress' | 'done'

export type SolutionStage = 'exploring' | 'design' | 'build' | 'testing' | 'shipped'

export type UserRole = 'pm' | 'designer' | 'em'
export type TeamRole = 'pm' | 'designer' | 'em'

export interface Company {
  id: string
  name: string
  slug: string
  admin_id: string | null
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  company_id: string
  name: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: TeamRole
  joined_at: string
}

export interface TeamInvite {
  id: string
  team_id: string
  email: string
  role: TeamRole
  token: string
  invited_by: string | null
  accepted_at: string | null
  expires_at: string
  created_at: string
}

// ---- Row types ----

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole | null
  company_id: string | null
  created_at: string
  updated_at: string
}

export interface Objective {
  id: string
  title: string
  key_result: string | null
  status: 'active' | 'archived'
  position: number
  team_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Hypothesis {
  id: string
  title: string
  statement: string | null
  origin: 'interview' | 'survey' | 'observation' | 'data' | 'intuition' | 'other' | null
  stage: Stage
  confidence: Confidence
  persona: Persona[] | null
  test_types: TestType[] | null
  notes: string | null
  team_id: string | null
  owner_id: string | null
  created_by: string | null
  created_by_agent: boolean
  created_at: string
  updated_at: string
}

export interface ObjectiveHypothesis {
  id: string
  objective_id: string
  hypothesis_id: string
  now_next_later: NowNextLater
  position: number
  created_at: string
  updated_at: string
}

export interface Solution {
  id: string
  title: string
  description: string | null
  stage: SolutionStage
  owner_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface HypothesisSolution {
  id: string
  hypothesis_id: string
  solution_id: string
  created_at: string
}

export interface TestingActivity {
  id: string
  hypothesis_id: string
  activity_type: ActivityType
  description: string | null
  learning: string | null
  status: ActivityStatus
  owner_id: string | null
  created_by_agent: boolean
  activity_date: string | null
  created_at: string
  updated_at: string
}

export interface StageHistory {
  id: string
  hypothesis_id: string
  from_stage: Stage | null
  to_stage: Stage
  evidence_note: string | null
  changed_by: string | null
  changed_by_agent: boolean
  changed_at: string
}

// ---- Joined / enriched types used by the UI ----

export interface HypothesisWithOwner extends Hypothesis {
  owner: Pick<Profile, 'id' | 'full_name' | 'role'> | null
}

export interface ObjectiveWithHypotheses extends Objective {
  hypotheses: Array<{
    join: ObjectiveHypothesis
    hypothesis: HypothesisWithOwner
  }>
}

type TableDef<T extends Record<string, unknown>> = {
  Row: T
  Insert: Partial<T>
  Update: Partial<T>
  Relationships: []
}

// Placeholder — replace with generated types from Supabase CLI
export type Database = {
  public: {
    Tables: {
      companies: TableDef<Company>
      teams: TableDef<Team>
      team_members: TableDef<TeamMember>
      team_invites: TableDef<TeamInvite>
      profiles: TableDef<Profile>
      objectives: TableDef<Objective>
      hypotheses: TableDef<Hypothesis>
      objective_hypotheses: TableDef<ObjectiveHypothesis>
      solutions: TableDef<Solution>
      hypothesis_solutions: TableDef<HypothesisSolution>
      testing_activities: TableDef<TestingActivity>
      stage_history: TableDef<StageHistory>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
