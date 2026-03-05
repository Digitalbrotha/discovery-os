'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createHypothesis } from '@/actions/hypotheses'
import { cn } from '@/lib/utils'
import { STAGE_LABELS, CONFIDENCE_LABELS } from '@/lib/constants'
import { Select } from '@/components/shared/select'
import type { Stage, Confidence, Objective } from '@/types/database'

interface NewHypothesisModalProps {
  open: boolean
  onClose: () => void
  objectives: Pick<Objective, 'id' | 'title'>[]
  currentUserId: string
  teamMembers: { id: string; full_name: string | null; role: string | null }[]
  teamId: string
}

const STAGES: Stage[] = ['captured','assumption_testing','solution_exploration','validated','invalidated','parked']
const CONFIDENCES: Confidence[] = ['low', 'medium', 'high']

export function NewHypothesisModal({ open, onClose, objectives, currentUserId, teamMembers, teamId }: NewHypothesisModalProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [statement, setStatement] = useState('')
  const [stage, setStage] = useState<Stage>('captured')
  const [confidence, setConfidence] = useState<Confidence>('low')
  const [objectiveId, setObjectiveId] = useState('')
  const [ownerId, setOwnerId] = useState(currentUserId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) setTimeout(() => titleRef.current?.focus(), 50) }, [open])
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function reset() {
    setTitle(''); setStatement(''); setStage('captured'); setConfidence('low')
    setObjectiveId(''); setOwnerId(currentUserId); setError(null)
  }
  function handleClose() { reset(); onClose() }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true); setError(null)
    try {
      await createHypothesis({
        title: title.trim(),
        statement: statement.trim() || undefined,
        stage,
        confidence,
        owner_id: ownerId || undefined,
        objective_id: objectiveId || undefined,
        team_id: teamId || undefined,
      })
      handleClose()
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  if (!open) return null

  const stageOptions = STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))
  const confidenceOptions = CONFIDENCES.map((c) => ({ value: c, label: CONFIDENCE_LABELS[c] }))
  const objectiveOptions = [{ value: '', label: 'None' }, ...objectives.map((o) => ({ value: o.id, label: o.title }))]
  const ownerOptions = teamMembers.map((m) => ({ value: m.id, label: `${m.full_name ?? m.id}${m.role ? ` (${m.role})` : ''}` }))

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={handleClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="fixed z-50 inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-lg bg-surface rounded-xl border border-border shadow-card-hover pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border-soft">
            <h2 id="modal-title" className="text-[15px] font-semibold tracking-[-0.02em] text-text-primary">New opportunity</h2>
            <button onClick={handleClose} className="text-text-3 hover:text-text-2 transition-colors text-lg leading-none" aria-label="Close">×</button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <Field label="Title" required>
              <input ref={titleRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short descriptive title" required className={inputCls} />
            </Field>

            <Field label="Opportunity statement">
              <textarea value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="We believe that… for… We'll know this is true when…" rows={3} className={cn(inputCls, 'resize-none leading-relaxed')} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Stage">
                <Select value={stage} options={stageOptions} onChange={(v) => setStage(v as Stage)} />
              </Field>
              <Field label="Confidence">
                <Select value={confidence} options={confidenceOptions} onChange={(v) => setConfidence(v as Confidence)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Connected objective">
                <Select value={objectiveId} options={objectiveOptions} onChange={setObjectiveId} />
              </Field>
              <Field label="Owner">
                <Select value={ownerId} options={ownerOptions} onChange={setOwnerId} />
              </Field>
            </div>

            {error && (
              <p className="text-[12px] text-stage-invalid-fg bg-stage-invalid px-3 py-2 rounded-md">{error}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={handleClose} className="px-3.5 py-1.5 text-[13px] font-medium text-text-2 border border-border rounded-md hover:border-text-3 hover:text-text-primary transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading || !title.trim()} className="px-4 py-1.5 text-[13px] font-medium bg-text-primary text-background rounded-md hover:opacity-85 disabled:opacity-40 transition-opacity">
                {loading ? 'Creating…' : 'Create opportunity'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-medium text-text-2">
        {label}{required && <span className="text-stage-invalid-fg ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = cn(
  'w-full bg-background border border-border rounded-md px-3 py-2',
  'text-[13px] text-text-primary placeholder:text-text-3',
  'focus:outline-none focus:border-text-3 transition-colors'
)