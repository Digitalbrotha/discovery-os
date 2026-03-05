'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Select } from '@/components/shared/select'
import {
  createTeam,
  deleteTeam,
  updateTeamName,
  inviteToTeam,
  revokeTeamInvite,
  removeTeamMember,
  updateTeamMemberRole,
  transferCompanyOwnership,
  updateCompanyName,
} from '@/actions/company'

const ROLE_OPTIONS = [
  { value: 'pm',       label: 'PM' },
  { value: 'designer', label: 'Designer' },
  { value: 'em',       label: 'EM' },
]

const ROLE_LABELS: Record<string, string> = { pm: 'PM', designer: 'Designer', em: 'EM' }

interface Profile { id: string; full_name: string | null; email: string; role: string | null }
interface Member  { id: string; role: string; profile: Profile | null }
interface Invite  { id: string; email: string; role: string; expires_at: string; accepted_at: string | null }
interface TeamData {
  id: string; name: string; company_id: string
  members: Member[]
  invites: Invite[]
}
interface Company { id: string; name: string; slug: string; admin_id: string | null }

interface Props {
  company: Company
  teams: TeamData[]
  allProfiles: Profile[]
  currentUserId: string
}

export function CompanyAdminClient({ company, teams, allProfiles, currentUserId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [companyName, setCompanyName] = useState(company.name)
  const [editingCompanyName, setEditingCompanyName] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferTo, setTransferTo] = useState('')
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(() => new Set(teams.map(t => t.id)))
  const [deleteConfirmTeam, setDeleteConfirmTeam] = useState<{ id: string; name: string } | null>(null)
  const [inviteEmail, setInviteEmail] = useState<Record<string, string>>({})
  const [inviteRole, setInviteRole] = useState<Record<string, string>>({})
  const [inviteError, setInviteError] = useState<Record<string, string>>({})
  const [editingTeamName, setEditingTeamName] = useState<string | null>(null)
  const [teamNameDraft, setTeamNameDraft] = useState('')
  const [globalInviteEmail, setGlobalInviteEmail] = useState('')
  const [globalInviteRole, setGlobalInviteRole] = useState('pm')
  const [globalInviteTeamIds, setGlobalInviteTeamIds] = useState<Set<string>>(() => new Set(teams.map(t => t.id)))
  const [globalInviteError, setGlobalInviteError] = useState<string | null>(null)
  const [globalInviteSuccess, setGlobalInviteSuccess] = useState<string | null>(null)

  const refresh = () => { router.refresh() }

  function act(fn: () => Promise<void>) {
    startTransition(async () => { await fn(); refresh() })
  }

  // All unique members across all teams
  const allMembers = Array.from(
    new Map(
      teams.flatMap(t => t.members.map(m => m.profile)).filter(Boolean).map(p => [p!.id, p!])
    ).values()
  )

  const profileOptions = allMembers
    .filter(p => p.id !== currentUserId)
    .map(p => ({ value: p.id, label: p.full_name ?? p.email }))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-text-primary">Company</h1>
          <p className="text-[12px] text-text-3 mt-0.5">Admin view — visible only to you</p>
        </div>
        <span className="text-[11px] font-medium bg-stage-solution text-stage-solution-fg px-2 py-1 rounded-sm">
          Admin
        </span>
      </div>

      {/* Company card */}
      <Section title="Company details">
        <div className="flex items-center gap-3">
          {editingCompanyName ? (
            <>
              <input
                autoFocus
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className={cn(inputCls, 'flex-1')}
                onKeyDown={e => {
                  if (e.key === 'Enter') act(async () => { await updateCompanyName({ company_id: company.id, name: companyName }); setEditingCompanyName(false) })
                  if (e.key === 'Escape') setEditingCompanyName(false)
                }}
              />
              <button onClick={() => act(async () => { await updateCompanyName({ company_id: company.id, name: companyName }); setEditingCompanyName(false) })} className={btnPrimary}>Save</button>
              <button onClick={() => setEditingCompanyName(false)} className={btnSecondary}>Cancel</button>
            </>
          ) : (
            <>
              <p className="flex-1 text-[15px] font-semibold text-text-primary">{company.name}</p>
              <button onClick={() => setEditingCompanyName(true)} className={btnSecondary}>Rename</button>
            </>
          )}
        </div>
        <p className="text-[11px] text-text-3 mt-1">Slug: {company.slug}</p>

        {/* Transfer ownership */}
        <div className="mt-4 pt-4 border-t border-border-soft">
          {showTransfer ? (
            <div className="space-y-3">
              <p className="text-[12px] text-text-2">Transfer company ownership to another member. You will lose admin access.</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={transferTo} options={profileOptions} onChange={setTransferTo} placeholder="Select member…" />
                </div>
                <button
                  disabled={!transferTo || isPending}
                  onClick={() => act(async () => { await transferCompanyOwnership({ company_id: company.id, new_admin_id: transferTo }); router.push('/settings') })}
                  className="px-3 py-1.5 text-[12px] font-medium bg-stage-invalid text-stage-invalid-fg rounded-md hover:opacity-80 disabled:opacity-40"
                >
                  Transfer
                </button>
                <button onClick={() => setShowTransfer(false)} className={btnSecondary}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowTransfer(true)} className="text-[12px] text-text-3 hover:text-stage-invalid-fg transition-colors">
              Transfer company ownership →
            </button>
          )}
        </div>
      </Section>

      {/* All members overview */}
      <Section title={`All members · ${allMembers.length}`}>
        <div className="space-y-1">
          {allMembers.map(p => {
            const memberTeams = teams.filter(t => t.members.some(m => m.profile?.id === p.id))
            return (
              <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-border-soft last:border-0">
                <Avatar name={p.full_name ?? p.email} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-primary truncate">
                    {p.full_name ?? p.email}
                    {p.id === currentUserId && <span className="ml-1.5 text-[10px] text-text-3">(you)</span>}
                    {p.id === company.admin_id && <span className="ml-1.5 text-[10px] font-medium bg-stage-solution text-stage-solution-fg px-1.5 py-0.5 rounded-sm">Admin</span>}
                  </p>
                  <p className="text-[11px] text-text-3">{p.email} · {memberTeams.map(t => t.name).join(', ')}</p>
                </div>
                <span className="text-[11px] font-medium text-text-3 bg-surface-2 px-2 py-0.5 rounded-sm">
                  {ROLE_LABELS[p.role ?? ''] ?? p.role ?? '—'}
                </span>
              </div>
            )
          })}
          {allMembers.length === 0 && (
            <p className="text-[13px] text-text-3 py-2">No members yet. Invite people to a team.</p>
          )}
        </div>
      </Section>

      {/* Global invite */}
      <Section title="Invite member">
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="email"
              value={globalInviteEmail}
              onChange={e => setGlobalInviteEmail(e.target.value)}
              placeholder="email@company.com"
              className={cn(inputCls, 'flex-1')}
            />
            <div className="w-32 shrink-0">
              <Select value={globalInviteRole} options={ROLE_OPTIONS} onChange={setGlobalInviteRole} />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Send invite to</p>
            <div className="flex flex-wrap gap-2">
              {teams.map(t => (
                <label key={t.id} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={globalInviteTeamIds.has(t.id)}
                    onChange={e => setGlobalInviteTeamIds(prev => {
                      const next = new Set(prev)
                      e.target.checked ? next.add(t.id) : next.delete(t.id)
                      return next
                    })}
                    className="accent-text-primary"
                  />
                  <span className="text-[12px] text-text-2">{t.name}</span>
                </label>
              ))}
            </div>
          </div>
          {globalInviteError && <p className="text-[12px] text-stage-invalid-fg">{globalInviteError}</p>}
          {globalInviteSuccess && <p className="text-[12px] text-confidence-high">{globalInviteSuccess}</p>}
          <button
            disabled={!globalInviteEmail.trim() || globalInviteTeamIds.size === 0 || isPending}
            onClick={() => {
              setGlobalInviteError(null)
              setGlobalInviteSuccess(null)
              startTransition(async () => {
                try {
                  await Promise.all(
                    Array.from(globalInviteTeamIds).map(tid =>
                      inviteToTeam({ team_id: tid, email: globalInviteEmail.trim(), role: globalInviteRole })
                    )
                  )
                  setGlobalInviteSuccess(`Invite sent to ${globalInviteTeamIds.size} team${globalInviteTeamIds.size > 1 ? 's' : ''}`)
                  setGlobalInviteEmail('')
                  refresh()
                } catch (err) {
                  setGlobalInviteError(err instanceof Error ? err.message : 'Failed to send invite')
                }
              })
            }}
            className={btnPrimary}
          >
            Send invite{globalInviteTeamIds.size > 1 ? 's' : ''}
          </button>
        </div>
      </Section>

      {/* Teams */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-text-primary">Teams · {teams.length}</p>
          <button onClick={() => setShowCreateTeam(true)} className={btnPrimary}>+ New team</button>
        </div>

        {showCreateTeam && (
          <div className="bg-surface-2 rounded-lg p-4 space-y-3">
            <p className="text-[12px] font-medium text-text-primary">New team</p>
            <input
              autoFocus
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              placeholder="e.g. Growth, Onboarding, Core"
              className={inputCls}
              onKeyDown={e => {
                if (e.key === 'Enter' && newTeamName.trim()) {
                  act(async () => { await createTeam({ company_id: company.id, name: newTeamName.trim() }); setNewTeamName(''); setShowCreateTeam(false) })
                }
                if (e.key === 'Escape') setShowCreateTeam(false)
              }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreateTeam(false)} className={btnSecondary}>Cancel</button>
              <button
                disabled={!newTeamName.trim() || isPending}
                onClick={() => act(async () => { await createTeam({ company_id: company.id, name: newTeamName.trim() }); setNewTeamName(''); setShowCreateTeam(false) })}
                className={btnPrimary}
              >
                Create
              </button>
            </div>
          </div>
        )}

        {teams.map(team => (
          <Section key={team.id} title="">
            {/* Team header */}
            <div className="flex items-center gap-2 -mt-1 mb-3">
              {editingTeamName === team.id ? (
                <>
                  <input
                    autoFocus
                    value={teamNameDraft}
                    onChange={e => setTeamNameDraft(e.target.value)}
                    className={cn(inputCls, 'flex-1 text-[14px] font-semibold')}
                    onKeyDown={e => {
                      if (e.key === 'Enter') act(async () => { await updateTeamName({ team_id: team.id, name: teamNameDraft }); setEditingTeamName(null) })
                      if (e.key === 'Escape') setEditingTeamName(null)
                    }}
                  />
                  <button onClick={() => act(async () => { await updateTeamName({ team_id: team.id, name: teamNameDraft }); setEditingTeamName(null) })} className={btnPrimary}>Save</button>
                  <button onClick={() => setEditingTeamName(null)} className={btnSecondary}>Cancel</button>
                </>
              ) : (
                <>
                  <p className="flex-1 text-[14px] font-semibold text-text-primary">{team.name}</p>
                  <button onClick={() => { setEditingTeamName(team.id); setTeamNameDraft(team.name) }} className="text-[11px] text-text-3 hover:text-text-2">Rename</button>
                  <button
                    onClick={() => setDeleteConfirmTeam({ id: team.id, name: team.name })}
                    className="text-[11px] text-stage-invalid-fg hover:opacity-70"
                  >
                    Delete
                  </button>
                  <button onClick={() => setExpandedTeams(prev => { const next = new Set(prev); next.has(team.id) ? next.delete(team.id) : next.add(team.id); return next })} className="text-[11px] text-text-3 hover:text-text-2 ml-1">
                    {expandedTeams.has(team.id) ? '▴' : '▾'}
                  </button>
                </>
              )}
            </div>

            {expandedTeams.has(team.id) && (
              <>
                {/* Members */}
                <div className="space-y-1 mb-4">
                  {team.members.map(m => {
                    const p = m.profile
                    if (!p) return null
                    return (
                      <div key={m.id} className="flex items-center gap-2 py-2 border-b border-border-soft last:border-0">
                        <Avatar name={p.full_name ?? p.email} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-text-primary truncate">{p.full_name ?? p.email}</p>
                          <p className="text-[11px] text-text-3 truncate">{p.email}</p>
                        </div>
                        <div className="w-28 shrink-0">
                          <Select
                            value={m.role}
                            options={ROLE_OPTIONS}
                            onChange={v => act(async () => updateTeamMemberRole({ team_id: team.id, user_id: p.id, role: v }))}
                          />
                        </div>
                        {p.id !== currentUserId && (
                          <button
                            onClick={() => act(async () => removeTeamMember({ team_id: team.id, user_id: p.id }))}
                            className="text-[11px] text-stage-invalid-fg hover:opacity-70 shrink-0"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {team.members.length === 0 && (
                    <p className="text-[12px] text-text-3 py-1">No members yet.</p>
                  )}
                </div>

                {/* Invite */}
                <div className="space-y-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">Invite</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail[team.id] ?? ''}
                      onChange={e => setInviteEmail(p => ({ ...p, [team.id]: e.target.value }))}
                      placeholder="email@company.com"
                      className={cn(inputCls, 'flex-1 text-[12px]')}
                    />
                    <div className="w-28 shrink-0">
                      <Select
                        value={inviteRole[team.id] ?? 'pm'}
                        options={ROLE_OPTIONS}
                        onChange={v => setInviteRole(p => ({ ...p, [team.id]: v }))}
                      />
                    </div>
                    <button
                      disabled={!inviteEmail[team.id]?.trim() || isPending}
                      onClick={() => act(async () => {
                        try {
                          await inviteToTeam({ team_id: team.id, email: inviteEmail[team.id]!, role: inviteRole[team.id] ?? 'pm' })
                          setInviteEmail(p => ({ ...p, [team.id]: '' }))
                          setInviteError(p => ({ ...p, [team.id]: '' }))
                        } catch (err) {
                          setInviteError(p => ({ ...p, [team.id]: err instanceof Error ? err.message : 'Failed' }))
                        }
                      })}
                      className={cn(btnPrimary, 'shrink-0 text-[12px]')}
                    >
                      Invite
                    </button>
                  </div>
                  {inviteError[team.id] && <p className="text-[11px] text-stage-invalid-fg">{inviteError[team.id]}</p>}

                  {/* Pending invites */}
                  {team.invites.filter(i => !i.accepted_at).length > 0 && (
                    <div className="mt-2 space-y-1">
                      {team.invites.filter(i => !i.accepted_at).map(inv => (
                        <div key={inv.id} className="flex items-center justify-between text-[11px] py-1">
                          <span className="text-text-2">{inv.email} <span className="text-text-3">({ROLE_LABELS[inv.role]})</span></span>
                          <button onClick={() => act(async () => revokeTeamInvite({ invite_id: inv.id }))} className="text-text-3 hover:text-stage-invalid-fg">Revoke</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </Section>
        ))}
      </div>

      {/* Delete team confirmation modal */}
      {deleteConfirmTeam && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirmTeam(null)} aria-hidden />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-sm bg-surface rounded-xl border border-border shadow-card-hover pointer-events-auto">
              <div className="p-5 space-y-3">
                <h3 className="text-[15px] font-semibold text-text-primary">Delete team</h3>
                <p className="text-[13px] text-text-2">
                  Are you sure you want to delete <strong>{deleteConfirmTeam.name}</strong>? This action cannot be undone and will remove all team members.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 pb-5">
                <button onClick={() => setDeleteConfirmTeam(null)} className={btnSecondary}>
                  Cancel
                </button>
                <button
                  disabled={isPending}
                  onClick={() => {
                    act(async () => deleteTeam({ team_id: deleteConfirmTeam.id }))
                    setDeleteConfirmTeam(null)
                  }}
                  className="px-3 py-1.5 text-[12px] font-medium bg-stage-invalid text-stage-invalid-fg rounded-md hover:opacity-80 disabled:opacity-40 transition-opacity"
                >
                  Delete team
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <div className={cn(
      'rounded-full bg-stage-solution flex items-center justify-center text-stage-solution-fg font-semibold shrink-0',
      size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-[12px]'
    )}>
      {name[0].toUpperCase()}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border-soft rounded-xl p-5">
      {title && <p className="text-[13px] font-semibold text-text-primary mb-4">{title}</p>}
      {children}
    </div>
  )
}

const inputCls = cn(
  'w-full bg-background border border-border rounded-md px-3 py-2',
  'text-[13px] text-text-primary placeholder:text-text-3',
  'focus:outline-none focus:border-text-3 transition-colors'
)
const btnPrimary  = cn('px-3 py-1.5 text-[12px] font-medium bg-text-primary text-background rounded-md hover:opacity-85 disabled:opacity-40 transition-opacity')
const btnSecondary = cn('px-3 py-1.5 text-[12px] font-medium text-text-2 border border-border rounded-md hover:border-text-3 hover:text-text-primary transition-colors')
