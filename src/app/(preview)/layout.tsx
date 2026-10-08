import React from 'react'
import './preview.css'

export const metadata = {
  title: 'Article preview',
  // Staff-only page: never indexed.
  robots: { index: false, follow: false },
}

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
