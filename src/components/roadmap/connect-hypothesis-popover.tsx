'use client'

import { useState, useRef, useEffect } from 'react'
import { connectHypothesisToObjective } from '@/actions/roadmap'
import { cn } from '@/lib/utils'
import { StageBadge } from '@/components/shared/badges'
import type { Hypothesis } from '@/types/database'

interface ConnectHypothesisPopoverProps {
  objectiveId: string
  // Hypotheses not yet connected to this objective
  availableHypotheses: Hypothesis[]
}

export function ConnectHypothesisPopover({
  objectiveId,
  availableHypotheses,
}: ConnectHypothesisPopoverProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const filtered = availableHypotheses.filter((h) =>
    h.title.toLowerCase().includes(query.toLowerCase())
  )

  async function handleConnect(hypothesisId: string) {
    setLoading(hypothesisId)
    try {
      await connectHypothesisToObjective({
        objective_id: objectiveId,
        hypothesis_id: hypothesisId,
        now_next_later: 'later',
      })
      setOpen(false)
      setQuery('')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium',
          'text-text-3 border border-dashed border-border',
          'hover:text-text-2 hover:border-text-3 transition-colors'
        )}
      >
        <span>+</span>
        <span>Connect</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-surface border border-border rounded-xl shadow-card-hover w-72">
          {/* Search */}
          <div className="px-3 pt-3 pb-2 border-b border-border-soft">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search opportunities…"
              className={cn(
                'w-full bg-surface-2 rounded-md px-2.5 py-1.5 text-[12px]',
                'text-text-primary placeholder:text-text-3 outline-none'
              )}
            />
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto py-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-text-3 text-center">
                {availableHypotheses.length === 0
                  ? 'All opportunities are connected'
                  : 'No matches'}
              </p>
            ) : (
              filtered.map((h) => (
                <button
                  key={h.id}
                  onClick={() => handleConnect(h.id)}
                  disabled={loading === h.id}
                  className={cn(
                    'w-full text-left px-3 py-2.5 flex flex-col gap-1',
                    'hover:bg-surface-2 transition-colors',
                    loading === h.id && 'opacity-50'
                  )}
                >
                  <span className="text-[12px] font-medium text-text-primary leading-snug line-clamp-2">
                    {h.title}
                  </span>
                  <StageBadge stage={h.stage} />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
