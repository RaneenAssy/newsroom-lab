import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import { findPublicArticle, listCommentThreads, publicArticleWhere } from '@/comments/comments'
import { demoSignInEnabled, getReader } from '@/comments/readerSession'
import { Comments } from '../../components/Comments'
import { categoryName, formatDay, imageOf } from '../../format'
import { langOf, strings } from '../../strings'

// Depends on the reader cookie and on comments posted a moment ago.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const article = await findPublicArticle(await getPayload({ config: await config }), decodeURIComponent(slug))
  return { title: article?.metaTitle || article?.title || 'Article not found' }
}

/** A published article as readers see it on uafinances.com, with the reader comments under it. */
export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayload({ config: await config })
  const article = await findPublicArticle(payload, decodeURIComponent(slug))
  if (!article) notFound()

  const lang = langOf(article.lang)
  const t = strings[lang]
  const category = categoryName(article, lang)
  const image = imageOf(article)

  const [{ threads, count }, reader, latest] = await Promise.all([
    listCommentThreads(payload, article.id),
    getReader(payload),
    payload.find({
      collection: 'news',
      where: { and: [publicArticleWhere, { lang: { equals: article.lang } }, { id: { not_equals: article.id } }] },
      sort: '-publishedAt',
      limit: 5,
      depth: 1,
      overrideAccess: true,
      select: { title: true, slug: true, newsBy: true, publishedAt: true, urlToImage: true },
    }),
  ])

  return (
    <main className="container page-grid" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
      <div className="main-col">
        <article>
          <h1 className="article-title">{article.title}</h1>
          <div className="article-meta-row">
            <div className="meta-lines">
              {article.newsBy && (
                <p className="meta-line">
                  <PersonIcon />
                  <span className="muted">{t.by}</span> <span className="strong">{article.newsBy}</span>
                </p>
              )}
              {article.publishedAt && (
                <p className="meta-line">
                  <CalendarIcon />
                  <span className="strong">{formatDay(article.publishedAt, lang)}</span>
                </p>
              )}
            </div>
            {category && <span className="chip">{category}</span>}
          </div>

          {image && (
            <figure className="hero">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url!} alt={article.altText || image.alt || ''} />
              {article.imageSourceCredit && <figcaption>{article.imageSourceCredit}</figcaption>}
            </figure>
          )}

          {/* Stored HTML was sanitised when the article was saved (see fields/articleBody). */}
          <div className="sun-editor-editable article-body" dangerouslySetInnerHTML={{ __html: article.description ?? '' }} />
        </article>

        <Comments
          articleId={article.id}
          path={`/news/${article.slug}`}
          lang={lang}
          enabled={article.commentsEnabled !== false}
          threads={threads}
          count={count}
          reader={reader ? { name: reader.name } : null}
          signInAvailable={demoSignInEnabled()}
        />
      </div>

      <aside className="side-col">
        <h2 className="side-title">{t.latest}</h2>
        <ul className="latest-list">
          {latest.docs.map((item) => {
            const thumb = imageOf(item as typeof article)
            return (
              <li key={item.id}>
                <Link href={`/news/${item.slug}`} className="latest-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {thumb ? <img src={thumb.url!} alt="" /> : <span className="thumb-placeholder" />}
                  <span>
                    <span className="latest-title">{item.title}</span>
                    <span className="latest-meta">
                      {item.newsBy} {item.publishedAt ? `• ${formatDay(item.publishedAt, lang)}` : ''}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </aside>
    </main>
  )
}

const PersonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </svg>
)

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
)
