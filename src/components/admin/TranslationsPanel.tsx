'use client'
import { useConfig, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useState } from 'react'

type Summary = { id: string; title: string; lang: 'en' | 'ar'; status: string }
const LABEL = { en: 'English', ar: 'Arabic' } as const
const other = (lang: 'en' | 'ar') => (lang === 'en' ? 'ar' : 'en')

/** Sidebar panel: see, create, link and unlink this article's other-language version. */
export const TranslationsPanel: React.FC = () => {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const router = useRouter()
  const api = `${config.routes.api}/news/${id}`
  const lang = useFormFields(([f]) => f.lang?.value as 'en' | 'ar' | undefined) ?? 'en'
  const [translations, setTranslations] = useState<Summary[] | null>(null)
  const [candidates, setCandidates] = useState<Summary[]>([])
  const [pick, setPick] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const call = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(`${api}/${path}`, { credentials: 'include', ...init })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`)
      return data
    },
    [api],
  )

  const load = useCallback(async () => {
    try {
      const t = await call('translations')
      setTranslations(t.translations)
      setCandidates(t.translations.length ? [] : (await call('linkable')).candidates)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load translations')
    }
  }, [call])

  useEffect(() => {
    if (id) void load()
  }, [id, load])

  if (!id) {
    return <p style={{ color: 'var(--theme-elevation-500)', fontSize: 13 }}>Save the article first, then you can create or link its {LABEL[other(lang)]} version.</p>
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const target = other(lang)
  const linked = translations?.[0]

  return (
    <div className="uaf-translations" style={{ marginBottom: 'var(--base)' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Translations</div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        <strong>{LABEL[lang]}</strong> — this article
      </div>

      {translations === null && !error && <div style={{ fontSize: 13 }}>Loading…</div>}

      {linked && (
        <div style={{ fontSize: 13 }}>
          <strong>{LABEL[linked.lang]}</strong> —{' '}
          <Link href={`/admin/collections/news/${linked.id}`}>{linked.title}</Link> <em>({linked.status})</em>
          <div style={{ marginTop: 6 }}>
            <button
              type="button"
              className="btn btn--style-secondary btn--size-small"
              disabled={busy}
              onClick={() => run(async () => { await call('unlink-translation', { method: 'POST' }); await load() })}
            >
              Unlink
            </button>
          </div>
        </div>
      )}

      {translations && !linked && (
        <div style={{ fontSize: 13 }}>
          <div style={{ marginBottom: 6 }}>
            <strong>{LABEL[target]}</strong> — no version yet
          </div>
          <button
            type="button"
            className="btn btn--style-primary btn--size-small"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const { doc } = await call('create-translation', { method: 'POST' })
                router.push(`/admin/collections/news/${doc.id}`)
              })
            }
          >
            Create {LABEL[target]} version
          </button>
          {candidates.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ marginBottom: 4 }}>…or link an existing {LABEL[target]} article:</div>
              <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ width: '100%', marginBottom: 6 }}>
                <option value="">Select an article…</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.status})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn--style-secondary btn--size-small"
                disabled={busy || !pick}
                onClick={() =>
                  run(async () => {
                    await call('link-translation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: pick }) })
                    setPick('')
                    await load()
                  })
                }
              >
                Link
              </button>
            </div>
          )}
        </div>
      )}

      {error && <div style={{ color: 'var(--theme-error-500)', fontSize: 13, marginTop: 6 }}>{error}</div>}
    </div>
  )
}
