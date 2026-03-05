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
import { RoadmapLaneCell, droppableId } from './roadmap-lane-cell'
import { ConnectHypothesisPopover } from './connect-hypothesis-popover'
import { moveHypothesisLane } from '@/actions/roadmap'
import { StageBadge, ConfidenceBadge } from '@/components/shared/badges'
import { cn } from '@/lib/utils'
import type { NowNextLater, Hypothesis } from '@/types/database'
import type { RoadmapRow, RoadmapHypothesisCard } from '@/types/roadmap'

const LANES: NowNextLater[] = ['now', 'next', 'later']

const LANE_META: Record<NowNextLater, { label: string; description: string }> = {
  now:   { label: 'Now',  description: 'Actively working on' },
  next:  { label: 'Next', description: 'Up next when space opens' },
  later: { label: 'Later', description: 'On the horizon' },
}

interface RoadmapBoardProps {
  rows: RoadmapRow[]
  allHypotheses: Hypothesis[]
}

export function RoadmapBoard({ rows: initialRows, allHypotheses }: RoadmapBoardProps) {
  const [rows, setRows] = useState(initialRows)
  const [activeCard, setActiveCard] = useState<RoadmapHypothesisCard | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Find which row + lane a join_id lives in
  const findLocation = useCallback(
    (joinId: string): { objectiveId: string; lane: NowNextLater } | null => {
      for (const row of rows) {
        for (const lane of LANES) {
          if (row.lanes[lane].find((c) => c.join_id === joinId)) {
            return { objectiveId: row.objective.id, lane }
          }
        }
      }
      return null
    },
    [rows]
  )

  function handleDragStart(event: DragStartEvent) {
    const joinId = event.active.id as string
    const loc = findLocation(joinId)
    if (!loc) return
    const card = rows
      .find((r) => r.objective.id === loc.objectiveId)
      ?.lanes[loc.lane]
      .find((c) => c.join_id === joinId) ?? null
    setActiveCard(card)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeJoinId = active.id as string
    const overId = over.id as string

    const activeLoc = findLocation(activeJoinId)
    if (!activeLoc) return

    // Determine target location — over could be a droppable cell or another card
    let targetObjectiveId: string
    let targetLane: NowNextLater

    if (overId.includes('::')) {
      // Dropped on a droppable cell id (objectiveId::lane)
      const [oId, l] = overId.split('::')
      targetObjectiveId = oId
      targetLane = l as NowNextLater
    } else {
      // Dropped on a card — find its location
      const overLoc = findLocation(overId)
      if (!overLoc) return
      targetObjectiveId = overLoc.objectiveId
      targetLane = overLoc.lane
    }

    // No-op if same spot
    if (
      activeLoc.objectiveId === targetObjectiveId &&
      activeLoc.lane === targetLane
    ) return

    setRows((prev) =>
      prev.map((row) => {
        const isSourceRow = row.objective.id === activeLoc.objectiveId
        const isTargetRow = row.objective.id === targetObjectiveId

        if (!isSourceRow && !isTargetRow) return row

        let updatedLanes = { ...row.lanes }

        if (isSourceRow) {
          // Remove from source
          const movedCard = updatedLanes[activeLoc.lane].find(
            (c) => c.join_id === activeJoinId
          )
          if (!movedCard) return row
          updatedLanes[activeLoc.lane] = updatedLanes[activeLoc.lane].filter(
            (c) => c.join_id !== activeJoinId
          )

          if (isTargetRow) {
            // Same row, different lane
            const overIndex = updatedLanes[targetLane].findIndex(
              (c) => c.join_id === overId
            )
            const updated = { ...movedCard, now_next_later: targetLane, objective_id: targetObjectiveId }
            updatedLanes[targetLane] = [
              ...updatedLanes[targetLane].slice(0, overIndex >= 0 ? overIndex : updatedLanes[targetLane].length),
              updated,
              ...updatedLanes[targetLane].slice(overIndex >= 0 ? overIndex : updatedLanes[targetLane].length),
            ]
          }
        } else if (isTargetRow && !isSourceRow) {
          // Cross-row move — find and move card from source row state
          const sourceRow = prev.find((r) => r.objective.id === activeLoc.objectiveId)
          const movedCard = sourceRow?.lanes[activeLoc.lane].find(
            (c) => c.join_id === activeJoinId
          )
          if (!movedCard) return row

          const overIndex = updatedLanes[targetLane].findIndex(
            (c) => c.join_id === overId
          )
          const updated = { ...movedCard, now_next_later: targetLane, objective_id: targetObjectiveId }
          updatedLanes[targetLane] = [
            ...updatedLanes[targetLane].slice(0, overIndex >= 0 ? overIndex : updatedLanes[targetLane].length),
            updated,
            ...updatedLanes[targetLane].slice(overIndex >= 0 ? overIndex : updatedLanes[targetLane].length),
          ]
        }

        return { ...row, lanes: updatedLanes }
      })
    )
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCard(null)
    if (!over) return

    const activeJoinId = active.id as string
    const overId = over.id as string

    const activeLoc = findLocation(activeJoinId)
    if (!activeLoc) return

    let targetObjectiveId: string
    let targetLane: NowNextLater

    if (overId.includes('::')) {
      const [oId, l] = overId.split('::')
      targetObjectiveId = oId
      targetLane = l as NowNextLater
    } else {
      const overLoc = findLocation(overId)
      if (!overLoc) return
      targetObjectiveId = overLoc.objectiveId
      targetLane = overLoc.lane
    }

    // Reorder within same cell
    if (activeLoc.objectiveId === targetObjectiveId && activeLoc.lane === targetLane) {
      const row = rows.find((r) => r.objective.id === targetObjectiveId)
      if (!row) return
      const cards = row.lanes[targetLane]
      const activeIndex = cards.findIndex((c) => c.join_id === activeJoinId)
      const overIndex = cards.findIndex((c) => c.join_id === overId)
      if (activeIndex !== overIndex) {
        setRows((prev) =>
          prev.map((r) =>
            r.objective.id !== targetObjectiveId
              ? r
              : {
                  ...r,
                  lanes: {
                    ...r.lanes,
                    [targetLane]: arrayMove(r.lanes[targetLane], activeIndex, overIndex),
                  },
                }
          )
        )
      }
      return
    }

    // Persist lane change to DB
    const activeCard = active.data.current?.card as RoadmapHypothesisCard | undefined
    if (!activeCard) return

    try {
      await moveHypothesisLane({
        objective_id: activeLoc.objectiveId,
        hypothesis_id: activeCard.hypothesis.id,
        now_next_later: targetLane,
      })
    } catch (err) {
      console.error('Failed to move lane:', err)
      setRows(initialRows) // revert on failure
    }
  }

  // Hypotheses not yet connected to each objective (for the connect popover)
  function getAvailableHypotheses(row: RoadmapRow): Hypothesis[] {
    const connectedIds = new Set(
      LANES.flatMap((l) => row.lanes[l].map((c) => c.hypothesis.id))
    )
    return allHypotheses.filter((h) => !connectedIds.has(h.id))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full">
        {/* Column headers */}
        <div className="grid grid-cols-[200px_1fr_1fr_1fr] gap-3 mb-2 pl-0">
          <div /> {/* Objective label col */}
          {LANES.map((lane) => (
            <div key={lane} className="px-2">
              <p className="text-[12px] font-semibold text-text-2 tracking-[-0.01em]">
                {LANE_META[lane].label}
              </p>
              <p className="text-[11px] text-text-3">{LANE_META[lane].description}</p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-border mb-3" />

        {/* Objective rows */}
        <div className="space-y-2">
          {rows.length === 0 && (
            <div className="py-16 text-center text-[13px] text-text-3">
              No active objectives. Create one to get started.
            </div>
          )}

          {rows.map((row) => (
            <ObjectiveRow
              key={row.objective.id}
              row={row}
              availableHypotheses={getAvailableHypotheses(row)}
            />
          ))}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeCard && (
          <div className="bg-surface border border-border-soft rounded-lg px-3 py-2.5 shadow-card-hover rotate-1 w-56">
            <p className="text-[12px] font-medium text-text-primary leading-snug tracking-[-0.01em] mb-2 line-clamp-2">
              {activeCard.hypothesis.title}
            </p>
            <div className="flex items-center gap-1.5">
              <StageBadge stage={activeCard.hypothesis.stage} />
              <ConfidenceBadge confidence={activeCard.hypothesis.confidence} />
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

// ── Objective row ─────────────────────────────────────────────

function ObjectiveRow({
  row,
  availableHypotheses,
}: {
  row: RoadmapRow
  availableHypotheses: Hypothesis[]
}) {
  const totalCards = LANES.reduce((n, l) => n + row.lanes[l].length, 0)

  return (
    <div className="grid grid-cols-[200px_1fr_1fr_1fr] gap-3 items-start">
      {/* Objective label */}
      <div className="pt-2 pr-3">
        <p className="text-[13px] font-semibold text-text-primary tracking-[-0.02em] leading-snug mb-1">
          {row.objective.title}
        </p>
        {row.objective.key_result && (
          <p className="text-[11px] text-text-3 leading-snug line-clamp-2">
            {row.objective.key_result}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="font-mono text-[10px] text-text-3">
            {totalCards} opportunit{totalCards !== 1 ? 'ies' : 'y'}
          </span>
        </div>
        <div className="mt-2">
          <ConnectHypothesisPopover
            objectiveId={row.objective.id}
            availableHypotheses={availableHypotheses}
          />
        </div>
      </div>

      {/* Lane cells */}
      {LANES.map((lane) => (
        <div
          key={lane}
          className={cn(
            'rounded-lg border border-border-soft bg-surface/50',
            lane === 'now' && 'border-stage-solution bg-stage-solution/10'
          )}
        >
          <RoadmapLaneCell
            objectiveId={row.objective.id}
            lane={lane}
            cards={row.lanes[lane]}
          />
        </div>
      ))}
    </div>
  )
}
