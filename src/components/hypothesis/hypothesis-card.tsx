'use client'

import { cn } from '@/lib/utils'
import { ConfidenceBadge, AIBadge } from '@/components/shared/badges'
import type { HypothesisWithOwner } from '@/types/database'

const roleInitials: Record<string, string> = { pm: 'P', designer: 'D', em: 'E' }
const roleColors: Record<string, string> = {
  pm:       'bg-stage-solution text-stage-solution-fg',
  designer: 'bg-stage-validated text-stage-validated-fg',
  em:       'bg-stage-testing text-stage-testing-fg',
}

interface HypothesisCardProps {
  hypothesis: HypothesisWithOwner
  isDragging?: boolean
  onClick?: () => void
}

export function HypothesisCard({ hypothesis, isDragging, onClick }: HypothesisCardProps) {
  const owner = hypothesis.owner
  const ownerRole = owner?.role ?? 'pm'
  const ownerInitial = owner?.full_name?.[0]?.toUpperCase() ?? '?'

  const formattedDate = new Date(hypothesis.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div
      onClick={onClick}
      className={cn(
        'group bg-surface border border-border-soft rounded-lg p-3 cursor-pointer',
        'transition-all duration-150',
        isDragging
          ? 'shadow-card-hover rotate-1 opacity-90'
          : 'shadow-card hover:shadow-card-hover hover:-translate-y-px'
      )}
    >
      {/* Title */}
      <p className="text-[13px] font-medium text-text-primary leading-[1.35] tracking-[-0.01em] mb-2.5">
        {hypothesis.title}
      </p>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-2.5">
        <ConfidenceBadge confidence={hypothesis.confidence} />
        {hypothesis.created_by_agent && <AIBadge />}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {/* Owner avatar */}
          <div
            className={cn(
              'w-[18px] h-[18px] rounded-full flex items-center justify-center',
              'text-[9px] font-semibold',
              roleColors[ownerRole] ?? roleColors.pm
            )}
          >
            {ownerInitial}
          </div>
          <span className="text-[11px] text-text-3">
            {owner?.full_name ?? 'Unassigned'}
          </span>
        </div>
        <span className="font-mono text-[10px] text-text-3">{formattedDate}</span>
      </div>
    </div>
  )
}
