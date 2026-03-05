'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function Select({ value, options, onChange, placeholder, className }: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2',
          'bg-background border border-border rounded-md px-3 py-2',
          'text-[13px] text-text-primary text-left',
          'focus:outline-none focus:border-text-3 transition-colors',
          !selected && 'text-text-3'
        )}
      >
        <span>{selected?.label ?? placeholder ?? 'Select…'}</span>
        <svg
          width="10" height="6" viewBox="0 0 10 6" fill="none"
          className={cn('shrink-0 text-text-3 transition-transform', open && 'rotate-180')}
        >
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-surface border border-border rounded-lg shadow-card-hover py-1 max-h-56 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setOpen(false) }}
              className={cn(
                'w-full text-left px-3 py-2 text-[13px] transition-colors',
                option.value === value
                  ? 'text-text-primary font-medium bg-surface-2'
                  : 'text-text-2 hover:bg-surface-2 hover:text-text-primary'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
