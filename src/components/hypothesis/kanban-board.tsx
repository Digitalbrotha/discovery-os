'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { KanbanColumn } from './kanban-column'
import { HypothesisCard } from './hypothesis-card'
import { moveHypothesisStage } from '@/actions/hypotheses'
import type { Stage, HypothesisWithOwner } from '@/types/database'
import { STAGES } from '@/lib/constants'

interface KanbanBoardProps {
  hypotheses: HypothesisWithOwner[]
  onCardClick?: (hypothesis: HypothesisWithOwner) => void
}

type HypothesesByStage = Record<Stage, HypothesisWithOwner[]>

function groupByStage(hypotheses: HypothesisWithOwner[]): HypothesesByStage {
  return STAGES.reduce((acc, stage) => {
    acc[stage] = hypotheses.filter((h) => h.stage === stage)
    return acc
  }, {} as HypothesesByStage)
}

export function KanbanBoard({ hypotheses, onCardClick }: KanbanBoardProps) {
  const [items, setItems] = useState<HypothesesByStage>(() => groupByStage(hypotheses))
  const [activeHypothesis, setActiveHypothesis] = useState<HypothesisWithOwner | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // prevents accidental drags on click
    })
  )

  const findStage = useCallback(
    (id: string): Stage | null => {
      for (const stage of STAGES) {
        if (items[stage].find((h) => h.id === id)) return stage
      }
      return null
    },
    [items]
  )

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    const stage = findStage(id)
    if (!stage) return
    const hypothesis = items[stage].find((h) => h.id === id) ?? null
    setActiveHypothesis(hypothesis)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeStage = findStage(activeId)
    // over could be a stage column id or another card id
    const overStage = (STAGES.includes(overId as Stage) ? overId : findStage(overId)) as Stage | null

    if (!activeStage || !overStage || activeStage === overStage) return

    setItems((prev) => {
      const activeItems = prev[activeStage]
      const overItems = prev[overStage]
      const activeIndex = activeItems.findIndex((h) => h.id === activeId)
      const overIndex = overItems.findIndex((h) => h.id === overId)

      const movedItem = { ...activeItems[activeIndex], stage: overStage }

      return {
        ...prev,
        [activeStage]: activeItems.filter((h) => h.id !== activeId),
        [overStage]: [
          ...overItems.slice(0, overIndex >= 0 ? overIndex : overItems.length),
          movedItem,
          ...overItems.slice(overIndex >= 0 ? overIndex : overItems.length),
        ],
      }
    })
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveHypothesis(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeStage = findStage(activeId)
    const overStage = (STAGES.includes(overId as Stage) ? overId : findStage(overId)) as Stage | null

    if (!activeStage || !overStage) return

    // Reorder within same column
    if (activeStage === overStage) {
      const activeIndex = items[activeStage].findIndex((h) => h.id === activeId)
      const overIndex = items[activeStage].findIndex((h) => h.id === overId)
      if (activeIndex !== overIndex) {
        setItems((prev) => ({
          ...prev,
          [activeStage]: arrayMove(prev[activeStage], activeIndex, overIndex),
        }))
      }
      return
    }

    // Moved to a different stage — persist to DB
    try {
      await moveHypothesisStage({
        hypothesis_id: activeId,
        to_stage: overStage,
      })
    } catch (err) {
      console.error('Failed to update stage:', err)
      // Revert optimistic update on failure
      setItems(groupByStage(hypotheses))
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-6 gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            hypotheses={items[stage]}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      {/* Drag overlay — renders the card being dragged */}
      <DragOverlay>
        {activeHypothesis && (
          <HypothesisCard hypothesis={activeHypothesis} isDragging />
        )}
      </DragOverlay>
    </DndContext>
  )
}
