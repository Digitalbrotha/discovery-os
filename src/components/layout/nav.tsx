'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DiscoveryOwlLogo } from './discovery-owl-logo'
import type { Profile } from '@/types/database'

interface NavProps {
  profile: Profile | null
  isCompanyAdmin?: boolean
}

export default function Nav({ profile, isCompanyAdmin }: NavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const links = [
    { href: '/tracker',  label: 'Tracker' },
    { href: '/roadmap',  label: 'Roadmap' },
    ...(isCompanyAdmin ? [{ href: '/company', label: 'Company' }] : []),
    { href: '/settings', label: 'Settings' },
  ]

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="border-b border-border bg-background">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <DiscoveryOwlLogo variant="nav" />
          <nav className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  pathname.startsWith(link.href)
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {profile && (
            <span className="text-xs text-muted-foreground">
              {profile.full_name ?? profile.email}
              {profile.role && (
                <span className="ml-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs uppercase tracking-wide">
                  {profile.role}
                </span>
              )}
            </span>
          )}
          <button onClick={handleSignOut} className="text-xs text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
