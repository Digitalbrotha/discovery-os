'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { ConfidenceBadge, StageBadge } from '@/components/shared/badges'
import type { NowNextLater } from '@/types/database'
import type { RoadmapHypothesisCard } from '@/types/roadmap'

interface RoadmapLaneCellProps {
  objectiveId: string
  lane: NowNextLater
  cards: RoadmapHypothesisCard[]
  onCardClick?: (card: RoadmapHypothesisCard) => void
}

// Droppable id encodes both objective and lane so DnD knows where to drop
export function droppableId(objectiveId: string, lane: NowNextLater) {
  return `${objectiveId}::${lane}`
}

export function RoadmapLaneCell({ objectiveId, lane, cards, onCardClick }: RoadmapLaneCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId(objectiveId, lane) })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[80px] rounded-lg p-2 transition-colors duration-100',
        isOver ? 'bg-surface-2' : 'bg-transparent'
      )}
    >
      <SortableContext
        items={cards.map((c) => c.join_id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {cards.map((card) => (
            <SortableRoadmapCard
              key={card.join_id}
              card={card}
              onClick={() => onCardClick?.(card)}
            />
          ))}
        </div>
      </SortableContext>

      {cards.length === 0 && (
        <div className={cn(
          'h-full min-h-[60px] rounded border border-dashed border-border flex items-center justify-center',
          isOver && 'border-text-3'
        )}>
          <span className="text-[11px] text-text-3">Drop here</span>
        </div>
      )}
    </div>
  )
}

// ── Sortable card ─────────────────────────────────────────────

function SortableRoadmapCard({
  card,
  onClick,
}: {
  card: RoadmapHypothesisCard
  onClick?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.join_id,
    data: { card }, // pass card data so DragEnd can read it
  })

  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <RoadmapCard card={card} isDragging={isDragging} onClick={onClick} />
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────

function RoadmapCard({
  card,
  isDragging,
  onClick,
}: {
  card: RoadmapHypothesisCard
  isDragging?: boolean
  onClick?: () => void
}) {
  const h = card.hypothesis

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-surface border border-border-soft rounded-lg px-3 py-2.5 cursor-pointer',
        'transition-all duration-150',
        isDragging
          ? 'shadow-card-hover rotate-1 opacity-90'
          : 'shadow-card hover:shadow-card-hover hover:-translate-y-px'
      )}
    >
      <p className="text-[12px] font-medium text-text-primary leading-snug tracking-[-0.01em] mb-2">
        {h.title}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <StageBadge stage={h.stage} />
        <ConfidenceBadge confidence={h.confidence} />
        {h.created_by_agent && (
          <span className="font-mono text-[10px] text-text-3 border border-border px-1 py-0.5 rounded">
            ✦ AI
          </span>
        )}
      </div>
    </div>
  )
}
