'use client'

import { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { createSolution, createTestForSolution, updateSolution, updateTestingActivity, deleteSolution, deleteTestingActivity } from '@/actions/solutions'
import { cn } from '@/lib/utils'
import type { HypothesisWithOwner, SolutionStage, ActivityType, ActivityStatus } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────

export type OSTTest = {
  id: string
  activity_type: ActivityType
  description: string | null
  status: ActivityStatus
  owner_id: string | null
  reference_url: string | null
  created_at: string
}

export type TeamMember = { id: string; full_name: string | null; role: string | null }

export type OSTSolution = {
  id: string
  title: string
  description: string | null
  stage: SolutionStage
  created_at: string
  testing_activities: OSTTest[]
}

export type HypothesisOST = HypothesisWithOwner & {
  hypothesis_solutions: Array<{ solutions: OSTSolution | null }>
}

// ── Shared styles ─────────────────────────────────────────────

const inputCls = 'w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] text-text-primary placeholder:text-text-3 focus:outline-none focus:border-text-3 transition-colors'
const selectCls = 'w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-text-3 transition-colors'

// ── Root view ─────────────────────────────────────────────────

export function OSTView({
  hypotheses,
  onOpportunityClick,
  onAddOpportunity,
  teamMembers,
}: {
  hypotheses: HypothesisOST[]
  onOpportunityClick: (h: HypothesisWithOwner) => void
  onAddOpportunity: () => void
  teamMembers: TeamMember[]
}) {
  if (hypotheses.length === 0) {
    return (
      <div className="py-16 text-center text-[13px] text-text-3">
        No opportunities yet.{' '}
        <button
          onClick={onAddOpportunity}
          className="underline underline-offset-2 hover:text-text-2 transition-colors"
        >
          Create your first one.
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {hypotheses.map((h) => (
        <OpportunityNode
          key={h.id}
          hypothesis={h}
          teamMembers={teamMembers}
          onClick={() => onOpportunityClick(h)}
        />
      ))}
    </div>
  )
}

// ── Opportunity node ──────────────────────────────────────────

function OpportunityNode({ hypothesis, onClick, teamMembers }: { hypothesis: HypothesisOST; onClick: () => void; teamMembers: TeamMember[] }) {
  const [expanded, setExpanded] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [isPending, startTransition] = useTransition()
  const [solutions, setSolutions] = useState<OSTSolution[]>(
    (hypothesis.hypothesis_solutions ?? []).map((hs) => hs.solutions).filter(Boolean) as OSTSolution[]
  )

  function handleAddSolution() {
    const title = newTitle.trim()
    if (!title) return
    startTransition(async () => {
      const sol = await createSolution({ title, hypothesis_id: hypothesis.id })
      setSolutions((prev) => [...prev, { ...sol, description: sol.description ?? null, testing_activities: [] }])
      setNewTitle('')
      setShowAdd(false)
    })
  }

  return (
    <div className="rounded-xl border border-border bg-surface shadow-card overflow-hidden">
      <div onClick={onClick} className="flex items-start gap-2.5 px-4 py-3.5 border-l-[3px] border-l-emerald-500 cursor-pointer hover:bg-emerald-50/40 transition-colors">
        <button onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }} className="mt-0.5 shrink-0 text-text-3 hover:text-text-2 transition-colors">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 justify-between">
            <span className="text-[14px] font-semibold text-text-primary leading-snug">
              {hypothesis.title}
            </span>
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.07em] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              Opportunity
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-[11px] text-text-3 capitalize">{hypothesis.stage.replace(/_/g, ' ')}</span>
            <span className="text-[11px] text-text-3">{hypothesis.confidence} confidence</span>
            {hypothesis.owner?.full_name && <span className="text-[11px] text-text-3">{hypothesis.owner.full_name}</span>}
            <span className="text-[11px] text-text-3">{solutions.length} solution{solutions.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="bg-background border-t border-border-soft px-4 py-3 space-y-2.5">
          {solutions.map((sol) => (
            <SolutionNode
              key={sol.id}
              solution={sol}
              hypothesisId={hypothesis.id}
              teamMembers={teamMembers}
              onUpdated={(updated) => setSolutions((prev) => prev.map((s) => s.id === updated.id ? { ...s, ...updated } : s))}
              onDeleted={(id) => setSolutions((prev) => prev.filter((s) => s.id !== id))}
            />
          ))}

          {showAdd ? (
            <div className="flex items-center gap-2 ml-5">
              <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSolution(); if (e.key === 'Escape') { setShowAdd(false); setNewTitle('') } }}
                placeholder="Solution title…"
                className="flex-1 bg-surface border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text-primary placeholder:text-text-3 focus:outline-none focus:border-sky-400 transition-colors"
              />
              <button onClick={handleAddSolution} disabled={!newTitle.trim() || isPending} className="px-3 py-1.5 text-[12px] font-medium bg-sky-600 text-white rounded-md hover:bg-sky-500 disabled:opacity-40 transition-colors">Add</button>
              <button onClick={() => { setShowAdd(false); setNewTitle('') }} className="px-3 py-1.5 text-[12px] text-text-2 border border-border rounded-md hover:border-text-3 transition-colors">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-[12px] text-text-3 hover:text-sky-600 transition-colors ml-5 py-0.5">
              <Plus className="w-3.5 h-3.5" /> Add solution
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Solution node ─────────────────────────────────────────────

const solutionStageColors: Record<SolutionStage, string> = {
  exploring: 'text-sky-700 bg-sky-50 border-sky-200',
  design:    'text-violet-700 bg-violet-50 border-violet-200',
  build:     'text-amber-700 bg-amber-50 border-amber-200',
  testing:   'text-orange-700 bg-orange-50 border-orange-200',
  shipped:   'text-emerald-700 bg-emerald-50 border-emerald-200',
}

const SOLUTION_STAGES: SolutionStage[] = ['exploring', 'design', 'build', 'testing', 'shipped']

function SolutionNode({
  solution,
  hypothesisId,
  onUpdated,
  onDeleted,
  teamMembers,
}: {
  solution: OSTSolution
  hypothesisId: string
  onUpdated: (updated: Partial<OSTSolution> & { id: string }) => void
  onDeleted: (id: string) => void
  teamMembers: TeamMember[]
}) {
  const [expanded, setExpanded] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingTest, setEditingTest] = useState<OSTTest | null>(null)
  const [editingSolution, setEditingSolution] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [tests, setTests] = useState<OSTTest[]>(solution.testing_activities ?? [])
  const [localSolution, setLocalSolution] = useState(solution)

  function handleAddTest() {
    const title = newTitle.trim()
    if (!title) return
    startTransition(async () => {
      await createTestForSolution({ title, solution_id: solution.id, hypothesis_id: hypothesisId })
      const optimistic: OSTTest = {
        id: crypto.randomUUID(),
        description: title,
        activity_type: 'other',
        status: 'planned',
        owner_id: null,
        reference_url: null,
        created_at: new Date().toISOString(),
      }
      setTests((prev) => [...prev, optimistic])
      setNewTitle('')
      setShowAdd(false)
    })
  }

  return (
    <>
    <div className="ml-5 rounded-lg border border-border bg-surface overflow-hidden">
      <div onClick={() => setEditingSolution(true)} className="flex items-start gap-2 px-3 py-2.5 border-l-[3px] border-l-sky-500 cursor-pointer hover:bg-sky-50/40 transition-colors">
        <button onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }} className="mt-0.5 shrink-0 text-text-3 hover:text-text-2 transition-colors">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 justify-between">
            <span className="text-[13px] font-medium text-text-primary leading-snug">
              {localSolution.title}
            </span>
            <span className={cn('shrink-0 text-[10px] font-semibold uppercase tracking-[0.07em] px-1.5 py-0.5 rounded border', solutionStageColors[localSolution.stage])}>
              {localSolution.stage}
            </span>
          </div>
          {localSolution.description && <p className="text-[11px] text-text-3 mt-0.5 leading-relaxed">{localSolution.description}</p>}
          <span className="text-[11px] text-text-3 mt-0.5 block">{tests.length} test{tests.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {expanded && (
        <div className="bg-background border-t border-border-soft px-3 py-2 space-y-1.5">
          {tests.map((test) => (
            <TestNode
              key={test.id}
              test={test}
              assigneeName={teamMembers.find((m) => m.id === test.owner_id)?.full_name ?? null}
              onClick={() => setEditingTest(test)}
            />
          ))}

          {showAdd ? (
            <div className="flex items-center gap-2 ml-4">
              <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTest(); if (e.key === 'Escape') { setShowAdd(false); setNewTitle('') } }}
                placeholder="Assumption…"
                className="flex-1 bg-surface border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text-primary placeholder:text-text-3 focus:outline-none focus:border-amber-400 transition-colors"
              />
              <button onClick={handleAddTest} disabled={!newTitle.trim() || isPending} className="px-3 py-1.5 text-[12px] font-medium bg-amber-500 text-white rounded-md hover:bg-amber-400 disabled:opacity-40 transition-colors">Add</button>
              <button onClick={() => { setShowAdd(false); setNewTitle('') }} className="px-3 py-1.5 text-[12px] text-text-2 border border-border rounded-md hover:border-text-3 transition-colors">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-[11px] text-text-3 hover:text-amber-600 transition-colors ml-4 py-0.5">
              <Plus className="w-3 h-3" /> Add assumption
            </button>
          )}
        </div>
      )}
    </div>

    {editingSolution && (
      <SolutionEditModal
        solution={localSolution}
        onClose={() => setEditingSolution(false)}
        onSaved={(updated) => {
          setLocalSolution((prev) => ({ ...prev, ...updated }))
          onUpdated({ id: solution.id, ...updated })
          setEditingSolution(false)
        }}
        onDeleted={() => { setEditingSolution(false); onDeleted(solution.id) }}
      />
    )}

    {editingTest && (
      <TestEditModal
        test={editingTest}
        solutionTitle={localSolution.title}
        teamMembers={teamMembers}
        onClose={() => setEditingTest(null)}
        onSaved={(updated) => {
          setTests((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t))
          setEditingTest(null)
        }}
        onDeleted={(id) => { setTests((prev) => prev.filter((t) => t.id !== id)); setEditingTest(null) }}
      />
    )}
    </>
  )
}

// ── Test node ─────────────────────────────────────────────────

const testStatusColors: Record<string, string> = {
  planned:     'text-text-3 bg-surface border-border',
  in_progress: 'text-amber-700 bg-amber-50 border-amber-200',
  done:        'text-emerald-700 bg-emerald-50 border-emerald-200',
}

function TestNode({ test, assigneeName, onClick }: { test: OSTTest; assigneeName: string | null; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="ml-4 flex items-start gap-2 px-3 py-2 rounded-md border border-border-soft border-l-[3px] border-l-amber-400 bg-surface cursor-pointer hover:shadow-card-hover hover:-translate-y-px transition-all duration-150"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 justify-between">
          <span className="text-[12px] text-text-primary leading-snug">{test.description ?? '(no description)'}</span>
          <span className={cn('shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize', testStatusColors[test.status] ?? testStatusColors.planned)}>
            {test.status.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px] text-text-3">{activityTypeLabels[test.activity_type] ?? test.activity_type.replace(/_/g, ' ')}</span>
          {assigneeName && (
            <span className="text-[10px] text-text-3 bg-surface-2 border border-border px-1.5 py-0.5 rounded-full">
              {assigneeName}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Solution edit modal ───────────────────────────────────────

function SolutionEditModal({
  solution,
  onClose,
  onSaved,
  onDeleted,
}: {
  solution: OSTSolution
  onClose: () => void
  onSaved: (updated: Partial<OSTSolution>) => void
  onDeleted: () => void
}) {
  const [title, setTitle] = useState(solution.title)
  const [description, setDescription] = useState(solution.description ?? '')
  const [stage, setStage] = useState<SolutionStage>(solution.stage)
  const [isPending, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  function handleSave() {
    startTransition(async () => {
      await updateSolution({ solution_id: solution.id, title: title.trim(), description: description.trim(), stage })
      onSaved({ title: title.trim(), description: description.trim() || null, stage })
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteSolution({ solution_id: solution.id })
      onDeleted()
    })
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-lg bg-surface rounded-xl border border-border shadow-card-hover" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border-soft">
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-text-primary">Edit solution</h2>
          <button onClick={onClose} className="text-text-3 hover:text-text-2 transition-colors text-lg leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Title</label>
            <input autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this solution do?" rows={3} className={cn(inputCls, 'resize-none leading-relaxed')} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Stage</label>
            <select value={stage} onChange={(e) => setStage(e.target.value as SolutionStage)} className={selectCls}>
              {SOLUTION_STAGES.map((s) => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        {confirmDelete ? (
          <div className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[13px] text-red-700 font-medium mb-2.5">Are you sure you want to delete this solution?</p>
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={isPending} className="px-3.5 py-1.5 text-[13px] font-medium bg-red-600 text-white rounded-md hover:bg-red-500 disabled:opacity-40 transition-colors">
                {isPending ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-3.5 py-1.5 text-[13px] font-medium text-text-2 border border-border rounded-md hover:border-text-3 transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-5 pb-5">
            <button onClick={() => setConfirmDelete(true)} className="text-[13px] text-red-500 hover:text-red-600 transition-colors">Delete</button>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-3.5 py-1.5 text-[13px] font-medium text-text-2 border border-border rounded-md hover:border-text-3 hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={isPending || !title.trim()} className="px-4 py-1.5 text-[13px] font-medium bg-text-primary text-background rounded-md hover:opacity-85 disabled:opacity-40 transition-opacity">
                {isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// ── Test edit modal ───────────────────────────────────────────

const ACTIVITY_TYPES: ActivityType[] = ['interview', 'survey', 'observation', 'data_analysis', 'prototype_test', 'feasibility_check', 'other']
const activityTypeLabels: Record<ActivityType, string> = {
  interview: 'Interview', survey: 'Survey', observation: 'Observation',
  data_analysis: 'Data analysis', prototype_test: 'Prototype test',
  feasibility_check: 'Feasibility check', other: 'Type not set',
}
const STATUS_OPTIONS: { value: ActivityStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

function TestEditModal({
  test,
  solutionTitle,
  teamMembers,
  onClose,
  onSaved,
  onDeleted,
}: {
  test: OSTTest
  solutionTitle: string
  teamMembers: TeamMember[]
  onClose: () => void
  onSaved: (updated: Partial<OSTTest> & { id: string }) => void
  onDeleted: (id: string) => void
}) {
  const [description, setDescription] = useState(test.description ?? '')
  const [activityType, setActivityType] = useState<ActivityType>(test.activity_type)
  const [status, setStatus] = useState<ActivityStatus>(test.status)
  const [learning, setLearning] = useState('')
  const [ownerId, setOwnerId] = useState<string>(test.owner_id ?? '')
  const [referenceUrl, setReferenceUrl] = useState(test.reference_url ?? '')
  const [isPending, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
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
        reference_url: referenceUrl.trim() || null,
      })
      onSaved({ id: test.id, description: description.trim() || null, activity_type: activityType, status, owner_id: ownerId || null, reference_url: referenceUrl.trim() || null })
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTestingActivity({ test_id: test.id })
      onDeleted(test.id)
    })
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-lg bg-surface rounded-xl border border-border shadow-card-hover" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border-soft">
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-text-primary">Edit assumption</h2>
          <button onClick={onClose} className="text-text-3 hover:text-text-2 transition-colors text-lg leading-none">×</button>
        </div>
        <div className="px-5 pt-3 flex items-center gap-1.5 text-[11px] text-text-3">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
          <span className="truncate">{solutionTitle}</span>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Description</label>
            <input autoFocus type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What are you testing?" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Type</label>
              <select value={activityType} onChange={(e) => setActivityType(e.target.value as ActivityType)} className={selectCls}>
                {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{activityTypeLabels[t]}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ActivityStatus)} className={selectCls}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Reference link</label>
            <input
              type="url"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
            {referenceUrl.trim() && (
              <a
                href={referenceUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:underline"
              >
                ↗ Open link
              </a>
            )}
          </div>
        </div>
        {confirmDelete ? (
          <div className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[13px] text-red-700 font-medium mb-2.5">Are you sure you want to delete this assumption?</p>
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={isPending} className="px-3.5 py-1.5 text-[13px] font-medium bg-red-600 text-white rounded-md hover:bg-red-500 disabled:opacity-40 transition-colors">
                {isPending ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-3.5 py-1.5 text-[13px] font-medium text-text-2 border border-border rounded-md hover:border-text-3 transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-5 pb-5">
            <button onClick={() => setConfirmDelete(true)} className="text-[13px] text-red-500 hover:text-red-600 transition-colors">Delete</button>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-3.5 py-1.5 text-[13px] font-medium text-text-2 border border-border rounded-md hover:border-text-3 hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={isPending} className="px-4 py-1.5 text-[13px] font-medium bg-text-primary text-background rounded-md hover:opacity-85 disabled:opacity-40 transition-opacity">
                {isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
