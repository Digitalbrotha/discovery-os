'use client'

import { useState, useEffect, useRef } from 'react'
import { joinWaitlist } from '@/actions/waitlist'

export function WaitlistButton() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  function handleClose() {
    if (state === 'loading') return
    setOpen(false)
    setTimeout(() => { setEmail(''); setState('idle'); setMessage('') }, 300)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || state === 'loading') return
    setState('loading')
    const result = await joinWaitlist(email)
    setMessage(result.message)
    setState(result.ok ? 'done' : 'error')
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="text-[12px] text-text-3 hover:text-text-primary border border-border hover:border-text-3 px-3 py-1.5 rounded-full transition-colors"
      >
        🔔 Get notified at launch
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-xl p-6 space-y-4">
            {state !== 'done' ? (
              <>
                <div className="space-y-1">
                  <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-text-primary">
                    Join the waitlist
                  </h2>
                  <p className="text-[13px] text-text-3 leading-snug">
                    Be the first to know when Discvr Owl is ready for everyone.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    ref={inputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={state === 'loading'}
                    className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-[13px] text-text-primary placeholder:text-text-3 focus:outline-none focus:border-text-3 transition-colors disabled:opacity-50"
                  />
                  {state === 'error' && (
                    <p className="text-[12px] text-red-600">{message}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={state === 'loading'}
                      className="flex-1 py-2 text-[13px] font-medium text-text-2 border border-border rounded-lg hover:border-text-3 transition-colors disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!email.trim() || state === 'loading'}
                      className="flex-1 py-2 text-[13px] font-medium bg-text-primary text-background rounded-lg hover:opacity-85 disabled:opacity-40 transition-opacity"
                    >
                      {state === 'loading' ? 'Saving…' : 'Notify me'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center space-y-3 py-2">
                <div className="text-3xl">🦉</div>
                <p className="text-[15px] font-semibold text-text-primary tracking-[-0.01em]">You're on the list!</p>
                <p className="text-[13px] text-text-3 leading-snug">{message}</p>
                <button
                  onClick={handleClose}
                  className="mt-2 px-4 py-2 text-[13px] font-medium bg-text-primary text-background rounded-lg hover:opacity-85 transition-opacity"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
