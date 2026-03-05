import { cn } from '@/lib/utils'
import type { Stage, Confidence } from '@/types/database'
import { STAGE_LABELS, CONFIDENCE_LABELS } from '@/lib/constants'

const stageStyles: Record<Stage, string> = {
  captured:            'bg-stage-captured text-stage-captured-fg',
  assumption_testing:  'bg-stage-testing text-stage-testing-fg',
  solution_exploration:'bg-stage-solution text-stage-solution-fg',
  validated:           'bg-stage-validated text-stage-validated-fg',
  invalidated:         'bg-stage-invalid text-stage-invalid-fg',
  parked:              'bg-stage-parked text-stage-parked-fg',
}

interface StageBadgeProps { stage: Stage; className?: string }

export function StageBadge({ stage, className }: StageBadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-sm px-1.5 py-0.5 font-sans text-[10px] font-medium tracking-[0.01em]', stageStyles[stage], className)}>
      {STAGE_LABELS[stage]}
    </span>
  )
}

const confidenceStyles: Record<Confidence, string> = {
  low:    'bg-conf-low text-conf-low-fg',
  medium: 'bg-conf-med text-conf-med-fg',
  high:   'bg-conf-hi text-conf-hi-fg',
}

interface ConfidenceBadgeProps { confidence: Confidence; className?: string }

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-sm px-1.5 py-0.5 font-sans text-[10px] font-medium tracking-[0.01em]', confidenceStyles[confidence], className)}>
      {CONFIDENCE_LABELS[confidence]}
    </span>
  )
}

export function AIBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] tracking-[0.04em] border border-border text-text-3 bg-transparent', className)}>
      ✦ AI
    </span>
  )
}
