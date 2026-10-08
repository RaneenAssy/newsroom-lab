/**
 * Seeds the comments demo: three demo readers (customer records you can use with the demo sign-in on /news/<slug>)
 * and a few comments on published articles, including a reply and one comment hidden by staff.
 * Run `npm run seed:news` first. Safe to re-run: readers are matched by email, and articles that already have
 * comments are left alone.
 *
 *   npm run seed:comments
 *
 * All names and text are placeholders.
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'

const payload = await getPayload({ config })

const readerSeed = [
  { name: 'Sara Haddad', email: 'sara@demo-reader.test', language: 'en' as const },
  { name: 'Omar Khalil', email: 'omar@demo-reader.test', language: 'en' as const },
  { name: 'ليلى منصور', email: 'layla@demo-reader.test', language: 'ar' as const },
]
const readers: Record<string, string> = {}
for (const r of readerSeed) {
  const found = await payload.find({ collection: 'users', where: { email: { equals: r.email } }, limit: 1, depth: 0, overrideAccess: true })
  readers[r.email] =
    found.docs[0]?.id ??
    (
      await payload.create({
        collection: 'users',
        data: { ...r, status: true, active: true, isVerified: true, isAgreed: 'yes', signupSource: 'web' },
        overrideAccess: true,
      })
    ).id
}

const published = async (lang: 'en' | 'ar') =>
  (
    await payload.find({
      collection: 'news',
      where: { and: [{ status: { equals: 'published' } }, { lang: { equals: lang } }, { active: { not_equals: false } }] },
      sort: '-publishedAt',
      limit: 2,
      depth: 0,
      overrideAccess: true,
    })
  ).docs

const [en1, en2] = await published('en')
const [ar1] = await published('ar')
if (!en1) throw new Error('No published English articles. Run `npm run seed:news` first.')

type Seed = { author: string; body: string; replies?: Seed[]; hidden?: string }
const threadsFor: [string | undefined, Seed[]][] = [
  [
    en1.id,
    [
      {
        author: 'sara@demo-reader.test',
        body: 'Useful summary. Would be good to see how this compares with the same quarter last year.',
        replies: [{ author: 'omar@demo-reader.test', body: 'Agreed. The year-on-year numbers would make the trend much clearer.' }],
      },
      { author: 'omar@demo-reader.test', body: 'Buy now!!! Visit my channel for guaranteed returns', hidden: 'Spam / promotion' },
      { author: 'omar@demo-reader.test', body: 'Watching this closely.\nCurious whether the move holds through the end of the week.' },
    ],
  ],
  [en2?.id, [{ author: 'sara@demo-reader.test', body: 'Clear and to the point, thanks.' }]],
  [ar1?.id, [{ author: 'layla@demo-reader.test', body: 'تحليل مفيد، شكرًا. أتمنى رؤية المزيد من التفاصيل عن الأسواق الخليجية.' }]],
]

let created = 0
for (const [articleId, seeds] of threadsFor) {
  if (!articleId) continue
  const existing = await payload.count({ collection: 'comments', where: { article: { equals: articleId } }, overrideAccess: true })
  if (existing.totalDocs) continue
  for (const seed of seeds) {
    const parent = await payload.create({
      collection: 'comments',
      data: { article: articleId, author: readers[seed.author]!, body: seed.body, status: 'visible' },
      overrideAccess: true,
    })
    created++
    for (const reply of seed.replies ?? []) {
      await payload.create({
        collection: 'comments',
        data: { article: articleId, author: readers[reply.author]!, body: reply.body, parent: parent.id, status: 'visible' },
        overrideAccess: true,
      })
      created++
    }
    if (seed.hidden) {
      await payload.update({ collection: 'comments', id: parent.id, data: { status: 'hidden', moderationNote: seed.hidden }, overrideAccess: true })
    }
  }
}

payload.logger.info(`Comments demo: ${readerSeed.length} demo readers ready, ${created} comments created.`)
payload.logger.info(`Open http://localhost:3000/news/${en1.slug} and sign in as ${readerSeed[0]!.email}.`)
process.exit(0)
