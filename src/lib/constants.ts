import type { Stage, Confidence, NowNextLater } from '@/types/database'

export const STAGE_LABELS: Record<Stage, string> = {
  captured: 'Captured',
  assumption_testing: 'Assumption Testing',
  solution_exploration: 'Solution Exploration',
  validated: 'Validated',
  invalidated: 'Invalidated',
  parked: 'Parked',
}

export const STAGE_COLORS: Record<Stage, string> = {
  captured: 'bg-slate-100 text-slate-700',
  assumption_testing: 'bg-amber-100 text-amber-700',
  solution_exploration: 'bg-blue-100 text-blue-700',
  validated: 'bg-green-100 text-green-700',
  invalidated: 'bg-red-100 text-red-700',
  parked: 'bg-gray-100 text-gray-500',
}

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const CONFIDENCE_COLORS: Record<Confidence, string> = {
  low: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-600',
  high: 'bg-green-50 text-green-600',
}

export const LANE_LABELS: Record<NowNextLater, string> = {
  now: 'Now',
  next: 'Next',
  later: 'Later',
}

// assumption_testing is kept in STAGE_LABELS/STAGE_COLORS for backwards compatibility
// but removed from STAGES so it no longer appears as a selectable column/option
export const STAGES: Stage[] = ['captured', 'parked', 'solution_exploration', 'validated', 'invalidated']
export const CONFIDENCES = Object.keys(CONFIDENCE_LABELS) as Confidence[]
export const LANES = Object.keys(LANE_LABELS) as NowNextLater[]
