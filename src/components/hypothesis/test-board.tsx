'use client'

import { useState, useCallback, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { updateTestStatus, updateTestingActivity } from '@/actions/solutions'
import { cn } from '@/lib/utils'
import type { ActivityType, ActivityStatus } from '@/types/database'

export type TeamMember = { id: string; full_name: string | null; role: string | null }

export type TestCardData = {
  id: string
  description: string | null
  status: ActivityStatus
  activity_type: ActivityType
  owner_id: string | null
  solutionTitle: string | null
  opportunityTitle: string
}

type ByStatus = Record<ActivityStatus, TestCardData[]>

const COLUMNS: { status: ActivityStatus; label: string }[] = [
  { status: 'planned',     label: 'Planned' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'done',        label: 'Done' },
]

const activityTypeLabels: Record<ActivityType, string> = {
  interview:         'Interview',
  survey:            'Survey',
  observation:       'Observation',
  data_analysis:     'Data analysis',
  prototype_test:    'Prototype test',
  feasibility_check: 'Feasibility check',
  other:             'Type not set',
}

function groupByStatus(tests: TestCardData[]): ByStatus {
  return COLUMNS.reduce((acc, { status }) => {
    acc[status] = tests.filter((t) => t.status === status)
    return acc
  }, {} as ByStatus)
}

export function TestBoard({ tests, teamMembers = [] }: { tests: TestCardData[]; teamMembers?: TeamMember[] }) {
  const [items, setItems] = useState<ByStatus>(() => groupByStatus(tests))
  const [activeTest, setActiveTest] = useState<TestCardData | null>(null)
  const [editingTest, setEditingTest] = useState<TestCardData | null>(null)

  function handleCardClick(test: TestCardData) {
    // find the latest version from items state (status may have changed via DnD)
    for (const { status } of COLUMNS) {
      const found = items[status].find((t) => t.id === test.id)
      if (found) { setEditingTest(found); return }
    }
    setEditingTest(test)
  }

  function handleSaved(updated: Partial<TestCardData> & { id: string }) {
    setItems((prev) => {
      const next = { ...prev }
      for (const { status } of COLUMNS) {
        next[status] = next[status].map((t) =>
          t.id === updated.id ? { ...t, ...updated } : t
        )
      }
      return next
    })
    setEditingTest(null)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const findStatus = useCallback(
    (id: string): ActivityStatus | null => {
      for (const { status } of COLUMNS) {
        if (items[status].find((t) => t.id === id)) return status
      }
      return null
    },
    [items]
  )

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    const status = findStatus(id)
    if (!status) return
    setActiveTest(items[status].find((t) => t.id === id) ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    const allStatuses = COLUMNS.map((c) => c.status)

    const activeStatus = findStatus(activeId)
    const overStatus = (allStatuses.includes(overId as ActivityStatus)
      ? overId
      : findStatus(overId)) as ActivityStatus | null

    if (!activeStatus || !overStatus || activeStatus === overStatus) return

    setItems((prev) => {
      const activeItems = prev[activeStatus]
      const overItems = prev[overStatus]
      const activeIndex = activeItems.findIndex((t) => t.id === activeId)
      const overIndex = overItems.findIndex((t) => t.id === overId)
      const moved = { ...activeItems[activeIndex], status: overStatus }

      return {
        ...prev,
        [activeStatus]: activeItems.filter((t) => t.id !== activeId),
        [overStatus]: [
          ...overItems.slice(0, overIndex >= 0 ? overIndex : overItems.length),
          moved,
          ...overItems.slice(overIndex >= 0 ? overIndex : overItems.length),
        ],
      }
    })
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTest(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    const allStatuses = COLUMNS.map((c) => c.status)

    const activeStatus = findStatus(activeId)
    const overStatus = (allStatuses.includes(overId as ActivityStatus)
      ? overId
      : findStatus(overId)) as ActivityStatus | null

    if (!activeStatus || !overStatus) return

    if (activeStatus === overStatus) {
      const activeIndex = items[activeStatus].findIndex((t) => t.id === activeId)
      const overIndex = items[activeStatus].findIndex((t) => t.id === overId)
      if (activeIndex !== overIndex) {
        setItems((prev) => ({
          ...prev,
          [activeStatus]: arrayMove(prev[activeStatus], activeIndex, overIndex),
        }))
      }
      return
    }

    try {
      await updateTestStatus({ test_id: activeId, status: overStatus })
    } catch (err) {
      console.error('Failed to update test status:', err)
      setItems(groupByStatus(tests))
    }
  }

  if (tests.length === 0) {
    return (
      <div className="py-16 text-center text-[13px] text-text-3">
        No assumptions yet. Add them via the Tree view.
      </div>
    )
  }

  return (
    <>
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map(({ status, label }) => (
          <TestColumn
            key={status}
            status={status}
            label={label}
            tests={items[status]}
            onCardClick={handleCardClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTest && <TestCard test={activeTest} isDragging />}
      </DragOverlay>
    </DndContext>

    {editingTest && (
      <TestDetailModal
        test={editingTest}
        teamMembers={teamMembers}
        onClose={() => setEditingTest(null)}
        onSaved={handleSaved}
      />
    )}
    </>
  )
}

// ── Column ────────────────────────────────────────────────────

function TestColumn({
  status,
  label,
  tests,
  onCardClick,
}: {
  status: ActivityStatus
  label: string
  tests: TestCardData[]
  onCardClick: (test: TestCardData) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex flex-col min-w-0">
      <div className="flex items-center justify-between py-2 px-0.5 mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
          {label}
        </span>
        <span className="font-mono text-[11px] text-text-3 bg-surface-2 px-1.5 py-0.5 rounded-full">
          {tests.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[120px] rounded-lg transition-colors duration-100',
          isOver && 'bg-surface-2'
        )}
      >
        <SortableContext
          items={tests.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tests.length === 0 ? (
            <div className="border-[1.5px] border-dashed border-border rounded-lg p-5 text-center">
              <p className="text-[11px] text-text-3">No tests</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tests.map((test) => (
                <SortableTestCard key={test.id} test={test} onCardClick={onCardClick} />
              ))}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  )
}

// ── Sortable wrapper ──────────────────────────────────────────

function SortableTestCard({ test, onCardClick }: { test: TestCardData; onCardClick: (t: TestCardData) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: test.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <TestCard test={test} isDragging={isDragging} onClick={() => onCardClick(test)} />
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────

function TestCard({
  test,
  isDragging,
  onClick,
}: {
  test: TestCardData
  isDragging?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-surface border border-border-soft rounded-lg p-3 border-l-[3px] border-l-amber-400',
        onClick && 'cursor-pointer',
        isDragging
          ? 'shadow-card-hover rotate-1 opacity-90'
          : 'shadow-card hover:shadow-card-hover hover:-translate-y-px transition-all duration-150'
      )}
    >
      <p className="text-[13px] font-medium text-text-primary leading-snug mb-2.5">
        {test.description ?? '(no description)'}
      </p>

      <div className="mb-2.5">
        <span className="text-[10px] font-medium text-text-3 bg-surface-2 border border-border px-1.5 py-0.5 rounded">
          {activityTypeLabels[test.activity_type] ?? test.activity_type}
        </span>
      </div>

      <div className="space-y-1 pt-2 border-t border-border-soft">
        {test.solutionTitle && (
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-sky-500" />
            <span className="text-[11px] text-text-3 truncate">{test.solutionTitle}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-text-3 truncate">{test.opportunityTitle}</span>
        </div>
        {test.owner_id && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-violet-400" />
            <span className="text-[11px] text-text-3 truncate italic">Assigned</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Test detail modal ─────────────────────────────────────────

const ACTIVITY_TYPES: ActivityType[] = [
  'interview', 'survey', 'observation', 'data_analysis',
  'prototype_test', 'feasibility_check', 'other',
]
const STATUS_OPTIONS: { value: ActivityStatus; label: string }[] = [
  { value: 'planned',     label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done',        label: 'Done' },
]

const inputCls = 'w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] text-text-primary placeholder:text-text-3 focus:outline-none focus:border-text-3 transition-colors'
const selectCls = 'w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-text-3 transition-colors'

function TestDetailModal({
  test,
  teamMembers,
  onClose,
  onSaved,
}: {
  test: TestCardData
  teamMembers: TeamMember[]
  onClose: () => void
  onSaved: (updated: Partial<TestCardData> & { id: string }) => void
}) {
  const [description, setDescription] = useState(test.description ?? '')
  const [activityType, setActivityType] = useState<ActivityType>(test.activity_type)
  const [status, setStatus] = useState<ActivityStatus>(test.status)
  const [learning, setLearning] = useState('')
  const [ownerId, setOwnerId] = useState<string>(test.owner_id ?? '')
  const [isPending, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  function handleSave() {
    startTransition(async () => {
      await updateTestingActivity({
        test_id: test.id,
        description: description.trim() || undefined,
        activity_type: activityType,
        status,
        learning: learning.trim() || undefined,
        owner_id: ownerId || null,
      })
      onSaved({ id: test.id, description: description.trim() || null, activity_type: activityType, status, owner_id: ownerId || null })
    })
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-lg bg-surface rounded-xl border border-border shadow-card-hover"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border-soft">
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-text-primary">Assumption</h2>
          <button onClick={onClose} className="text-text-3 hover:text-text-2 transition-colors text-lg leading-none">×</button>
        </div>

        {/* Context breadcrumb */}
        <div className="px-5 pt-3 flex items-center gap-1.5 text-[11px] text-text-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate">{test.opportunityTitle}</span>
          {test.solutionTitle && (
            <>
              <span>›</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
              <span className="truncate">{test.solutionTitle}</span>
            </>
          )}
        </div>

        {/* Fields */}
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Description</label>
            <input autoFocus type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What are you testing?" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Type</label>
              <select value={activityType} onChange={(e) => setActivityType(e.target.value as ActivityType)} className={selectCls}>
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>{activityTypeLabels[t]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ActivityStatus)} className={selectCls}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Assigned to</label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={selectCls}>
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name ?? m.id}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Learning</label>
            <textarea value={learning} onChange={(e) => setLearning(e.target.value)} placeholder="What did you learn from this test?" rows={3} className={cn(inputCls, 'resize-none leading-relaxed')} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="px-3.5 py-1.5 text-[13px] font-medium text-text-2 border border-border rounded-md hover:border-text-3 hover:text-text-primary transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={isPending} className="px-4 py-1.5 text-[13px] font-medium bg-text-primary text-background rounded-md hover:opacity-85 disabled:opacity-40 transition-opacity">
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
