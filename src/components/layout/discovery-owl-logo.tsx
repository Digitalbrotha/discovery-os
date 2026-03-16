import { cn } from '@/lib/utils'

interface DiscoveryOwlLogoProps {
  className?: string
  /** 'nav' = compact horizontal | 'login' = larger stacked */
  variant?: 'nav' | 'login'
}

export function DiscoveryOwlLogo({ className, variant = 'nav' }: DiscoveryOwlLogoProps) {
  const isLogin = variant === 'login'

  return (
    <div className={cn('flex items-center select-none', isLogin ? 'gap-3' : 'gap-2', className)}>
      {/* Owl glyph */}
      <OwlIcon size={isLogin ? 40 : 26} />

      {/* Wordmark */}
      <div className={cn('flex flex-col leading-none', isLogin ? 'gap-1' : 'gap-0')}>
        <span
          className={cn(
            'font-medium tracking-[-0.02em] text-text-primary',
            isLogin ? 'text-[11px] uppercase tracking-[0.1em] text-text-3' : 'text-[9px] uppercase tracking-[0.12em] text-text-3',
          )}
        >
          Discovery
        </span>
        <span
          className={cn(
            'font-bold tracking-[-0.03em] text-text-primary',
            isLogin ? 'text-[28px]' : 'text-[15px]',
          )}
          style={{ lineHeight: 1 }}
        >
          Owl
        </span>
      </div>
    </div>
  )
}

function OwlIcon({ size = 26 }: { size?: number }) {
  // All coordinates designed in a 40×40 viewBox
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      {/* ── Body / torso ── */}
      <ellipse cx="20" cy="26" rx="11" ry="9" fill="#C17B2A" />

      {/* ── Head ── */}
      <circle cx="20" cy="17" r="12" fill="#D4893A" />

      {/* ── Ear tufts ── */}
      <path d="M11 8 L8 2 L15 6.5Z" fill="#B8722A" />
      <path d="M29 8 L32 2 L25 6.5Z" fill="#B8722A" />

      {/* ── Facial disc (lighter inner face) ── */}
      <ellipse cx="20" cy="18" rx="8" ry="7" fill="#F0A84A" />

      {/* ── Left eye white ── */}
      <circle cx="15.5" cy="17" r="4" fill="#FDFAF5" />
      {/* ── Left iris ── */}
      <circle cx="15.5" cy="17" r="2.6" fill="#2C1A0E" />
      {/* ── Left pupil highlight ── */}
      <circle cx="16.3" cy="16.2" r="0.9" fill="white" />
      {/* ── Left eye ring ── */}
      <circle cx="15.5" cy="17" r="4" stroke="#B8722A" strokeWidth="0.8" fill="none" />

      {/* ── Right eye white ── */}
      <circle cx="24.5" cy="17" r="4" fill="#FDFAF5" />
      {/* ── Right iris ── */}
      <circle cx="24.5" cy="17" r="2.6" fill="#2C1A0E" />
      {/* ── Right pupil highlight ── */}
      <circle cx="25.3" cy="16.2" r="0.9" fill="white" />
      {/* ── Right eye ring ── */}
      <circle cx="24.5" cy="17" r="4" stroke="#B8722A" strokeWidth="0.8" fill="none" />

      {/* ── Beak ── */}
      <path d="M18.5 20.5 L20 23 L21.5 20.5 Q20 19.5 18.5 20.5Z" fill="#C17B2A" />

      {/* ── Wing feather hints ── */}
      <path d="M9 25 Q7 20 10 17" stroke="#B8722A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M31 25 Q33 20 30 17" stroke="#B8722A" strokeWidth="1.2" strokeLinecap="round" fill="none" />

      {/* ── Feet / talons ── */}
      <path d="M16 34 L14 38 M16 34 L16 38 M16 34 L18 38" stroke="#C17B2A" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M24 34 L22 38 M24 34 L24 38 M24 34 L26 38" stroke="#C17B2A" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
