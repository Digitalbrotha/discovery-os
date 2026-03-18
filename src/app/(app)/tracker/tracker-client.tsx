'use client'

import { useState, useTransition, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
const OSTView = dynamic(() => import('@/components/hypothesis/ost-view').then(m => m.OSTView), { ssr: false })
const TestBoard = dynamic(() => import('@/components/hypothesis/test-board').then(m => m.TestBoard), { ssr: false })
const GraphView = dynamic(() => import('@/components/hypothesis/graph-view').then(m => m.GraphView), { ssr: false })
import { PromptBar } from '@/components/hypothesis/prompt-bar'
import { WaitlistButton } from '@/components/shared/waitlist-button'
import { NewHypothesisModal } from '@/components/hypothesis/new-hypothesis-modal'
import { HypothesisDetailModal } from '@/components/hypothesis/hypothesis-detail-modal'
import { fetchHypothesisDetail } from '@/actions/hypotheses-detail'
import { createObjective, updateObjective, deleteObjective } from '@/actions/objectives'
import { cn } from '@/lib/utils'
import type { HypothesisWithOwner, Objective, TestingActivity, StageHistory } from '@/types/database'
import type { HypothesisOST, OSTTest } from '@/components/hypothesis/ost-view'
import type { TestCardData } from '@/components/hypothesis/test-board'

type View = 'tree' | 'board' | '3d' | 'md'

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
          {([['tree', 'Tree'], ['board', 'Board'], ['3d', '3D'], ['md', 'MD']] as [View, string][]).map(([v, label]) => (
            <button
              key={v}
              onClick={() => { setView(v); if (v === 'md') router.refresh() }}
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
      ) : view === 'md' ? (
        <MarkdownView hypotheses={hypotheses as unknown as HypothesisOST[]} objectives={objectives} teamMembers={teamMembers} />
      ) : (
        <GraphView hypotheses={hypotheses as unknown as HypothesisOST[]} />
      )}

      {/* Agent prompt bar */}
      <PromptBar className="mt-6" />

      {/* Waitlist */}
      <div className="mt-6 flex justify-center">
        <WaitlistButton />
      </div>

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


// ── Markdown view ─────────────────────────────────────────────

const STATUS_EMOJI: Record<string, string> = {
  planned: '⬜',
  in_progress: '🔄',
  done: '✅',
}

const STAGE_LABEL: Record<string, string> = {
  captured: 'Captured',
  assumption_testing: 'Assumption Testing',
  solution_exploration: 'Solution Exploration',
  validated: 'Validated',
  invalidated: 'Invalidated',
  parked: 'Parked',
}

const TYPE_LABEL: Record<string, string> = {
  interview: 'Interview', survey: 'Survey', observation: 'Observation',
  data_analysis: 'Data Analysis', prototype_test: 'Prototype Test',
  feasibility_check: 'Feasibility Check', other: 'Type not set',
}

function buildMarkdown(
  hypotheses: HypothesisOST[],
  objectives: Pick<Objective, 'id' | 'title'>[],
  teamMembers: { id: string; full_name: string | null }[],
): string {
  const date = new Date().toISOString().slice(0, 10)
  const lines: string[] = []

  lines.push(`# Discovery OS — Export`)
  lines.push(`*Generated: ${date}*`)
  lines.push('')

  if (objectives.length > 0) {
    lines.push(`## Objectives`)
    objectives.forEach((o) => lines.push(`- ${o.title}`))
    lines.push('')
  }

  lines.push(`## Opportunities`)
  lines.push('')

  hypotheses.forEach((h, hi) => {
    const owner = h.owner?.full_name ?? 'Unassigned'
    const stage = STAGE_LABEL[h.stage] ?? h.stage
    const solutions = (h.hypothesis_solutions ?? []).map((hs) => hs.solutions).filter(Boolean) as NonNullable<HypothesisOST['hypothesis_solutions'][0]['solutions']>[]

    lines.push(`### ${hi + 1}. ${h.title}`)
    lines.push(`- **Stage:** ${stage}`)
    lines.push(`- **Confidence:** ${h.confidence}`)
    lines.push(`- **Owner:** ${owner}`)
    if (h.statement) lines.push(`- **Statement:** ${h.statement}`)
    lines.push(`- **Habit driver:** ${h.habit_driver ? 'Yes' : 'No'}`)
    if (h.habit_driver && h.habit_driver_type && h.habit_driver_type !== 'None') {
      lines.push(`- **Habit type:** ${h.habit_driver_type}`)
    }
    lines.push('')

    if (solutions.length === 0) {
      lines.push(`*No solutions yet.*`)
      lines.push('')
      return
    }

    lines.push(`#### Solutions`)
    lines.push('')

    solutions.forEach((sol, si) => {
      const tests = sol.testing_activities ?? []
      lines.push(`##### ${hi + 1}.${si + 1} ${sol.title}`)
      lines.push(`- **Stage:** ${sol.stage}`)
      if (sol.description) lines.push(`- **Description:** ${sol.description}`)
      lines.push('')

      if (tests.length > 0) {
        lines.push(`###### Assumptions`)
        tests.forEach((t) => {
          const emoji = STATUS_EMOJI[t.status] ?? '⬜'
          const type = TYPE_LABEL[t.activity_type] ?? t.activity_type
          const assignee = teamMembers.find((m) => m.id === (t as OSTTest).owner_id)?.full_name
          const ref = (t as OSTTest).reference_url
          let line = `- ${emoji} ${t.description ?? '(no description)'} — *${type}*`
          if (assignee) line += ` — 👤 ${assignee}`
          if (ref) line += `\n  - 🔗 [Reference](${ref})`
          lines.push(line)
        })
        lines.push('')
      }
    })
  })

  return lines.join('\n')
}

function MarkdownView({
  hypotheses,
  objectives,
  teamMembers,
}: {
  hypotheses: HypothesisOST[]
  objectives: Pick<Objective, 'id' | 'title'>[]
  teamMembers: { id: string; full_name: string | null; role: string | null }[]
}) {
  const [copied, setCopied] = useState(false)
  const markdown = buildMarkdown(hypotheses, objectives, teamMembers)

  function handleCopy() {
    navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl overflow-hidden border border-[#2a2a2a] shadow-xl font-mono">
      {/* Terminal title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1e1e1e] border-b border-[#2a2a2a]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[11px] text-[#666] tracking-wider">discovery-os — obsidian-export.md</span>
        <button
          onClick={handleCopy}
          className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#2a2a2a] text-[#aaa] hover:text-white hover:bg-[#333] transition-colors border border-[#3a3a3a]"
        >
          {copied ? '✓ copied' : '⎘ copy'}
        </button>
      </div>

      {/* Terminal body */}
      <div className="bg-[#161616] px-6 py-5 overflow-x-auto max-h-[620px] overflow-y-auto">
        <pre className="text-[12px] leading-relaxed whitespace-pre-wrap">
          {markdown.split('\n').map((line, i) => {
            let color = '#ccc'
            if (line.startsWith('# ')) color = '#e2c08d'
            else if (line.startsWith('## ')) color = '#89b4fa'
            else if (line.startsWith('### ')) color = '#a6e3a1'
            else if (line.startsWith('#### ')) color = '#74c7ec'
            else if (line.startsWith('##### ')) color = '#cba6f7'
            else if (line.startsWith('###### ')) color = '#f38ba8'
            else if (line.startsWith('- **')) color = '#f9e2af'
            else if (line.startsWith('- ✅')) color = '#a6e3a1'
            else if (line.startsWith('- 🔄')) color = '#f9e2af'
            else if (line.startsWith('- ⬜')) color = '#6c7086'
            else if (line.startsWith('*')) color = '#6c7086'
            return (
              <span key={i} style={{ color }} className="block">{line || '\u00a0'}</span>
            )
          })}
        </pre>
      </div>
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
    label: 'Assumption',
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
            'group relative flex-1 flex items-center gap-3 rounded-lg border px-3.5 py-2.5 border-l-[3px]',
            t.bg,
            t.borderAccent,
          )}
        >
          <span className={cn('text-base leading-none shrink-0', t.iconColor)}>{t.icon}</span>
          <p className="text-[11px] font-semibold text-text-primary tracking-[-0.01em]">{t.label}</p>

          {/* Tooltip on hover */}
          <div className="pointer-events-none absolute left-0 top-full mt-1.5 z-10 w-52 rounded-lg border border-border bg-surface shadow-card px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <p className="text-[11px] text-text-3 leading-snug">{t.description}</p>
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
          try {
            await deleteObjective({ id: objective.id })
            onDeleted(objective.id)
          } catch (e: unknown) {
            if (e instanceof Error && e.message.includes('Demo')) {
              alert('🏖️ Delete is on vacation in demo mode.')
            } else throw e
          }
        })}
        disabled={isPending}
        className="opacity-0 group-hover:opacity-100 text-[11px] text-text-3 hover:text-stage-invalid-fg transition-all disabled:opacity-40"
      >
        Delete
      </button>
    </div>
  )
}
