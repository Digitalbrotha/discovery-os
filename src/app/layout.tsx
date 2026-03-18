import type { Metadata } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'DiscoveryOwl',
  description: 'Visualize and map your discovery work...',
  openGraph: {
    title: 'DiscoveryOwl',
    description: 'Visualize and map your discovery work...',
    url: 'https://www.discvrowl.com/',
    type: 'website',
    images: [{ url: 'https://www.discvrowl.com/your-og-image.png' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmMono.variable} font-sans`}>{children}</body>
    </html>
  )
}
