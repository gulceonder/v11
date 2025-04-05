import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Exercise Tracker',
  description: 'Track your exercises',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}