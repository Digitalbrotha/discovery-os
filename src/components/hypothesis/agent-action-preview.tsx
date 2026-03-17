'use client'

import { cn } from '@/lib/utils'
import { StageBadge, ConfidenceBadge } from '@/components/shared/badges'
import { STAGE_LABELS } from '@/lib/constants'
import type { AgentAction } from '@/types/agent'
import type { Stage } from '@/types/database'

interface AgentActionPreviewProps {
  action: AgentAction
  explanation: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function AgentActionPreview({
  action,
  explanation,
  onConfirm,
  onCancel,
  loading,
}: AgentActionPreviewProps) {
  return (
    <div className={cn(
      'border border-border rounded-xl bg-surface shadow-card overflow-hidden',
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-soft bg-surface-2">
        <span className="text-[13px] text-text-3">✦</span>
        <p className="text-[12px] text-text-2 flex-1">{explanation}</p>
      </div>

      {/* Action detail */}
      <div className="px-4 py-3">
        {action.type === 'create_hypothesis' && (
          <CreateHypothesisPreview action={action} />
        )}
        {action.type === 'move_stage' && (
          <MoveStagePreview action={action} />
        )}
        {action.type === 'log_activity' && (
          <LogActivityPreview action={action} />
        )}
        {action.type === 'create_solution' && (
          <CreateSolutionPreview action={action} />
        )}
        {action.type === 'create_test' && (
          <CreateTestPreview action={action} />
        )}
        {action.type === 'unknown' && (
          <UnknownPreview action={action} />
        )}
      </div>

      {/* Actions */}
      {action.type !== 'unknown' && (
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-soft">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 text-[12px] font-medium text-text-2 border border-border rounded-md hover:border-text-3 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-3.5 py-1.5 text-[12px] font-medium bg-text-primary text-background rounded-md hover:opacity-85 disabled:opacity-40 transition-opacity flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <span className="animate-pulse">✦</span>
                Executing…
              </>
            ) : (
              <>✦ Confirm</>
            )}
          </button>
        </div>
      )}

      {action.type === 'unknown' && (
        <div className="flex justify-end px-4 py-3 border-t border-border-soft">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-[12px] font-medium text-text-2 border border-border rounded-md hover:border-text-3 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

// ── Create hypothesis preview ─────────────────────────────────

function CreateHypothesisPreview({ action }: { action: Extract<AgentAction, { type: 'create_hypothesis' }> }) {
  const { title, statement, stage, confidence, objective_title } = action.payload
  return (
    <div className="space-y-2.5">
      <PreviewRow label="Action">
        <span className="text-[11px] font-medium text-stage-solution-fg bg-stage-solution px-1.5 py-0.5 rounded-sm">
          Create opportunity
        </span>
      </PreviewRow>
      <PreviewRow label="Title">
        <span className="text-[13px] font-medium text-text-primary">{title}</span>
      </PreviewRow>
      {statement && (
        <PreviewRow label="Statement">
          <span className="text-[12px] text-text-2 leading-relaxed">{statement}</span>
        </PreviewRow>
      )}
      <PreviewRow label="Stage">
        <StageBadge stage={stage} />
      </PreviewRow>
      <PreviewRow label="Confidence">
        <ConfidenceBadge confidence={confidence} />
      </PreviewRow>
      {objective_title && (
        <PreviewRow label="Objective">
          <span className="text-[12px] text-text-2">{objective_title}</span>
        </PreviewRow>
      )}
    </div>
  )
}

// ── Move stage preview ────────────────────────────────────────

function MoveStagePreview({ action }: { action: Extract<AgentAction, { type: 'move_stage' }> }) {
  const { hypothesis_title, from_stage, to_stage, evidence_note } = action.payload
  return (
    <div className="space-y-2.5">
      <PreviewRow label="Action">
        <span className="text-[11px] font-medium text-stage-testing-fg bg-stage-testing px-1.5 py-0.5 rounded-sm">
          Move stage
        </span>
      </PreviewRow>
      <PreviewRow label="Opportunity">
        <span className="text-[13px] font-medium text-text-primary">{hypothesis_title}</span>
      </PreviewRow>
      <PreviewRow label="Stage">
        <div className="flex items-center gap-2">
          <StageBadge stage={from_stage as Stage} />
          <span className="text-text-3 text-[11px]">→</span>
          <StageBadge stage={to_stage as Stage} />
        </div>
      </PreviewRow>
      {evidence_note && (
        <PreviewRow label="Evidence">
          <span className="text-[12px] text-text-2 leading-relaxed">{evidence_note}</span>
        </PreviewRow>
      )}
    </div>
  )
}

// ── Log activity preview ──────────────────────────────────────

function LogActivityPreview({ action }: { action: Extract<AgentAction, { type: 'log_activity' }> }) {
  const { hypothesis_title, activity_type, description, learning, status } = action.payload
  return (
    <div className="space-y-2.5">
      <PreviewRow label="Action">
        <span className="text-[11px] font-medium text-stage-validated-fg bg-stage-validated px-1.5 py-0.5 rounded-sm">
          Log activity
        </span>
      </PreviewRow>
      <PreviewRow label="Opportunity">
        <span className="text-[13px] font-medium text-text-primary">{hypothesis_title}</span>
      </PreviewRow>
      <PreviewRow label="Type">
        <span className="text-[12px] text-text-2 capitalize">{activity_type.replace('_', ' ')}</span>
      </PreviewRow>
      <PreviewRow label="Status">
        <span className="text-[12px] text-text-2 capitalize">{status.replace('_', ' ')}</span>
      </PreviewRow>
      {description && (
        <PreviewRow label="What was done">
          <span className="text-[12px] text-text-2 leading-relaxed">{description}</span>
        </PreviewRow>
      )}
      {learning && (
        <PreviewRow label="Learning">
          <span className="text-[12px] text-text-primary leading-relaxed">{learning}</span>
        </PreviewRow>
      )}
    </div>
  )
}

// ── Create solution preview ───────────────────────────────────

function CreateSolutionPreview({ action }: { action: Extract<AgentAction, { type: 'create_solution' }> }) {
  const { title, hypothesis_title } = action.payload
  return (
    <div className="space-y-2.5">
      <PreviewRow label="Action">
        <span className="text-[11px] font-medium text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded-sm">
          Create solution
        </span>
      </PreviewRow>
      <PreviewRow label="Title">
        <span className="text-[13px] font-medium text-text-primary">{title}</span>
      </PreviewRow>
      <PreviewRow label="Under">
        <span className="text-[12px] text-text-2">{hypothesis_title}</span>
      </PreviewRow>
    </div>
  )
}

// ── Create test preview ───────────────────────────────────────

function CreateTestPreview({ action }: { action: Extract<AgentAction, { type: 'create_test' }> }) {
  const { description, solution_title, hypothesis_title, activity_type } = action.payload
  return (
    <div className="space-y-2.5">
      <PreviewRow label="Action">
        <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-sm">
          Create assumption
        </span>
      </PreviewRow>
      <PreviewRow label="Description">
        <span className="text-[13px] font-medium text-text-primary">{description}</span>
      </PreviewRow>
      <PreviewRow label="Solution">
        <span className="text-[12px] text-text-2">{solution_title}</span>
      </PreviewRow>
      <PreviewRow label="Opportunity">
        <span className="text-[12px] text-text-3">{hypothesis_title}</span>
      </PreviewRow>
      {activity_type && (
        <PreviewRow label="Type">
          <span className="text-[12px] text-text-2 capitalize">{activity_type.replace('_', ' ')}</span>
        </PreviewRow>
      )}
    </div>
  )
}

// ── Unknown preview ───────────────────────────────────────────

function UnknownPreview({ action }: { action: Extract<AgentAction, { type: 'unknown' }> }) {
  return (
    <div className="flex items-start gap-2.5 py-1">
      <span className="text-stage-invalid-fg text-[13px] mt-0.5">⚠</span>
      <p className="text-[12px] text-text-2 leading-relaxed">{action.payload.reason}</p>
    </div>
  )
}

// ── Helper ────────────────────────────────────────────────────

function PreviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-text-3 w-24 shrink-0 pt-0.5">
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
