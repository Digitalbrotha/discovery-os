'use client'

import { useState, useTransition, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
const OSTView = dynamic(() => import('@/components/hypothesis/ost-view').then(m => m.OSTView), { ssr: false })
const TestBoard = dynamic(() => import('@/components/hypothesis/test-board').then(m => m.TestBoard), { ssr: false })
const GraphView = dynamic(() => import('@/components/hypothesis/graph-view').then(m => m.GraphView), { ssr: false })
import { PromptBar } from '@/components/hypothesis/prompt-bar'
import { NewHypothesisModal } from '@/components/hypothesis/new-hypothesis-modal'
import { HypothesisDetailModal } from '@/components/hypothesis/hypothesis-detail-modal'
import { fetchHypothesisDetail } from '@/actions/hypotheses-detail'
import { createObjective, updateObjective, deleteObjective } from '@/actions/objectives'
import { cn } from '@/lib/utils'
import type { HypothesisWithOwner, Objective, TestingActivity, StageHistory } from '@/types/database'
import type { HypothesisOST } from '@/components/hypothesis/ost-view'
import type { TestCardData } from '@/components/hypothesis/test-board'

type View = 'tree' | 'board' | 'list' | '3d'

interface TrackerClientProps {
  hypotheses: HypothesisWithOwner[]
  count: number
  objectives: Pick<Objective, 'id' | 'title'>[]
  teamMembers: { id: string; full_name: string | null; role: string | null }[]
  currentUserId: string
  teamId: string
  teamName: string | null
  companyName: string | null
}

interface DetailState {
  hypothesis: HypothesisWithOwner
  activities: TestingActivity[]
  stageHistory: StageHistory[]
  connectedObjectiveIds: string[]
}

export function TrackerClient({
  hypotheses,
  count,
  objectives: initialObjectives,
  teamMembers,
  currentUserId,
  teamId,
  teamName,
  companyName,
}: TrackerClientProps) {
  const router = useRouter()
  const [view, setView] = useState<View>('tree')
  const [modalOpen, setModalOpen] = useState(false)
  const [detail, setDetail] = useState<DetailState | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [objectives, setObjectives] = useState(initialObjectives)

  async function handleCardClick(hypothesis: HypothesisWithOwner) {
    setDetailLoading(true)
    try {
      const data = await fetchHypothesisDetail(hypothesis.id)
      setDetail({ hypothesis, ...data })
    } finally {
      setDetailLoading(false)
    }
  }
  return (
    <div className="flex flex-col gap-0">

      {/* Page header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-text-primary leading-none">
            Opportunity & Solution Tracker
          </h1>
          <p className="text-[13px] text-text-3 mt-1">
            {count === 0
              ? 'No opportunities yet'
              : `${count} opportunit${count === 1 ? 'y' : 'ies'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 border border-border rounded-md text-[12px] font-medium text-text-2 hover:border-text-3 hover:text-text-primary transition-colors">
            Filter
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="px-3.5 py-1.5 bg-text-primary text-background rounded-md text-[13px] font-medium tracking-[-0.01em] hover:opacity-85 transition-opacity"
          >
            + New opportunity
          </button>
        </div>
      </div>

      {/* Objectives bar */}
      <ObjectivesBar
        objectives={objectives}
        teamId={teamId}
        teamName={teamName}
        companyName={companyName}
        onCreated={(obj) => setObjectives((prev) => [...prev, obj])}
        onUpdated={(id, title) => setObjectives((prev) => prev.map((o) => o.id === id ? { ...o, title } : o))}
        onDeleted={(id) => { setObjectives((prev) => prev.filter((o) => o.id !== id)); router.refresh() }}
      />

      {/* Card types legend */}
      <CardTypesLegend />

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex bg-surface-2 rounded-md p-0.5 gap-0.5">
          {([['tree', 'Tree'], ['board', 'Board'], ['list', 'List'], ['3d', '3D']] as [View, string][]).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-2.5 py-1 rounded text-[12px] font-medium transition-all duration-100',
                view === v
                  ? 'bg-surface text-text-primary shadow-card'
                  : 'text-text-3 hover:text-text-2'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tree / Board / List */}
      {view === 'tree' ? (
        <OSTView
          hypotheses={hypotheses as unknown as HypothesisOST[]}
          onOpportunityClick={handleCardClick}
          onAddOpportunity={() => setModalOpen(true)}
          teamMembers={teamMembers}
        />
      ) : view === 'board' ? (
        <TestBoard
          teamMembers={teamMembers}
          tests={(hypotheses as unknown as HypothesisOST[]).flatMap((h) =>
            (h.hypothesis_solutions ?? []).flatMap((hs) => {
              if (!hs.solutions) return []
              return (hs.solutions.testing_activities ?? []).map((test) => ({
                id: test.id,
                description: test.description,
                status: test.status,
                activity_type: test.activity_type,
                owner_id: (test as { owner_id?: string | null }).owner_id ?? null,
                solutionTitle: hs.solutions!.title,
                opportunityTitle: h.title,
              } satisfies TestCardData))
            })
          )}
        />
      ) : view === '3d' ? (
        <GraphView hypotheses={hypotheses as unknown as HypothesisOST[]} />
      ) : (
        <ListView
          hypotheses={hypotheses as unknown as HypothesisOST[]}
          teamMembers={teamMembers}
          onOpportunityClick={handleCardClick}
          onAddOpportunity={() => setModalOpen(true)}
        />
      )}

      {/* Agent prompt bar */}
      <PromptBar className="mt-6" />

      {/* New hypothesis modal */}
      <NewHypothesisModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        objectives={objectives}
        teamMembers={teamMembers}
        currentUserId={currentUserId}
        teamId={teamId}
      />

      {/* Detail modal */}
      <HypothesisDetailModal
        open={!!detail && !detailLoading}
        hypothesis={detail?.hypothesis ?? null}
        activities={detail?.activities ?? []}
        stageHistory={detail?.stageHistory ?? []}
        connectedObjectiveIds={detail?.connectedObjectiveIds ?? []}
        objectives={objectives}
        teamMembers={teamMembers}
        onClose={() => setDetail(null)}
        onDeleted={() => { setDetail(null); router.refresh() }}
      />
    </div>
  )
}

// ── List view ─────────────────────────────────────────────────

const solutionStageColors: Record<string, string> = {
  exploring: 'text-sky-700 bg-sky-50 border-sky-200',
  design:    'text-violet-700 bg-violet-50 border-violet-200',
  build:     'text-amber-700 bg-amber-50 border-amber-200',
  testing:   'text-orange-700 bg-orange-50 border-orange-200',
  shipped:   'text-emerald-700 bg-emerald-50 border-emerald-200',
}

const testStatusColors: Record<string, string> = {
  planned:     'text-text-3 bg-surface border-border',
  in_progress: 'text-amber-700 bg-amber-50 border-amber-200',
  done:        'text-emerald-700 bg-emerald-50 border-emerald-200',
}

const activityTypeLabels: Record<string, string> = {
  interview: 'Interview', survey: 'Survey', observation: 'Observation',
  data_analysis: 'Data analysis', prototype_test: 'Prototype test',
  feasibility_check: 'Feasibility check', other: 'Type not set',
}

function ListView({
  hypotheses,
  teamMembers,
  onOpportunityClick,
  onAddOpportunity,
}: {
  hypotheses: HypothesisOST[]
  teamMembers: { id: string; full_name: string | null; role: string | null }[]
  onOpportunityClick: (h: HypothesisWithOwner) => void
  onAddOpportunity: () => void
}) {
  if (hypotheses.length === 0) {
    return (
      <div className="py-16 text-center text-[13px] text-text-3">
        No opportunities yet.{' '}
        <button onClick={onAddOpportunity} className="underline underline-offset-2 hover:text-text-2 transition-colors">
          Create your first one.
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-px rounded-xl border border-border-soft overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_120px_100px_130px_80px] gap-0 bg-surface-2 border-b border-border">
        {['Item', 'Stage / Status', 'Type', 'Owner / Assignee', 'Updated'].map((label) => (
          <div key={label} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3">
            {label}
          </div>
        ))}
      </div>

      {hypotheses.map((h, hi) => {
        const solutions = (h.hypothesis_solutions ?? []).map((hs) => hs.solutions).filter((s): s is NonNullable<typeof s> => s !== null)

        return (
          <div key={h.id} className={cn(hi > 0 && 'border-t border-border-soft')}>
            {/* Opportunity row */}
            <div
              onClick={() => onOpportunityClick(h)}
              className="grid grid-cols-[1fr_120px_100px_130px_80px] items-center bg-surface hover:bg-emerald-50/30 cursor-pointer transition-colors border-l-[3px] border-l-emerald-500"
            >
              <div className="px-4 py-3 flex items-center gap-2 min-w-0">
                <span className="text-[13px] font-semibold text-text-primary leading-snug line-clamp-1">{h.title}</span>
                {h.created_by_agent && (
                  <span className="shrink-0 font-mono text-[10px] text-text-3 border border-border px-1 py-0.5 rounded">✦ AI</span>
                )}
                <span className="shrink-0 ml-auto text-[10px] font-semibold uppercase tracking-[0.07em] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  Opportunity
                </span>
              </div>
              <div className="px-4 py-3">
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded border text-emerald-700 bg-emerald-50 border-emerald-200 capitalize">
                  {h.stage.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="px-4 py-3 text-[12px] text-text-3 capitalize">{h.confidence}</div>
              <div className="px-4 py-3 text-[12px] text-text-2">{h.owner?.full_name ?? '—'}</div>
              <div className="px-4 py-3 font-mono text-[11px] text-text-3">
                {new Date(h.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>

            {/* Solution rows */}
            {solutions.map((sol) => {
              const tests = sol.testing_activities ?? []

              return (
                <div key={sol.id}>
                  {/* Solution row */}
                  <div className="grid grid-cols-[1fr_120px_100px_130px_80px] items-center bg-background hover:bg-sky-50/30 cursor-default transition-colors border-l-[3px] border-l-sky-500 border-t border-border-soft">
                    <div className="px-4 pl-10 py-2.5 flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                      <span className="text-[12px] font-medium text-text-primary leading-snug line-clamp-1">{sol.title}</span>
                      <span className="shrink-0 ml-auto text-[10px] font-semibold uppercase tracking-[0.07em] text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                        Solution
                      </span>
                    </div>
                    <div className="px-4 py-2.5">
                      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize', solutionStageColors[sol.stage] ?? 'text-text-3 bg-surface border-border')}>
                        {sol.stage}
                      </span>
                    </div>
                    <div className="px-4 py-2.5 text-[11px] text-text-3">{tests.length} test{tests.length !== 1 ? 's' : ''}</div>
                    <div className="px-4 py-2.5" />
                    <div className="px-4 py-2.5" />
                  </div>

                  {/* Test rows */}
                  {tests.map((test) => {
                    const assignee = teamMembers.find((m) => m.id === test.owner_id)?.full_name ?? null
                    return (
                      <div
                        key={test.id}
                        className="grid grid-cols-[1fr_120px_100px_130px_80px] items-center bg-background hover:bg-amber-50/20 transition-colors border-l-[3px] border-l-amber-400 border-t border-border-soft/60"
                      >
                        <div className="px-4 pl-16 py-2 flex items-center gap-2 min-w-0">
                          <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                          <span className="text-[12px] text-text-primary line-clamp-1">{test.description ?? '(no description)'}</span>
                        </div>
                        <div className="px-4 py-2">
                          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize', testStatusColors[test.status] ?? testStatusColors.planned)}>
                            {test.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="px-4 py-2 text-[11px] text-text-3">
                          {activityTypeLabels[test.activity_type] ?? test.activity_type.replace(/_/g, ' ')}
                        </div>
                        <div className="px-4 py-2 text-[11px] text-text-2">
                          {assignee ? (
                            <span className="text-[10px] bg-surface-2 border border-border px-1.5 py-0.5 rounded-full">{assignee}</span>
                          ) : '—'}
                        </div>
                        <div className="px-4 py-2" />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── Objectives bar ────────────────────────────────────────────

function ObjectivesBar({
  objectives,
  teamId,
  teamName,
  companyName,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  objectives: Pick<Objective, 'id' | 'title'>[]
  teamId: string
  teamName: string | null
  companyName: string | null
  onCreated: (obj: Pick<Objective, 'id' | 'title'>) => void
  onUpdated: (id: string, title: string) => void
  onDeleted: (id: string) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleCreate() {
    const title = newTitle.trim()
    if (!title) return
    startTransition(async () => {
      const obj = await createObjective({ title, team_id: teamId })
      onCreated({ id: obj.id, title: obj.title })
      setNewTitle('')
      setShowForm(false)
    })
  }

  return (
    <div className="mb-4 bg-surface border border-border-soft rounded-lg px-4 py-3">
      {/* Company row */}
      <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border-soft">
        <span className="w-5 h-5 rounded flex items-center justify-center bg-text-primary/10 text-[11px] shrink-0">🏢</span>
        <p className="text-[13px] font-semibold text-text-primary leading-none truncate">
          {companyName && (
            <>
              <span>{companyName}</span>
              <span className="mx-1.5 font-normal text-text-3">·</span>
            </>
          )}
          <span>{teamName ?? 'My team'}</span>
        </p>
      </div>

      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
          Objectives · {objectives.length}
        </p>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-[11px] text-text-3 hover:text-text-primary transition-colors"
          >
            + New
          </button>
        )}
      </div>

      {objectives.length === 0 && !showForm && (
        <p className="text-[12px] text-text-3">No objectives yet. Add one to link hypotheses to goals.</p>
      )}

      {objectives.length > 0 && (
        <div className="space-y-1 mb-2">
          {objectives.map((obj) => (
            <ObjectiveRow key={obj.id} objective={obj} onUpdated={onUpdated} onDeleted={onDeleted} />
          ))}
        </div>
      )}

      {showForm && (
        <div className="flex items-center gap-2 mt-2">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Increase activation rate"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') { setShowForm(false); setNewTitle('') }
            }}
            className="flex-1 bg-background border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text-primary placeholder:text-text-3 focus:outline-none focus:border-text-3 transition-colors"
          />
          <button
            onClick={handleCreate}
            disabled={!newTitle.trim() || isPending}
            className="px-3 py-1.5 text-[12px] font-medium bg-text-primary text-background rounded-md hover:opacity-85 disabled:opacity-40 transition-opacity"
          >
            Add
          </button>
          <button
            onClick={() => { setShowForm(false); setNewTitle('') }}
            className="px-3 py-1.5 text-[12px] font-medium text-text-2 border border-border rounded-md hover:border-text-3 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

// ── Card types legend ─────────────────────────────────────────

const CARD_TYPES = [
  {
    label: 'Opportunity',
    icon: '◉',
    iconColor: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    borderAccent: 'border-l-emerald-500',
    description: 'A customer problem, need, or market gap worth exploring.',
  },
  {
    label: 'Solution',
    icon: '◆',
    iconColor: 'text-sky-600',
    bg: 'bg-sky-50 border-sky-200',
    borderAccent: 'border-l-sky-500',
    description: 'A proposed way to address an opportunity — tracked through stages.',
  },
  {
    label: 'Assumption test',
    icon: '⬡',
    iconColor: 'text-amber-500',
    bg: 'bg-amber-50 border-amber-200',
    borderAccent: 'border-l-amber-400',
    description: 'An experiment that validates or invalidates a key assumption in a solution.',
  },
] as const

function CardTypesLegend() {
  return (
    <div className="mb-4 flex gap-3">
      {CARD_TYPES.map((t) => (
        <div
          key={t.label}
          className={cn(
            'flex-1 flex items-start gap-3 rounded-lg border px-3.5 py-2.5 border-l-[3px]',
            t.bg,
            t.borderAccent,
          )}
        >
          <span className={cn('text-base leading-none mt-0.5 shrink-0', t.iconColor)}>{t.icon}</span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-text-primary tracking-[-0.01em]">{t.label}</p>
            <p className="text-[11px] text-text-3 mt-0.5 leading-snug">{t.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function ObjectiveRow({
  objective,
  onUpdated,
  onDeleted,
}: {
  objective: Pick<Objective, 'id' | 'title'>
  onUpdated: (id: string, title: string) => void
  onDeleted: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(objective.title)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(objective.title)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commit() {
    const title = draft.trim()
    if (!title || title === objective.title) { setEditing(false); return }
    startTransition(async () => {
      await updateObjective({ id: objective.id, title })
      onUpdated(objective.id, title)
      setEditing(false)
    })
  }

  function cancel() {
    setDraft(objective.title)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-stage-solution-fg shrink-0" />
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') cancel()
          }}
          onBlur={commit}
          disabled={isPending}
          className="flex-1 bg-background border border-border rounded px-2 py-0.5 text-[12px] text-text-primary focus:outline-none focus:border-text-3 transition-colors disabled:opacity-50"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-stage-solution-fg shrink-0" />
      <span
        onClick={startEdit}
        className="flex-1 text-[12px] text-text-primary cursor-text hover:text-text-primary rounded px-1 -ml-1 hover:bg-surface-2 transition-colors"
        title="Click to rename"
      >
        {objective.title}
      </span>
      <button
        onClick={() => startTransition(async () => {
          await deleteObjective({ id: objective.id })
          onDeleted(objective.id)
        })}
        disabled={isPending}
        className="opacity-0 group-hover:opacity-100 text-[11px] text-text-3 hover:text-stage-invalid-fg transition-all disabled:opacity-40"
      >
        Delete
      </button>
    </div>
  )
}
