'use client'

import { useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
const KanbanBoard = dynamic(() => import('@/components/hypothesis/kanban-board').then(m => m.KanbanBoard), { ssr: false })
import { PromptBar } from '@/components/hypothesis/prompt-bar'
import { NewHypothesisModal } from '@/components/hypothesis/new-hypothesis-modal'
import { HypothesisDetailModal } from '@/components/hypothesis/hypothesis-detail-modal'
import { fetchHypothesisDetail } from '@/actions/hypotheses-detail'
import { createObjective, deleteObjective } from '@/actions/objectives'
import { cn } from '@/lib/utils'
import type { HypothesisWithOwner, Objective, TestingActivity, StageHistory } from '@/types/database'

type View = 'board' | 'list'

interface TrackerClientProps {
  hypotheses: HypothesisWithOwner[]
  count: number
  objectives: Pick<Objective, 'id' | 'title'>[]
  teamMembers: { id: string; full_name: string | null; role: string | null }[]
  currentUserId: string
  teamId: string
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
}: TrackerClientProps) {
  const router = useRouter()
  const [view, setView] = useState<View>('board')
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
            Opportunity Tracker
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
        onCreated={(obj) => setObjectives((prev) => [...prev, obj])}
        onDeleted={(id) => { setObjectives((prev) => prev.filter((o) => o.id !== id)); router.refresh() }}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex bg-surface-2 rounded-md p-0.5 gap-0.5">
          {(['board', 'list'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-2.5 py-1 rounded text-[12px] font-medium transition-all duration-100 capitalize',
                view === v
                  ? 'bg-surface text-text-primary shadow-card'
                  : 'text-text-3 hover:text-text-2'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Board or List */}
      {view === 'board' ? (
        <KanbanBoard hypotheses={hypotheses} onCardClick={handleCardClick} />
      ) : (
        <div className="rounded-lg border border-border-soft overflow-hidden">
          {hypotheses.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-text-3">
              No opportunities yet.{' '}
              <button
                onClick={() => setModalOpen(true)}
                className="underline underline-offset-2 hover:text-text-2 transition-colors"
              >
                Create your first one.
              </button>
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  {['Opportunity', 'Stage', 'Confidence', 'Owner', 'Updated'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hypotheses.map((h, i) => (
                  <tr
                    key={h.id}
                    onClick={() => handleCardClick(h)}
                    className={cn(
                      'border-b border-border-soft hover:bg-surface-2 cursor-pointer transition-colors',
                      i === hypotheses.length - 1 && 'border-b-0'
                    )}
                  >
                    <td className="px-4 py-3 text-text-primary font-medium tracking-[-0.01em] max-w-xs">
                      <span className="line-clamp-2">{h.title}</span>
                      {h.created_by_agent && (
                        <span className="ml-2 font-mono text-[10px] text-text-3 border border-border px-1 py-0.5 rounded">
                          ✦ AI
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-sm bg-stage-captured text-stage-captured-fg">
                        {h.stage.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-2 capitalize">{h.confidence}</td>
                    <td className="px-4 py-3 text-text-2">{h.owner?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-text-3">
                      {new Date(h.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
      />
    </div>
  )
}

// ── Objectives bar ────────────────────────────────────────────

function ObjectivesBar({
  objectives,
  teamId,
  onCreated,
  onDeleted,
}: {
  objectives: Pick<Objective, 'id' | 'title'>[]
  teamId: string
  onCreated: (obj: Pick<Objective, 'id' | 'title'>) => void
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
            <ObjectiveRow key={obj.id} objective={obj} onDeleted={onDeleted} />
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

function ObjectiveRow({
  objective,
  onDeleted,
}: {
  objective: Pick<Objective, 'id' | 'title'>
  onDeleted: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-2 group py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-stage-solution-fg shrink-0" />
      <span className="flex-1 text-[12px] text-text-primary">{objective.title}</span>
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
