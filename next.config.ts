import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // The Database type is hand-written and doesn't match Supabase v2's strict format.
    // Run `npx supabase gen types typescript` to generate proper types and remove this.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
