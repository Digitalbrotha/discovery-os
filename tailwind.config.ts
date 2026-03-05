import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
      colors: {
        // ── Surfaces ──
        background: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
        },
        border: {
          DEFAULT: 'var(--border)',
          soft: 'var(--border-soft)',
        },
        // ── Text ──
        text: {
          primary: 'var(--text-primary)',
          2: 'var(--text-2)',
          3: 'var(--text-3)',
        },
        // ── Stage colors ──
        'stage-captured':    'var(--stage-captured)',
        'stage-captured-fg': 'var(--stage-captured-fg)',
        'stage-testing':     'var(--stage-testing)',
        'stage-testing-fg':  'var(--stage-testing-fg)',
        'stage-solution':    'var(--stage-solution)',
        'stage-solution-fg': 'var(--stage-solution-fg)',
        'stage-validated':   'var(--stage-validated)',
        'stage-validated-fg':'var(--stage-validated-fg)',
        'stage-invalid':     'var(--stage-invalid)',
        'stage-invalid-fg':  'var(--stage-invalid-fg)',
        'stage-parked':      'var(--stage-parked)',
        'stage-parked-fg':   'var(--stage-parked-fg)',
        // ── Confidence colors ──
        'conf-low':    'var(--conf-low)',
        'conf-low-fg': 'var(--conf-low-fg)',
        'conf-med':    'var(--conf-med)',
        'conf-med-fg': 'var(--conf-med-fg)',
        'conf-hi':     'var(--conf-hi)',
        'conf-hi-fg':  'var(--conf-hi-fg)',
        // ── shadcn compatibility ──
        foreground:  'var(--text-primary)',
        card:        { DEFAULT: 'var(--surface)', foreground: 'var(--text-primary)' },
        popover:     { DEFAULT: 'var(--surface)', foreground: 'var(--text-primary)' },
        primary:     { DEFAULT: 'var(--text-primary)', foreground: 'var(--bg)' },
        secondary:   { DEFAULT: 'var(--surface-2)', foreground: 'var(--text-primary)' },
        muted:       { DEFAULT: 'var(--surface-2)', foreground: 'var(--text-2)' },
        accent:      { DEFAULT: 'var(--surface-2)', foreground: 'var(--text-primary)' },
        destructive: { DEFAULT: 'var(--stage-invalid)', foreground: 'var(--stage-invalid-fg)' },
        input:       'var(--border)',
        ring:        'var(--text-3)',
      },
      borderRadius: {
        lg: '8px',
        md: '6px',
        sm: '5px',
      },
      boxShadow: {
        card:            '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover':    '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [animate],
}

export default config
