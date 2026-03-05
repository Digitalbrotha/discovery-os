// ============================================================
// Agent action types — decision 004
// Claude interprets a natural language prompt and returns one
// of these structured actions for the user to confirm.
// ============================================================

import type { Stage, Confidence, Persona } from './database'

// ── Individual action types ───────────────────────────────────

export interface CreateHypothesisAction {
  type: 'create_hypothesis'
  payload: {
    title: string
    statement?: string
    stage: Stage
    confidence: Confidence
    persona?: Persona[]
    objective_id?: string
    objective_title?: string // for display in preview
  }
}

export interface MoveStageAction {
  type: 'move_stage'
  payload: {
    hypothesis_id: string
    hypothesis_title: string // for display in preview
    from_stage: Stage
    to_stage: Stage
    evidence_note?: string
  }
}

export interface LogActivityAction {
  type: 'log_activity'
  payload: {
    hypothesis_id: string
    hypothesis_title: string // for display in preview
    activity_type: 'interview' | 'survey' | 'observation' | 'data_analysis' | 'prototype_test' | 'feasibility_check' | 'other'
    description?: string
    learning?: string
    status: 'planned' | 'in_progress' | 'done'
  }
}

export interface UnknownAction {
  type: 'unknown'
  payload: {
    reason: string // why Claude couldn't interpret the prompt
  }
}

export type AgentAction =
  | CreateHypothesisAction
  | MoveStageAction
  | LogActivityAction
  | UnknownAction

// ── API request / response shapes ────────────────────────────

export interface AgentInterpretRequest {
  prompt: string
}

export interface AgentInterpretResponse {
  action: AgentAction
  explanation: string // one sentence: what Claude understood
}

export interface AgentExecuteRequest {
  action: AgentAction
}

export interface AgentExecuteResponse {
  success: boolean
  message: string
}
