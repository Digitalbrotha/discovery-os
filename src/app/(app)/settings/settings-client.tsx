'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Select } from '@/components/shared/select'
import { updateProfile, inviteToTeam, revokeTeamInvite, removeTeamMember, updateTeamMemberRole } from '@/actions/company'
import type { Profile } from '@/types/database'

type Tab = 'profile' | 'teams' | 'integrations'

const ROLE_OPTIONS = [
  { value: 'pm',       label: 'Product Manager' },
  { value: 'designer', label: 'Designer' },
  { value: 'em',       label: 'Engineering Manager' },
]
const ROLE_LABELS: Record<string, string> = { pm: 'PM', designer: 'Designer', em: 'EM' }

interface TeamData {
  team: { id: string; name: string; company_id: string }
  userRole: string
  members: { role: string; profile: { id: string; full_name: string | null; email: string; role: string | null } | null }[]
  invites: { id: string; email: string; role: string; expires_at: string }[]
}

interface Props {
  profile: Profile | null
  teams: TeamData[]
  currentUserId: string
  isCompanyAdmin: boolean
  companyId: string | null
}

export function SettingsClient({ profile, teams, currentUserId, isCompanyAdmin, companyId }: Props) {
  const [tab, setTab] = useState<Tab>('profile')
  const router = useRouter()
  const refresh = () => router.refresh()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-text-primary">Settings</h1>
          <p className="text-[13px] text-text-3 mt-0.5">Manage your profile and teams</p>
        </div>
        {isCompanyAdmin && (
          <Link href="/company" className="text-[12px] font-medium text-stage-solution-fg bg-stage-solution px-3 py-1.5 rounded-md hover:opacity-80 transition-opacity">
            Company admin →
          </Link>
        )}
      </div>

      <div className="flex gap-1 border-b border-border-soft mb-6">
        {(['profile', 'teams', 'integrations'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-3 py-2 text-[13px] font-medium capitalize transition-colors border-b-2 -mb-px', tab === t ? 'border-text-primary text-text-primary' : 'border-transparent text-text-3 hover:text-text-2')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileTab profile={profile} onSaved={refresh} />}
      {tab === 'teams' && <TeamsTab teams={teams} currentUserId={currentUserId} onSaved={refresh} />}
      {tab === 'integrations' && <IntegrationsTab />}
    </div>
  )
}

function ProfileTab({ profile, onSaved }: { profile: Profile | null; onSaved: () => void }) {
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [role, setRole] = useState(profile?.role ?? '')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSave() {
    startTransition(async () => {
      await updateProfile({ full_name: fullName, role })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved()
    })
  }

  return (
    <div className="bg-surface border border-border-soft rounded-xl p-5 space-y-4">
      <p className="text-[13px] font-semibold text-text-primary">Your profile</p>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-stage-solution flex items-center justify-center text-stage-solution-fg text-[16px] font-semibold">
          {(fullName || profile?.email || '?')[0].toUpperCase()}
        </div>
        <div>
          <p className="text-[13px] font-medium text-text-primary">{fullName || 'No name set'}</p>
          <p className="text-[12px] text-text-3">{profile?.email}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Full name</label>
        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" className={inputCls} />
      </div>
      <div className="space-y-1.5">
        <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Role</label>
        <Select value={role} options={ROLE_OPTIONS} onChange={setRole} placeholder="Select your role…" />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        {saved && <span className="text-[12px] text-stage-validated-fg">Saved ✓</span>}
        <button onClick={handleSave} disabled={isPending} className={btnPrimary}>{isPending ? 'Saving…' : 'Save profile'}</button>
      </div>
    </div>
  )
}

function TeamsTab({ teams, currentUserId, onSaved }: { teams: TeamData[]; currentUserId: string; onSaved: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [inviteEmail, setInviteEmail] = useState<Record<string, string>>({})
  const [inviteRole, setInviteRole] = useState<Record<string, string>>({})
  const [inviteError, setInviteError] = useState<Record<string, string>>({})
  const [inviteSent, setInviteSent] = useState<Record<string, boolean>>({})

  function act(fn: () => Promise<void>) {
    startTransition(async () => { await fn(); onSaved() })
  }

  if (teams.length === 0) {
    return (
      <div className="bg-surface border border-border-soft rounded-xl p-5">
        <p className="text-[13px] text-text-3">You're not part of any team yet.</p>
        <p className="text-[12px] text-text-3 mt-1">Ask your company admin to add you to a team.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {teams.map(({ team, userRole, members, invites }) => (
        <div key={team.id} className="bg-surface border border-border-soft rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-text-primary">{team.name}</p>
            <span className="text-[11px] font-medium text-text-3 bg-surface-2 px-2 py-0.5 rounded-sm">{ROLE_LABELS[userRole] ?? userRole}</span>
          </div>
          <div className="space-y-1">
            {members.map(m => {
              const p = m.profile
              if (!p) return null
              const isMe = p.id === currentUserId
              return (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border-soft last:border-0">
                  <div className="w-7 h-7 rounded-full bg-stage-solution flex items-center justify-center text-stage-solution-fg text-[11px] font-semibold shrink-0">
                    {(p.full_name ?? p.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-text-primary truncate">{p.full_name ?? p.email}{isMe && <span className="ml-1 text-[10px] text-text-3">(you)</span>}</p>
                  </div>
                  <div className="w-32 shrink-0">
                    <Select value={m.role} options={ROLE_OPTIONS} onChange={v => act(async () => updateTeamMemberRole({ team_id: team.id, user_id: p.id, role: v }))} />
                  </div>
                  {!isMe && (
                    <button onClick={() => act(async () => removeTeamMember({ team_id: team.id, user_id: p.id }))} className="text-[11px] text-stage-invalid-fg hover:opacity-70">Remove</button>
                  )}
                </div>
              )
            })}
          </div>
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Invite to team</p>
            <div className="flex gap-2">
              <input type="email" value={inviteEmail[team.id] ?? ''} onChange={e => setInviteEmail(p => ({ ...p, [team.id]: e.target.value }))} placeholder="colleague@company.com" className={cn(inputCls, 'flex-1 text-[12px]')} />
              <div className="w-36 shrink-0">
                <Select value={inviteRole[team.id] ?? 'pm'} options={ROLE_OPTIONS} onChange={v => setInviteRole(p => ({ ...p, [team.id]: v }))} />
              </div>
              <button disabled={!inviteEmail[team.id]?.trim() || isPending} onClick={() => act(async () => {
                try {
                  await inviteToTeam({ team_id: team.id, email: inviteEmail[team.id]!, role: inviteRole[team.id] ?? 'pm' })
                  setInviteEmail(p => ({ ...p, [team.id]: '' }))
                  setInviteSent(p => ({ ...p, [team.id]: true }))
                  setTimeout(() => setInviteSent(p => ({ ...p, [team.id]: false })), 3000)
                } catch (err) {
                  setInviteError(p => ({ ...p, [team.id]: err instanceof Error ? err.message : 'Failed' }))
                }
              })} className={cn(btnPrimary, 'shrink-0 text-[12px]')}>
                {inviteSent[team.id] ? 'Sent ✓' : 'Invite'}
              </button>
            </div>
            {inviteError[team.id] && <p className="text-[11px] text-stage-invalid-fg">{inviteError[team.id]}</p>}
            {invites.length > 0 && (
              <div className="space-y-1 mt-1">
                <p className="text-[10px] uppercase tracking-[0.06em] text-text-3">Pending</p>
                {invites.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between text-[11px] py-1">
                    <span className="text-text-2">{inv.email} <span className="text-text-3">({ROLE_LABELS[inv.role]})</span></span>
                    <button onClick={() => act(async () => revokeTeamInvite({ invite_id: inv.id }))} className="text-text-3 hover:text-stage-invalid-fg">Revoke</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Integrations tab ──────────────────────────────────────────

const MCP_CONFIG = `{
  "mcpServers": {
    "discoveryowl": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only"
      ],
      "env": {
        "SUPABASE_URL": "YOUR_SUPABASE_PROJECT_URL",
        "SUPABASE_SERVICE_ROLE_KEY": "YOUR_SERVICE_ROLE_KEY"
      }
    }
  }
}`

function IntegrationsTab() {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(MCP_CONFIG)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Intro card */}
      <div className="bg-surface border border-border-soft rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-base">✦</span>
          <p className="text-[13px] font-semibold text-text-primary">Connect DiscoveryOwl to Claude Code</p>
        </div>
        <p className="text-[12px] text-text-2 leading-relaxed">
          By adding DiscoveryOwl as an MCP server, Claude Code can read and update your opportunities,
          solutions, and assumption tests directly from your terminal — no copy-pasting needed.
        </p>
      </div>

      {/* Steps */}
      <div className="bg-surface border border-border-soft rounded-xl p-5 space-y-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3">Setup steps</p>

        {/* Step 1 */}
        <Step number={1} title="Get your Supabase credentials">
          <p className="text-[12px] text-text-2 leading-relaxed">
            Open your{' '}
            <span className="font-medium text-text-primary">Supabase project dashboard</span>
            {' '}→ <span className="font-mono text-[11px] bg-surface-2 px-1 py-0.5 rounded">Settings → API</span>.
            You need two values:
          </p>
          <ul className="mt-2 space-y-1 text-[12px] text-text-2">
            <li className="flex items-start gap-2">
              <span className="text-text-3 mt-0.5">·</span>
              <span><span className="font-mono text-[11px] bg-surface-2 px-1 py-0.5 rounded">Project URL</span> — looks like <span className="font-mono text-[11px] text-text-3">https://xxxx.supabase.co</span></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-text-3 mt-0.5">·</span>
              <span><span className="font-mono text-[11px] bg-surface-2 px-1 py-0.5 rounded">service_role</span> key — under "Project API keys" (keep this secret)</span>
            </li>
          </ul>
        </Step>

        {/* Step 2 */}
        <Step number={2} title="Create or update your MCP config file">
          <p className="text-[12px] text-text-2 leading-relaxed mb-3">
            Add the block below to <span className="font-mono text-[11px] bg-surface-2 px-1 py-0.5 rounded">~/.claude.json</span> (global, works in any project) or <span className="font-mono text-[11px] bg-surface-2 px-1 py-0.5 rounded">.mcp.json</span> in your project root.
            Replace the two placeholder values with your credentials from step 1.
          </p>
          <div className="relative">
            <pre className="bg-[#101c28] text-[11px] font-mono text-[#a8c8f0] rounded-lg px-4 py-3.5 overflow-x-auto leading-relaxed whitespace-pre">
              {MCP_CONFIG}
            </pre>
            <button
              onClick={copy}
              className="absolute top-2.5 right-2.5 text-[10px] font-medium px-2 py-1 rounded bg-white/10 text-white/60 hover:bg-white/20 hover:text-white/90 transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </Step>

        {/* Step 3 */}
        <Step number={3} title="Restart Claude Code and verify">
          <p className="text-[12px] text-text-2 leading-relaxed">
            Restart Claude Code, then run <span className="font-mono text-[11px] bg-surface-2 px-1 py-0.5 rounded">/mcp</span> in any conversation to confirm the <span className="font-mono text-[11px] bg-surface-2 px-1 py-0.5 rounded">discoveryowl</span> server is listed and connected.
          </p>
        </Step>

        {/* Step 4 */}
        <Step number={4} title="Start using it">
          <p className="text-[12px] text-text-2 leading-relaxed mb-2">
            Once connected, you can ask Claude Code things like:
          </p>
          <div className="space-y-1.5">
            {[
              'List all opportunities in the tracker',
              'Add a solution called "Onboarding checklist" under the activation opportunity',
              'Mark the drop-off interview test as done',
              'Show me all assumption tests that are still planned',
            ].map((ex) => (
              <div key={ex} className="flex items-start gap-2 text-[12px]">
                <span className="text-text-3 shrink-0 mt-0.5">✦</span>
                <span className="text-text-2 italic">"{ex}"</span>
              </div>
            ))}
          </div>
        </Step>
      </div>

      {/* Note */}
      <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
        <span className="text-amber-600 text-[12px] mt-0.5 shrink-0">⚠</span>
        <p className="text-[12px] text-amber-800 leading-relaxed">
          The <span className="font-mono text-[11px]">service_role</span> key bypasses row-level security.
          Never commit it to version control or share it. Use <span className="font-mono text-[11px]">--read-only</span> in the args above to prevent accidental writes.
        </p>
      </div>
    </div>
  )
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5">
      <div className="w-5 h-5 rounded-full bg-text-primary text-background text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
        {number}
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-[12px] font-semibold text-text-primary">{title}</p>
        {children}
      </div>
    </div>
  )
}

const inputCls = cn('w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] text-text-primary placeholder:text-text-3 focus:outline-none focus:border-text-3 transition-colors')
const btnPrimary = cn('px-3.5 py-1.5 text-[13px] font-medium bg-text-primary text-background rounded-md hover:opacity-85 disabled:opacity-40 transition-opacity')
