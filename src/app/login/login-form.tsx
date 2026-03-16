'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Mode = 'signin' | 'signup'

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function LoginForm({ next }: { next?: string }) {
  const router = useRouter()
  const supabase = createClient()
  const isInvite = next?.startsWith('/invite/')

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setMessage(null)
  }

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(next ?? '/')
    router.refresh()
  }

  async function handleDemo() {
    const demoEmail    = process.env.NEXT_PUBLIC_DEMO_EMAIL
    const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD
    if (!demoEmail || !demoPassword) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPassword })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/tracker')
    router.refresh()
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!isInvite && !companyName.trim()) return setError('Company name is required')
    if (!fullName.trim()) return setError('Your name is required')
    if (!email.trim()) return setError('Email is required')
    if (password.length < 8) return setError('Password must be at least 8 characters')

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (data.session) {
        const dest = isInvite ? next! : `/onboarding?company=${encodeURIComponent(companyName.trim())}`
        router.push(dest)
        router.refresh()
      } else if (data.user?.identities?.length === 0) {
        // Duplicate email — Supabase returns fake success to prevent enumeration
        setError('An account with this email already exists. Please sign in instead.')
        setLoading(false)
      } else {
        setMessage('Account created! Check your email to confirm, then sign in.')
        setLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  if (mode === 'signup') {
    return (
      <form onSubmit={handleSignUp} className="space-y-4">
        {!isInvite && (
          <div className="space-y-2">
            <label htmlFor="company" className="text-sm font-medium">
              Company name
            </label>
            <input
              id="company"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              autoFocus
              className={inputCls}
              placeholder="Acme Corp"
            />
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium">
            Your name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputCls}
            placeholder="Jane Smith"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="you@company.com"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </button>
        </p>
      </form>
    )
  }

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputCls}
          placeholder="you@team.com"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={inputCls}
          placeholder="••••••••"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        New to DiscoveryOwl?{' '}
        <button
          type="button"
          onClick={() => switchMode('signup')}
          className="font-medium text-primary hover:underline"
        >
          Create account
        </button>
      </p>

      {process.env.NEXT_PUBLIC_DEMO_EMAIL && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-2 text-[11px] text-muted-foreground">or</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDemo}
            disabled={loading}
            className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:border-text-3 hover:text-foreground disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading…' : '▶ View demo'}
          </button>
        </>
      )}
    </form>
  )
}
