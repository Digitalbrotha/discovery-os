'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { AgentActionPreview } from './agent-action-preview'
import type { AgentAction, AgentInterpretResponse } from '@/types/agent'

type PromptState =
  | { status: 'idle' }
  | { status: 'interpreting' }
  | { status: 'preview'; action: AgentAction; explanation: string }
  | { status: 'executing' }
  | { status: 'done'; message: string }
  | { status: 'error'; message: string }

interface PromptBarProps {
  className?: string
}

export function PromptBar({ className }: PromptBarProps) {
  const [value, setValue] = useState('')
  const [state, setState] = useState<PromptState>({ status: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  const isLoading =
    state.status === 'interpreting' || state.status === 'executing'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || isLoading) return

    setState({ status: 'interpreting' })

    try {
      const res = await fetch('/api/agent/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: value.trim() }),
      })

      if (!res.ok) throw new Error('Failed to interpret prompt')

      const data: AgentInterpretResponse = await res.json()
      setState({ status: 'preview', action: data.action, explanation: data.explanation })
      setValue('')
    } catch {
      setState({ status: 'error', message: 'Could not reach the agent. Try again.' })
    }
  }

  async function handleConfirm() {
    if (state.status !== 'preview') return
    const { action } = state

    setState({ status: 'executing' })

    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setState({ status: 'error', message: data.message ?? 'Execution failed' })
        return
      }

      setState({ status: 'done', message: data.message })

      // Auto-clear after 4 seconds
      setTimeout(() => {
        setState({ status: 'idle' })
        inputRef.current?.focus()
      }, 4000)
    } catch {
      setState({ status: 'error', message: 'Execution failed. Try again.' })
    }
  }

  function handleCancel() {
    setState({ status: 'idle' })
    setValue('')
    inputRef.current?.focus()
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Preview panel — shown above the input */}
      {(state.status === 'preview' || state.status === 'executing') && (
        <AgentActionPreview
          action={state.status === 'preview' ? state.action : (state as any).action}
          explanation={state.status === 'preview' ? state.explanation : ''}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          loading={state.status === 'executing'}
        />
      )}

      {/* Done / error feedback */}
      {state.status === 'done' && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-stage-validated border border-stage-validated-fg/20 rounded-lg">
          <span className="text-stage-validated-fg text-[12px]">✓</span>
          <p className="text-[12px] text-stage-validated-fg font-medium">{state.message}</p>
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-stage-invalid border border-stage-invalid-fg/20 rounded-lg">
          <p className="text-[12px] text-stage-invalid-fg">{state.message}</p>
          <button
            onClick={handleCancel}
            className="text-stage-invalid-fg text-[11px] underline underline-offset-2 ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          'flex items-center gap-3 bg-surface border border-border rounded-lg px-3.5 py-2.5 shadow-card',
          'focus-within:border-text-3 transition-colors duration-100',
          isLoading && 'opacity-60 pointer-events-none'
        )}
      >
        <span className={cn(
          'text-sm text-text-3 transition-opacity shrink-0',
          state.status === 'interpreting' && 'animate-pulse'
        )}>
          ✦
        </span>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            state.status === 'interpreting'
              ? 'Thinking…'
              : 'Try "move the onboarding opportunity to validated" or "log 5 interviews on drop-off"'
          }
          disabled={isLoading || state.status === 'preview'}
          className="flex-1 bg-transparent font-sans text-[13px] text-text-primary placeholder:text-text-3 outline-none tracking-[-0.01em] disabled:cursor-not-allowed"
        />

        {value && !isLoading ? (
          <button
            type="submit"
            className="font-mono text-[10px] tracking-[0.04em] px-2 py-1 rounded bg-text-primary text-background hover:opacity-85 transition-opacity shrink-0"
          >
            ↵
          </button>
        ) : (
          <span className="font-mono text-[10px] text-text-3 bg-surface-2 px-1.5 py-1 rounded tracking-[0.04em] whitespace-nowrap shrink-0">
            ⌘ K
          </span>
        )}
      </form>
    </div>
  )
}
