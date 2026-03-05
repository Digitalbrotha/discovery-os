'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import { HypothesisCard } from './hypothesis-card'
import type { Stage, HypothesisWithOwner } from '@/types/database'
import { STAGE_LABELS } from '@/lib/constants'

interface KanbanColumnProps {
  stage: Stage
  hypotheses: HypothesisWithOwner[]
  onCardClick?: (hypothesis: HypothesisWithOwner) => void
}

export function KanbanColumn({ stage, hypotheses, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div className="flex flex-col min-w-0">
      {/* Column header */}
      <div className="flex items-center justify-between py-2 px-0.5 mb-2">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
          {STAGE_LABELS[stage]}
        </span>
        <span className="font-mono text-[11px] text-text-3 bg-surface-2 px-1.5 py-0.5 rounded-full">
          {hypotheses.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[120px] rounded-lg transition-colors duration-100',
          isOver && 'bg-surface-2'
        )}
      >
        <SortableContext
          items={hypotheses.map((h) => h.id)}
          strategy={verticalListSortingStrategy}
        >
          {hypotheses.length > 0 ? (
            <div className="space-y-2">
              {hypotheses.map((hypothesis) => (
                <SortableCard
                  key={hypothesis.id}
                  hypothesis={hypothesis}
                  onClick={() => onCardClick?.(hypothesis)}
                />
              ))}
            </div>
          ) : (
            <div className="border-[1.5px] border-dashed border-border rounded-lg p-5 text-center">
              <p className="text-[11px] text-text-3 leading-relaxed">No opportunities</p>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  )
}

// ── Sortable wrapper ──────────────────────────────────────────

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableCard({
  hypothesis,
  onClick,
}: {
  hypothesis: HypothesisWithOwner
  onClick?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: hypothesis.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <HypothesisCard hypothesis={hypothesis} isDragging={isDragging} onClick={onClick} />
    </div>
  )
}
