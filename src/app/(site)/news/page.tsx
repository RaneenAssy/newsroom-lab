import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import { publicArticleWhere } from '@/comments/comments'
import { categoryName, formatDay, imageOf } from '../format'
import { langOf } from '../strings'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Latest news' }

/** Every published article, newest first: the way into the demo article pages. */
export default async function NewsIndexPage() {
  const payload = await getPayload({ config: await config })
  const { docs } = await payload.find({
    collection: 'news',
    where: publicArticleWhere,
    sort: '-publishedAt',
    limit: 30,
    depth: 1,
    overrideAccess: true,
  })

  return (
    <main className="container news-index">
      <h1 className="article-title">Latest news</h1>
      {docs.length === 0 && <p className="comments-note">No published articles yet. Publish one in the admin, or run <code>npm run seed:news</code>.</p>}
      <ul className="news-grid">
        {docs.map((article) => {
          const lang = langOf(article.lang)
          const image = imageOf(article)
          const category = categoryName(article, lang)
          return (
            <li key={article.id} dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
              <Link href={`/news/${article.slug}`} className="news-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {image ? <img src={image.url!} alt="" /> : <span className="thumb-placeholder" />}
                <span className="news-card-body">
                  {category && <span className="chip">{category}</span>}
                  <span className="news-card-title">{article.title}</span>
                  <span className="latest-meta">
                    {article.newsBy} {article.publishedAt ? `• ${formatDay(article.publishedAt, lang)}` : ''}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
