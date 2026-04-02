import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'printing-ai-quote',
  description: 'MVP for printing AI quote',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
