'use client'

import { Suspense, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Select } from '@/components/shared/select'

const ROLE_OPTIONS = [
  { value: 'pm',       label: 'Product Manager' },
  { value: 'designer', label: 'Designer' },
  { value: 'em',       label: 'Engineering Manager' },
]

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledCompany = searchParams.get('company') ?? ''

  const [step, setStep] = useState<1 | 2>(prefilledCompany ? 2 : 1)
  const [companyName, setCompanyName] = useState(prefilledCompany)
  const [teamName, setTeamName] = useState('')
  const [role, setRole] = useState('pm')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleNext() {
    if (!companyName.trim()) return
    setStep(2)
  }

  function handleCreate() {
    if (!teamName.trim() || !role) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/onboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyName: companyName.trim(), teamName: teamName.trim(), userRole: role }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Something went wrong')
        }
        router.push('/tracker')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-[15px] font-semibold text-text-primary">Discovery OS</span>
          <p className="text-[13px] text-text-3 mt-1">Let's get you set up</p>
        </div>
        <div className="flex items-center gap-2 mb-8">
          <div className={cn('h-1 flex-1 rounded-full transition-colors', step >= 1 ? 'bg-text-primary' : 'bg-border')} />
          <div className={cn('h-1 flex-1 rounded-full transition-colors', step >= 2 ? 'bg-text-primary' : 'bg-border')} />
        </div>
        <div className="bg-surface border border-border rounded-xl p-6 shadow-card">
          {step === 1 && (
            <>
              <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-text-primary mb-1">Your company</h1>
              <p className="text-[13px] text-text-3 mb-5">What company are you setting up Discovery OS for?</p>
              <div className="space-y-1.5 mb-6">
                <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Company name</label>
                <input
                  autoFocus type="text" value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corp"
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  className={inputCls}
                />
              </div>
              <button onClick={handleNext} disabled={!companyName.trim()} className={cn(btnPrimary, 'w-full')}>
                Continue →
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-text-primary mb-1">Your first team</h1>
              <p className="text-[13px] text-text-3 mb-5">Teams are product trios working on a specific area. You can create more later.</p>
              <div className="space-y-4 mb-6">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Team name</label>
                  <input
                    autoFocus type="text" value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Growth, Onboarding, Core"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Your role in this team</label>
                  <Select value={role} options={ROLE_OPTIONS} onChange={setRole} />
                </div>
              </div>
              {error && <p className="text-[12px] text-stage-invalid-fg bg-stage-invalid px-3 py-2 rounded-md mb-4">{error}</p>}
              <div className="flex gap-2">
                {!prefilledCompany && (
                  <button onClick={() => setStep(1)} className={cn(btnSecondary, 'flex-1')}>← Back</button>
                )}
                <button onClick={handleCreate} disabled={isPending || !teamName.trim()} className={cn(btnPrimary, prefilledCompany ? 'w-full' : 'flex-1')}>
                  {isPending ? 'Setting up…' : 'Create workspace'}
                </button>
              </div>
            </>
          )}
        </div>
        <p className="text-center text-[11px] text-text-3 mt-4">You'll be the company admin. You can invite teammates after setup.</p>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  )
}

const inputCls = cn('w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] text-text-primary placeholder:text-text-3 focus:outline-none focus:border-text-3 transition-colors')
const btnPrimary = cn('px-4 py-2 text-[13px] font-medium bg-text-primary text-background rounded-md hover:opacity-85 disabled:opacity-40 transition-opacity')
const btnSecondary = cn('px-4 py-2 text-[13px] font-medium text-text-2 border border-border rounded-md hover:border-text-3 hover:text-text-primary transition-colors')
