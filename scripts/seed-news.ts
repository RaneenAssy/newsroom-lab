/**
 * Seeds sample data for the News section: categories, topics, hub chips and ~13 articles in
 * English and Arabic, in a mix of states. Safe to re-run — anything that already exists is skipped.
 *
 *   npm run seed:news
 *
 * Staff-created articles are written as the first staff user so the audit log gets real history
 * (CREATE / EDIT / CHANGE_STATUS), and links the English/Arabic versions of the same story; the AI-generated one is written with no user, so it appears as a
 * system action. All content is placeholder text, not real reporting.
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'

const payload = await getPayload({ config })

const staffDoc = (await payload.find({ collection: 'staff', limit: 1, depth: 0 })).docs[0]
if (!staffDoc) throw new Error('Create your first admin user at /admin before seeding.')
const staff = { ...staffDoc, collection: 'staff' as const }

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()

// ── Categories ───────────────────────────────────────────────────────────────
const categorySeed = [
  { slug: 'markets', name: 'Markets', nameAr: 'الأسواق', defaultCategory: true },
  { slug: 'economy', name: 'Economy', nameAr: 'الاقتصاد' },
  { slug: 'energy', name: 'Energy', nameAr: 'الطاقة' },
  { slug: 'banking', name: 'Banking', nameAr: 'البنوك' },
  { slug: 'crypto', name: 'Crypto', nameAr: 'العملات الرقمية' },
  { slug: 'real-estate', name: 'Real Estate', nameAr: 'العقارات' },
]
const cat: Record<string, string> = {}
for (const c of categorySeed) {
  const found = await payload.find({ collection: 'news-categories', where: { slug: { equals: c.slug } }, limit: 1, depth: 0 })
  cat[c.slug] = found.docs[0]?.id ?? (await payload.create({ collection: 'news-categories', data: { ...c, status: true }, user: staff })).id
}

// ── Topics ───────────────────────────────────────────────────────────────────
const topicSeed = [
  { slug: 'earnings', name: 'Earnings', nameAr: 'الأرباح' },
  { slug: 'ipo', name: 'IPOs', nameAr: 'الطروحات العامة' },
  { slug: 'dividends', name: 'Dividends', nameAr: 'توزيعات الأرباح' },
  { slug: 'central-bank', name: 'Central Bank', nameAr: 'البنك المركزي' },
  { slug: 'oil-prices', name: 'Oil Prices', nameAr: 'أسعار النفط' },
  { slug: 'regulation', name: 'Regulation', nameAr: 'التنظيم' },
  { slug: 'mergers-acquisitions', name: 'Mergers & Acquisitions', nameAr: 'الاندماج والاستحواذ' },
  {
    slug: 'sustainable-finance',
    name: 'Sustainable Finance',
    nameAr: 'التمويل المستدام',
    status: false,
    reviewStatus: 'pending' as const,
    origin: 'newsroom' as const,
    proposedReason: 'Several recent stories cover green bonds and ESG funds, which no existing topic fits.',
  },
]
for (const t of topicSeed) {
  const found = await payload.find({ collection: 'news-topics', where: { slug: { equals: t.slug } }, limit: 1, depth: 0 })
  if (!found.totalDocs) await payload.create({ collection: 'news-topics', data: { status: true, ...t }, user: staff })
}

// ── Hub chips ────────────────────────────────────────────────────────────────
const chipSeed = [
  { chipKind: 'tier' as const, key: 'country', sortOrder: 1 },
  { chipKind: 'tier' as const, key: 'sector', sortOrder: 2 },
  { chipKind: 'topic' as const, key: 'earnings', sortOrder: 3 },
  { chipKind: 'topic' as const, key: 'ipo', sortOrder: 4 },
  { chipKind: 'topic' as const, key: 'dividends', sortOrder: 5, visible: false },
]
for (const c of chipSeed) {
  const found = await payload.find({
    collection: 'news-hub-chips',
    where: { and: [{ chipKind: { equals: c.chipKind } }, { key: { equals: c.key } }] },
    limit: 1,
    depth: 0,
  })
  if (!found.totalDocs) await payload.create({ collection: 'news-hub-chips', data: { visible: true, ...c }, user: staff })
}

// ── Articles ─────────────────────────────────────────────────────────────────
type Country = 'ae' | 'sa' | 'kw' | 'qa' | 'bh' | 'om' | 'us'
const countryName: Record<Country, string> = {
  ae: 'United Arab Emirates',
  sa: 'Saudi Arabia',
  kw: 'Kuwait',
  qa: 'Qatar',
  bh: 'Bahrain',
  om: 'Oman',
  us: 'United States',
}
const countries = (...codes: Country[]) => codes.map((code) => ({ code, country: countryName[code] }))
const topicTags = (...keys: string[]) => keys.map((key) => ({ kind: 'topic' as const, key, role: 'mentioned' as const, score: 1, source: 'editor' as const }))
const countryTags = (...keys: Country[]) => keys.map((key) => ({ kind: 'country' as const, key, role: 'mentioned' as const, score: 1, source: 'editor' as const }))
const p = (...paras: string[]) => paras.map((t) => `<p>${t}</p>`).join('\n')

type Seed = {
  slug: string
  title: string
  lang: 'en' | 'ar'
  category: string
  body: string
  status: 'draft' | 'scheduled' | 'published'
  hoursAgo?: number
  hoursAhead?: number
  as?: 'staff' | 'system'
  /** Draft first, then these edits are applied in order — builds audit history. */
  followUps?: Record<string, unknown>[]
  extra?: Record<string, unknown>
}

const articles: Seed[] = [
  {
    slug: 'gulf-stocks-edge-higher-as-oil-steadies',
    title: 'Gulf stocks edge higher as oil steadies',
    lang: 'en',
    category: 'markets',
    status: 'published',
    hoursAgo: 6,
    body: p(
      'Major Gulf equity markets edged higher in early trade as crude prices held steady, with banks and real estate names leading gains.',
      'Analysts said investors were weighing the outlook for global rate policy against resilient regional growth. Trading volumes were broadly in line with recent averages.',
    ),
    extra: {
      countries: countries('ae', 'sa'),
      tags: [...countryTags('ae', 'sa'), ...topicTags('oil-prices')],
      metaTitle: 'Gulf stocks edge higher as oil steadies',
      metaDescription: 'Gulf equities rise in early trade as crude holds steady and banks lead gains.',
      isFeatured: true,
    },
  },
  {
    slug: 'emirates-banks-report-steady-lending-growth',
    title: 'Emirates banks report steady lending growth',
    lang: 'en',
    category: 'banking',
    status: 'published',
    hoursAgo: 30,
    body: p(
      'Lenders across the Emirates reported continued growth in corporate and retail lending, supported by healthy deposit inflows.',
      'Executives pointed to resilient demand from trade finance and real estate, while cautioning that funding costs remain a watch item.',
    ),
    followUps: [{ metaDescription: 'UAE banks post steady lending growth backed by deposit inflows.', metaTitle: 'Emirates banks report steady lending growth' }],
    extra: { countries: countries('ae'), tags: [...countryTags('ae'), ...topicTags('earnings')] },
  },
  {
    slug: 'central-bank-holds-rates-signals-data-dependent-path',
    title: 'Central bank holds rates, signals data-dependent path',
    lang: 'en',
    category: 'economy',
    status: 'draft',
    body: p('The central bank left its benchmark rate unchanged, in line with expectations.'),
    followUps: [
      {
        title: 'Central bank holds rates, signals a data-dependent path',
        description: p(
          'The central bank left its benchmark rate unchanged on Thursday, in line with expectations, and said future moves would depend on incoming data.',
          'Policymakers noted that inflation had eased but remained above target in some categories, and that labour markets stayed firm.',
        ),
      },
      { status: 'published', publishedAt: hoursFromNow(-52) },
    ],
    extra: { countries: countries('ae', 'sa'), tags: [...countryTags('ae', 'sa'), ...topicTags('central-bank')], publishedAt: hoursFromNow(-60) },
  },
  {
    slug: 'dubai-property-transactions-stay-resilient',
    title: 'Property transactions stay resilient in Dubai',
    lang: 'en',
    category: 'real-estate',
    status: 'published',
    hoursAgo: 78,
    body: p(
      'Residential transactions in Dubai remained resilient last month, with off-plan sales continuing to account for a large share of activity.',
      'Brokers said demand from overseas buyers stayed strong, although some segments saw prices level off.',
    ),
    extra: { countries: countries('ae'), tags: countryTags('ae') },
  },
  {
    slug: 'bitcoin-steadies-as-traders-weigh-regulatory-clarity',
    title: 'Bitcoin steadies as traders weigh regulatory clarity',
    lang: 'en',
    category: 'crypto',
    status: 'draft',
    body: p('Bitcoin traded in a narrow range as market participants digested the latest regulatory commentary.'),
    followUps: [{ title: 'Bitcoin steadies as traders weigh regulatory clarity in the Gulf' }],
    extra: { tags: topicTags('regulation'), editorNotes: 'Waiting on a quote from the regulator before publishing.' },
  },
  {
    slug: 'regional-ipo-pipeline-builds',
    title: 'Regional IPO pipeline builds into the second half',
    lang: 'en',
    category: 'markets',
    status: 'draft',
    body: p(
      'Bankers say the regional listings pipeline is filling up, with several companies preparing to test investor appetite.',
      'Sectors from healthcare to logistics are expected to feature, according to people familiar with the plans.',
    ),
    followUps: [{ status: 'scheduled', scheduleTime: hoursFromNow(40), publishedAt: hoursFromNow(40) }],
    extra: { countries: countries('ae', 'sa', 'kw'), tags: [...countryTags('ae', 'sa', 'kw'), ...topicTags('ipo')] },
  },
  {
    slug: 'energy-majors-eye-dividend-hikes',
    title: 'Energy majors eye dividend hikes ahead of earnings season',
    lang: 'en',
    category: 'energy',
    status: 'published',
    hoursAgo: 20,
    as: 'system',
    body: p(
      'Large energy producers are expected to signal higher shareholder payouts as earnings season approaches, according to analyst commentary.',
      'Strong cash generation and reduced debt were cited as the main drivers.',
    ),
    extra: {
      countries: countries('ae', 'sa'),
      tags: [...countryTags('ae', 'sa'), ...topicTags('dividends', 'earnings')],
      contentOrigin: 'AI_GENERATED_EDITOR_TRIGGERED',
      postEnrichmentStatus: 'enriched',
      aiOrigin: {
        generated: true,
        humanEdited: false,
        provider: 'anthropic',
        model: 'claude-sonnet-5-5',
        promptVersion: 'newsroom-v3',
        costUsd: 0.0412,
        generatedAt: hoursFromNow(-21),
        verificationBlockingClaims: 1,
        sourceCredits: [{ publisher: 'Sample Wire', title: 'Energy payouts in focus', publishedAt: hoursFromNow(-24) }],
      },
      editorialReview: { notes: 'Not yet reviewed by a human.' },
    },
  },
  {
    slug: 'global-markets-wrap-wall-street-closes-mixed',
    title: 'Global markets wrap: Wall Street closes mixed',
    lang: 'en',
    category: 'markets',
    status: 'published',
    hoursAgo: 12,
    body: p(
      'US equities closed mixed as investors balanced earnings results against rate expectations.',
      'Technology shares lagged while defensive sectors outperformed.',
    ),
    extra: {
      source: 'Sample Wire',
      countries: countries('us'),
      tags: countryTags('us'),
      contentOrigin: 'SYNDICATED_VERBATIM',
      licensing: {
        status: 'VERIFIED_PERMITTED_WITH_CONDITIONS',
        vendor: 'Sample Wire',
        attributionText: 'Source: Sample Wire',
        permissions: ['verbatim_republication', 'headline_reuse'],
        verifiedAt: hoursFromNow(-30),
      },
      indexing: { intent: 'NOINDEX_SYNDICATED', googlebot: 'noindex', googlebotNews: 'noindex', reason: 'Syndicated wire copy.' },
      suppressedTags: [{ kind: 'country', key: 'ae' }],
    },
  },
  {
    slug: 'sponsored-how-sample-bank-is-simplifying-sme-lending',
    title: 'Sponsored: How a sample bank is simplifying SME lending',
    lang: 'en',
    category: 'banking',
    status: 'published',
    hoursAgo: 100,
    body: p('This is placeholder sponsored content used to demonstrate the sponsored disclosure fields.'),
    extra: { sponsored: { isSponsored: true, advertiser: 'Sample Bank', disclosureText: 'Sponsored content' } },
  },
  {
    slug: 'gulf-stocks-cautious-oil-steadies-ar',
    title: 'الأسهم الخليجية تتحرك بحذر مع استقرار أسعار النفط',
    lang: 'ar',
    category: 'markets',
    status: 'published',
    hoursAgo: 7,
    body: p(
      'تحركت الأسهم الخليجية بحذر في التعاملات المبكرة مع استقرار أسعار النفط، وتصدرت البنوك وشركات العقارات المكاسب.',
      'ويوازن المستثمرون بين توقعات السياسة النقدية العالمية ونمو اقتصادي إقليمي متماسك.',
    ),
    extra: { countries: countries('ae', 'sa'), tags: [...countryTags('ae', 'sa'), ...topicTags('oil-prices')] },
  },
  {
    slug: 'uae-bank-lending-growth-steady-ar',
    title: 'نمو الإقراض المصرفي في الإمارات يواصل وتيرته الثابتة',
    lang: 'ar',
    category: 'banking',
    status: 'published',
    hoursAgo: 32,
    body: p(
      'سجلت البنوك العاملة في الإمارات نموًا متواصلًا في الإقراض للشركات والأفراد، بدعم من تدفقات الودائع القوية.',
      'وأشار مسؤولون تنفيذيون إلى استمرار الطلب في تمويل التجارة والعقارات.',
    ),
    followUps: [{ metaDescription: 'نمو ثابت في الإقراض المصرفي بالإمارات بدعم من تدفقات الودائع.' }],
    extra: { countries: countries('ae'), tags: [...countryTags('ae'), ...topicTags('earnings')] },
  },
  {
    slug: 'central-bank-holds-rates-ar',
    title: 'المركزي يثبت أسعار الفائدة ويلمّح إلى نهج مرتبط بالبيانات',
    lang: 'ar',
    category: 'economy',
    status: 'scheduled',
    hoursAhead: 18,
    body: p(
      'أبقى البنك المركزي على سعر الفائدة الأساسي دون تغيير بما يتماشى مع التوقعات، مؤكدًا أن قراراته المقبلة ستعتمد على البيانات الواردة.',
    ),
    extra: { countries: countries('ae', 'sa'), tags: [...countryTags('ae', 'sa'), ...topicTags('central-bank')] },
  },
  {
    slug: 'dubai-real-estate-momentum-ar',
    title: 'تداولات العقارات في دبي تحافظ على زخمها',
    lang: 'ar',
    category: 'real-estate',
    status: 'draft',
    body: p('حافظت تداولات العقارات السكنية في دبي على زخمها خلال الشهر الماضي.'),
    extra: { countries: countries('ae'), tags: countryTags('ae') },
  },
]

let created = 0
let skipped = 0
for (const a of articles) {
  const exists = await payload.find({ collection: 'news', where: { slug: { equals: a.slug } }, limit: 1, depth: 0, overrideAccess: true })
  if (exists.totalDocs) {
    skipped++
    continue
  }
  const publishedAt = a.hoursAgo !== undefined ? hoursFromNow(-a.hoursAgo) : a.hoursAhead !== undefined ? hoursFromNow(a.hoursAhead) : undefined
  const asSystem = a.as === 'system'
  const base = {
    title: a.title,
    slug: a.slug,
    lang: a.lang,
    url: 'no_url',
    description: a.body,
    status: a.status,
    mainCategory: cat[a.category],
    categories: [cat[a.category]],
    source: 'Sample data',
    scheduleTime: publishedAt ?? new Date().toISOString(),
    scheduleTimezone: 'Asia/Dubai',
    publishedAt,
    ...(asSystem ? {} : { mainAuthor: staff.id, contentReviewer: staff.id }),
    ...a.extra,
  }
  const doc = await payload.create({
    collection: 'news',
    data: base as never,
    overrideAccess: true,
    ...(asSystem ? {} : { user: staff }),
  })
  for (const change of a.followUps ?? []) {
    await payload.update({ collection: 'news', id: doc.id, data: change as never, overrideAccess: true, user: staff })
  }
  created++
}

// ── Link the English/Arabic versions of the same story ───────────────────────
// A translation group is a shared `uuid`. Pairs are matched by slug; already-linked pairs are skipped.
const translationPairs: [en: string, ar: string][] = [
  ['gulf-stocks-edge-higher-as-oil-steadies', 'gulf-stocks-cautious-oil-steadies-ar'],
  ['emirates-banks-report-steady-lending-growth', 'uae-bank-lending-growth-steady-ar'],
  ['central-bank-holds-rates-signals-data-dependent-path', 'central-bank-holds-rates-ar'],
]
let linked = 0
for (const [enSlug, arSlug] of translationPairs) {
  const find = async (slug: string) =>
    (await payload.find({ collection: 'news', where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  const [en, ar] = await Promise.all([find(enSlug), find(arSlug)])
  if (!en || !ar || en.uuid === ar.uuid) continue
  await payload.update({ collection: 'news', id: ar.id, data: { uuid: en.uuid }, overrideAccess: true, user: staff })
  linked++
}
console.log(`Translation pairs newly linked: ${linked}`)

const counts = {
  categories: (await payload.count({ collection: 'news-categories' })).totalDocs,
  topics: (await payload.count({ collection: 'news-topics' })).totalDocs,
  hubChips: (await payload.count({ collection: 'news-hub-chips' })).totalDocs,
  news: (await payload.count({ collection: 'news' })).totalDocs,
  auditLogs: (await payload.count({ collection: 'article-audit-logs' })).totalDocs,
}
console.log(`Seed done — articles created: ${created}, skipped (already there): ${skipped}`)
console.log('Totals:', JSON.stringify(counts))
process.exit(0)
