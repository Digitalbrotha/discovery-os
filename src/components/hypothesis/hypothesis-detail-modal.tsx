'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { STAGE_LABELS, CONFIDENCE_LABELS, STAGES, CONFIDENCES } from '@/lib/constants'
import { StageBadge, ConfidenceBadge, AIBadge } from '@/components/shared/badges'
import { moveHypothesisStage, logTestingActivity } from '@/actions/hypotheses'
import { updateHypothesisDetail } from '@/actions/hypotheses-detail'
import { connectHypothesisToObjective, disconnectHypothesisFromObjective } from '@/actions/objectives'
import type {
  HypothesisWithOwner,
  Stage,
  Confidence,
  TestType,
  TestingActivity,
  StageHistory,
  Objective,
} from '@/types/database'

// ── Types ────────────────────────────────────────────────────

interface HypothesisDetailModalProps {
  hypothesis: HypothesisWithOwner | null
  open: boolean
  onClose: () => void
  activities: TestingActivity[]
  stageHistory: StageHistory[]
  objectives: Pick<Objective, 'id' | 'title'>[]
  connectedObjectiveIds: string[]
  teamMembers: { id: string; full_name: string | null; role: string | null }[]
}

type Tab = 'overview' | 'activities'

// ── Main component ───────────────────────────────────────────

export function HypothesisDetailModal({
  hypothesis,
  open,
  onClose,
  activities: initialActivities,
  stageHistory,
  objectives,
  connectedObjectiveIds: initialConnectedObjectiveIds,
  teamMembers,
}: HypothesisDetailModalProps) {
  const [tab, setTab] = useState<Tab>('overview')
  const [activities, setActivities] = useState(initialActivities)
  const [connectedObjectiveIds, setConnectedObjectiveIds] = useState(initialConnectedObjectiveIds)
  const [isPending, startTransition] = useTransition()

  // Sync when hypothesis changes
  useEffect(() => {
    setActivities(initialActivities)
    setConnectedObjectiveIds(initialConnectedObjectiveIds)
  }, [initialActivities, initialConnectedObjectiveIds])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !hypothesis) return null

  const owner = teamMembers.find((m) => m.id === hypothesis.owner_id)

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-2xl max-h-[85vh] bg-surface rounded-xl border border-border shadow-card-hover pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border-soft shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <StageBadge stage={hypothesis.stage} />
              <ConfidenceBadge confidence={hypothesis.confidence} />
              {hypothesis.created_by_agent && <AIBadge />}
            </div>
            <button
              onClick={onClose}
              className="text-text-3 hover:text-text-2 transition-colors text-xl leading-none ml-4 shrink-0"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto">

            {/* Title + statement */}
            <div className="px-5 pt-5 pb-4 border-b border-border-soft">
              <EditableTitle hypothesis={hypothesis} />
              <EditableStatement hypothesis={hypothesis} />
            </div>

            {/* Meta row */}
            <div className="px-5 py-4 border-b border-border-soft">
              <div className="grid grid-cols-4 gap-4">
                <MetaField label="Stage">
                  <EditableSelect
                    value={hypothesis.stage}
                    options={STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))}
                    onSave={async (val) => {
                      startTransition(async () => {
                        await moveHypothesisStage({
                          hypothesis_id: hypothesis.id,
                          to_stage: val as Stage,
                        })
                      })
                    }}
                    renderValue={() => <StageBadge stage={hypothesis.stage} />}
                  />
                </MetaField>

                <MetaField label="Confidence">
                  <EditableSelect
                    value={hypothesis.confidence}
                    options={CONFIDENCES.map((c) => ({ value: c, label: CONFIDENCE_LABELS[c] }))}
                    onSave={async (val) => {
                      startTransition(async () => {
                        await updateHypothesisDetail(hypothesis.id, { confidence: val as Confidence })
                      })
                    }}
                    renderValue={() => <ConfidenceBadge confidence={hypothesis.confidence} />}
                  />
                </MetaField>

                <MetaField label="Owner">
                  <EditableSelect
                    value={hypothesis.owner_id ?? ''}
                    options={teamMembers.map((m) => ({
                      value: m.id,
                      label: `${m.full_name ?? m.id}${m.role ? ` (${m.role})` : ''}`,
                    }))}
                    onSave={async (val) => {
                      startTransition(async () => {
                        await updateHypothesisDetail(hypothesis.id, { owner_id: val })
                      })
                    }}
                    renderValue={() => (
                      <span className="text-[13px] text-text-primary">
                        {owner?.full_name ?? '—'}
                      </span>
                    )}
                  />
                </MetaField>

                <MetaField label="Test type">
                  <TestTypePicker
                    value={(hypothesis.test_types ?? []) as TestType[]}
                    onSave={async (val) => {
                      startTransition(async () => {
                        await updateHypothesisDetail(hypothesis.id, { test_types: val })
                      })
                    }}
                  />
                </MetaField>
              </div>

              {/* Objectives */}
              <div className="mt-4">
                <MetaField label="Connected objectives">
                  <ObjectivesPicker
                    hypothesisId={hypothesis.id}
                    objectiveIds={connectedObjectiveIds}
                    objectives={objectives}
                    onChange={setConnectedObjectiveIds}
                  />
                </MetaField>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-5 pt-4">
              <div className="flex gap-1 mb-4">
                {(['overview', 'activities'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-[12px] font-medium capitalize transition-colors',
                      tab === t
                        ? 'bg-surface-2 text-text-primary'
                        : 'text-text-3 hover:text-text-2'
                    )}
                  >
                    {t}
                    {t === 'activities' && activities.length > 0 && (
                      <span className="ml-1.5 font-mono text-[10px] bg-surface border border-border px-1 py-0.5 rounded-full">
                        {activities.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {tab === 'overview' && (
                <StageTimeline history={stageHistory} />
              )}

              {tab === 'activities' && (
                <ActivitiesTab
                  hypothesisId={hypothesis.id}
                  activities={activities}
                  teamMembers={teamMembers}
                  currentUserId={hypothesis.owner_id ?? ''}
                  onActivityAdded={(a) => setActivities((prev) => [a, ...prev])}
                />
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-5 py-3 border-t border-border-soft shrink-0 flex items-center justify-between">
            <span className="font-mono text-[10px] text-text-3">
              Created {new Date(hypothesis.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
            {isPending && (
              <span className="text-[11px] text-text-3 animate-pulse">Saving…</span>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}


// ── Editable title ───────────────────────────────────────────

function EditableTitle({ hypothesis }: { hypothesis: HypothesisWithOwner }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(hypothesis.title)
  const [isPending, startTransition] = useTransition()

  function handleBlur() {
    setEditing(false)
    if (value.trim() === hypothesis.title) return
    startTransition(async () => {
      await updateHypothesisDetail(hypothesis.id, { title: value.trim() })
    })
  }

  return editing ? (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
      className={cn(
        'w-full text-[17px] font-semibold tracking-[-0.025em] text-text-primary',
        'bg-surface-2 rounded-md px-2 py-1 outline-none border border-border',
        'mb-3'
      )}
    />
  ) : (
    <h2
      onClick={() => setEditing(true)}
      className={cn(
        'text-[17px] font-semibold tracking-[-0.025em] text-text-primary leading-snug',
        'cursor-text hover:bg-surface-2 rounded-md px-2 py-1 -mx-2 mb-3 transition-colors',
        isPending && 'opacity-60'
      )}
    >
      {value}
    </h2>
  )
}


// ── Editable statement ───────────────────────────────────────

function EditableStatement({ hypothesis }: { hypothesis: HypothesisWithOwner }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(hypothesis.statement ?? '')
  const [isPending, startTransition] = useTransition()

  function handleBlur() {
    setEditing(false)
    if (value === (hypothesis.statement ?? '')) return
    startTransition(async () => {
      await updateHypothesisDetail(hypothesis.id, { statement: value })
    })
  }

  return editing ? (
    <textarea
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      rows={4}
      className={cn(
        'w-full text-[13px] text-text-2 leading-relaxed',
        'bg-surface-2 rounded-md px-2 py-1.5 outline-none border border-border resize-none'
      )}
    />
  ) : (
    <p
      onClick={() => setEditing(true)}
      className={cn(
        'text-[13px] text-text-2 leading-relaxed cursor-text',
        'hover:bg-surface-2 rounded-md px-2 py-1 -mx-2 transition-colors',
        isPending && 'opacity-60',
        !value && 'text-text-3 italic'
      )}
    >
      {value || 'Add opportunity statement — "We believe that…"'}
    </p>
  )
}


// ── Editable select ──────────────────────────────────────────

interface EditableSelectProps {
  value: string
  options: { value: string; label: string }[]
  onSave: (val: string) => Promise<void>
  renderValue: () => React.ReactNode
}

function EditableSelect({ value, options, onSave, renderValue }: EditableSelectProps) {
  const [editing, setEditing] = useState(false)

  return editing ? (
    <select
      autoFocus
      defaultValue={value}
      onChange={async (e) => {
        setEditing(false)
        await onSave(e.target.value)
      }}
      onBlur={() => setEditing(false)}
      className={cn(
        'bg-surface-2 border border-border rounded-md px-2 py-1',
        'text-[12px] text-text-primary outline-none cursor-pointer w-full'
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ) : (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1 group hover:opacity-75 transition-opacity text-left"
    >
      {renderValue()}
      <span className="text-text-3 opacity-0 group-hover:opacity-100 transition-opacity text-[11px]">
        ✎
      </span>
    </button>
  )
}


// ── Meta field wrapper ───────────────────────────────────────

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">{label}</p>
      {children}
    </div>
  )
}


// ── Stage timeline ───────────────────────────────────────────

function StageTimeline({ history }: { history: StageHistory[] }) {
  if (history.length === 0) {
    return <p className="text-[13px] text-text-3 pb-5">No stage history yet.</p>
  }

  return (
    <div className="space-y-0 pb-5">
      {history.map((entry, i) => (
        <div key={entry.id} className="flex gap-3">
          {/* Timeline spine */}
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-border mt-1.5 shrink-0 ring-2 ring-surface" />
            {i < history.length - 1 && (
              <div className="w-px flex-1 bg-border-soft mt-1" />
            )}
          </div>

          {/* Content */}
          <div className="pb-4 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {entry.from_stage ? (
                <>
                  <StageBadge stage={entry.from_stage as Stage} />
                  <span className="text-text-3 text-[11px]">→</span>
                </>
              ) : null}
              <StageBadge stage={entry.to_stage as Stage} />
              {entry.changed_by_agent && (
                <span className="font-mono text-[10px] text-text-3 border border-border px-1 py-0.5 rounded">
                  ✦ AI
                </span>
              )}
            </div>
            {entry.evidence_note && (
              <p className="text-[12px] text-text-2 mt-1 leading-relaxed">
                {entry.evidence_note}
              </p>
            )}
            <p className="font-mono text-[10px] text-text-3 mt-1">
              {new Date(entry.changed_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}


// ── Activities tab ───────────────────────────────────────────

const ACTIVITY_TYPES = [
  { value: 'interview',         label: 'Interview' },
  { value: 'survey',            label: 'Survey' },
  { value: 'observation',       label: 'Observation' },
  { value: 'data_analysis',     label: 'Data analysis' },
  { value: 'prototype_test',    label: 'Prototype test' },
  { value: 'feasibility_check', label: 'Feasibility check' },
  { value: 'other',             label: 'Other' },
]

interface ActivitiesTabProps {
  hypothesisId: string
  activities: TestingActivity[]
  teamMembers: { id: string; full_name: string | null; role: string | null }[]
  currentUserId: string
  onActivityAdded: (activity: TestingActivity) => void
}

function ActivitiesTab({
  hypothesisId,
  activities,
  teamMembers,
  currentUserId,
  onActivityAdded,
}: ActivitiesTabProps) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="pb-5">
      {/* Log new button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-4 w-full border border-dashed border-border rounded-lg py-2.5 text-[12px] text-text-3 hover:border-text-3 hover:text-text-2 transition-colors"
        >
          + Log testing activity
        </button>
      )}

      {/* Inline form */}
      {showForm && (
        <LogActivityForm
          hypothesisId={hypothesisId}
          teamMembers={teamMembers}
          currentUserId={currentUserId}
          onSaved={(a) => {
            onActivityAdded(a)
            setShowForm(false)
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Activity list */}
      {activities.length === 0 ? (
        <p className="text-[13px] text-text-3">No testing activities logged yet.</p>
      ) : (
        <div className="space-y-3">
          {activities.map((a) => (
            <ActivityRow key={a.id} activity={a} teamMembers={teamMembers} />
          ))}
        </div>
      )}
    </div>
  )
}


// ── Activity row ─────────────────────────────────────────────

function ActivityRow({
  activity,
  teamMembers,
}: {
  activity: TestingActivity
  teamMembers: { id: string; full_name: string | null }[]
}) {
  const owner = teamMembers.find((m) => m.id === activity.owner_id)
  const typeLabel = ACTIVITY_TYPES.find((t) => t.value === activity.activity_type)?.label ?? activity.activity_type

  return (
    <div className="bg-surface-2 rounded-lg p-3.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-text-2 bg-surface border border-border-soft px-2 py-0.5 rounded-sm">
            {typeLabel}
          </span>
          <span className={cn(
            'text-[10px] font-medium px-1.5 py-0.5 rounded-sm capitalize',
            activity.status === 'done'        && 'bg-stage-validated text-stage-validated-fg',
            activity.status === 'in_progress' && 'bg-stage-testing text-stage-testing-fg',
            activity.status === 'planned'     && 'bg-stage-captured text-stage-captured-fg',
          )}>
            {activity.status.replace('_', ' ')}
          </span>
          {activity.created_by_agent && (
            <span className="font-mono text-[10px] text-text-3 border border-border px-1 py-0.5 rounded">
              ✦ AI
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] text-text-3 shrink-0">
          {activity.activity_date
            ? new Date(activity.activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : new Date(activity.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }
        </span>
      </div>

      {activity.description && (
        <p className="text-[12px] text-text-2 leading-relaxed">{activity.description}</p>
      )}

      {activity.learning && (
        <div className="border-l-2 border-stage-validated-fg pl-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-stage-validated-fg mb-0.5">
            Learning
          </p>
          <p className="text-[12px] text-text-primary leading-relaxed">{activity.learning}</p>
        </div>
      )}

      {owner && (
        <p className="text-[11px] text-text-3">{owner.full_name}</p>
      )}
    </div>
  )
}


// ── Log activity form ────────────────────────────────────────

interface LogActivityFormProps {
  hypothesisId: string
  teamMembers: { id: string; full_name: string | null; role: string | null }[]
  currentUserId: string
  onSaved: (activity: TestingActivity) => void
  onCancel: () => void
}

function LogActivityForm({
  hypothesisId,
  teamMembers,
  currentUserId,
  onSaved,
  onCancel,
}: LogActivityFormProps) {
  const [activityType, setActivityType] = useState('interview')
  const [description, setDescription] = useState('')
  const [learning, setLearning] = useState('')
  const [status, setStatus] = useState<'planned' | 'in_progress' | 'done'>('done')
  const [ownerId, setOwnerId] = useState(currentUserId)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      await logTestingActivity({
        hypothesis_id: hypothesisId,
        activity_type: activityType as TestingActivity['activity_type'],
        description: description.trim() || undefined,
        learning: learning.trim() || undefined,
        status,
        owner_id: ownerId,
      })

      // Optimistically pass back a mock activity for instant UI update
      onSaved({
        id: crypto.randomUUID(),
        hypothesis_id: hypothesisId,
        activity_type: activityType as TestingActivity['activity_type'],
        description: description.trim() || null,
        learning: learning.trim() || null,
        status,
        owner_id: ownerId,
        created_by_agent: false,
        activity_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-2 rounded-lg p-4 mb-4 space-y-3 border border-border-soft"
    >
      {/* Type + Status row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-text-3 uppercase tracking-[0.06em]">
            Type
          </label>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            className={formSelectCls}
          >
            {ACTIVITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-text-3 uppercase tracking-[0.06em]">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className={formSelectCls}
          >
            <option value="planned">Planned</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-text-3 uppercase tracking-[0.06em]">
          What was done
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ran 5 user interviews on onboarding drop-off…"
          rows={2}
          className={cn(formInputCls, 'resize-none')}
        />
      </div>

      {/* Learning */}
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-text-3 uppercase tracking-[0.06em]">
          What was learned
        </label>
        <textarea
          value={learning}
          onChange={(e) => setLearning(e.target.value)}
          placeholder="Key finding: users drop off at step 3 because…"
          rows={2}
          className={cn(formInputCls, 'resize-none')}
        />
      </div>

      {/* Owner */}
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-text-3 uppercase tracking-[0.06em]">
          Owner
        </label>
        <select
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value)}
          className={formSelectCls}
        >
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name ?? m.id}{m.role ? ` (${m.role})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-[12px] font-medium text-text-2 border border-border rounded-md hover:border-text-3 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-3.5 py-1.5 text-[12px] font-medium bg-text-primary text-background rounded-md hover:opacity-85 disabled:opacity-40 transition-opacity"
        >
          {loading ? 'Logging…' : 'Log activity'}
        </button>
      </div>
    </form>
  )
}

// ── Test type picker ─────────────────────────────────────────

const TEST_TYPES: { value: TestType; label: string }[] = [
  { value: 'survey',    label: 'Survey' },
  { value: 'data',      label: 'Data' },
  { value: 'prototype', label: 'Prototype' },
]

interface TestTypePickerProps {
  value: TestType[]
  onSave: (val: TestType[]) => Promise<void>
}

function TestTypePicker({ value, onSave }: TestTypePickerProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<TestType[]>(value)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function toggle(type: TestType) {
    const next = selected.includes(type)
      ? selected.filter((t) => t !== type)
      : [...selected, type]
    setSelected(next)
    onSave(next)
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 flex-wrap group hover:opacity-75 transition-opacity min-h-[22px]"
      >
        {selected.length === 0 ? (
          <span className="text-[13px] text-text-3">None</span>
        ) : (
          selected.map((t) => (
            <span
              key={t}
              className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium bg-stage-solution text-stage-solution-fg capitalize"
            >
              {t}
            </span>
          ))
        )}
        <span className="text-text-3 opacity-0 group-hover:opacity-100 transition-opacity text-[11px]">
          ✎
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-surface border border-border rounded-lg shadow-card-hover py-1 min-w-[130px]">
          {TEST_TYPES.map((type) => {
            const active = selected.includes(type.value)
            return (
              <button
                key={type.value}
                onClick={() => toggle(type.value)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors',
                  active
                    ? 'text-text-primary'
                    : 'text-text-2 hover:bg-surface-2'
                )}
              >
                {/* Checkbox indicator */}
                <span
                  className={cn(
                    'w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0',
                    active
                      ? 'bg-text-primary border-text-primary'
                      : 'border-border bg-surface'
                  )}
                >
                  {active && (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                {type.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const formInputCls = cn(
  'w-full bg-surface border border-border rounded-md px-2.5 py-1.5',
  'text-[12px] text-text-primary placeholder:text-text-3',
  'focus:outline-none focus:border-text-3 transition-colors'
)

const formSelectCls = cn(
  'w-full bg-surface border border-border rounded-md px-2.5 py-1.5',
  'text-[12px] text-text-primary',
  'focus:outline-none focus:border-text-3 transition-colors appearance-none cursor-pointer'
)

// ── Objectives multi-select picker ───────────────────────────

function ObjectivesPicker({
  hypothesisId,
  objectiveIds,
  objectives,
  onChange,
}: {
  hypothesisId: string
  objectiveIds: string[]
  objectives: Pick<Objective, 'id' | 'title'>[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function toggle(objectiveId: string) {
    const connected = objectiveIds.includes(objectiveId)
    const next = connected
      ? objectiveIds.filter((id) => id !== objectiveId)
      : [...objectiveIds, objectiveId]
    onChange(next)
    if (connected) {
      await disconnectHypothesisFromObjective({ objective_id: objectiveId, hypothesis_id: hypothesisId })
    } else {
      await connectHypothesisToObjective({ objective_id: objectiveId, hypothesis_id: hypothesisId })
    }
  }

  const connectedTitles = objectiveIds
    .map((id) => objectives.find((o) => o.id === id)?.title)
    .filter(Boolean) as string[]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-start gap-1 flex-wrap group hover:opacity-75 transition-opacity min-h-[22px] text-left"
      >
        {connectedTitles.length === 0 ? (
          <span className="text-[13px] text-text-3">None</span>
        ) : (
          connectedTitles.map((title, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium bg-stage-solution text-stage-solution-fg"
            >
              {title}
            </span>
          ))
        )}
        <span className="text-text-3 opacity-0 group-hover:opacity-100 transition-opacity text-[11px]">✎</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-surface border border-border rounded-lg shadow-card-hover py-1 min-w-[220px] max-w-[320px]">
          {objectives.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-text-3">No objectives yet.</p>
          ) : (
            objectives.map((obj) => {
              const active = objectiveIds.includes(obj.id)
              return (
                <button
                  key={obj.id}
                  onClick={() => toggle(obj.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors',
                    active ? 'text-text-primary' : 'text-text-2 hover:bg-surface-2'
                  )}
                >
                  <span className={cn(
                    'w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0',
                    active ? 'bg-text-primary border-text-primary' : 'border-border bg-surface'
                  )}>
                    {active && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  {obj.title}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
