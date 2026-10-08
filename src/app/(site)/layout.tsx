import { Cairo } from 'next/font/google'
import Link from 'next/link'
import React from 'react'
import './site.css'

// The live site sets every heading and paragraph in Cairo.
const cairo = Cairo({ subsets: ['latin', 'arabic'], weight: ['400', '500', '600', '700', '800'], display: 'swap' })

export const metadata = {
  title: { default: 'News — UA Finance (demo)', template: '%s — UA Finance (demo)' },
  // A local demo of the public site: never indexed.
  robots: { index: false, follow: false },
}

/**
 * A stand-in for the public uafinances.com news pages, used to demo reader comments. Colours, type and layout are
 * copied from the live article page; the header and footer are trimmed to what the demo needs.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cairo.className}>
      <body className="site">
        <header className="site-header">
          <div className="container header-row">
            <Link href="/news" className="brand" aria-label="UA Finance news">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ua-finance-logo.png" alt="UA Finance" width={130} height={43} />
            </Link>
            <nav className="header-nav">
              <Link href="/news">News</Link>
              <span>Markets</span>
              <span>Tools</span>
            </nav>
            <span className="demo-badge">Local demo</span>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="container">© 2026 UA Finance. Demo page in the newsroom-lab playground; not the live site.</div>
        </footer>
      </body>
    </html>
  )
}
