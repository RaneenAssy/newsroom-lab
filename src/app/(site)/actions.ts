'use server'
import { cookies } from 'next/headers.js'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { postComment } from '@/comments/comments'
import { demoSignInEnabled, encodeReaderCookie, getReader, loadActiveReader, READER_COOKIE, READER_SESSION_DAYS } from '@/comments/readerSession'

export type FormState = { error?: string; ok?: boolean; nonce?: number }

const payloadInstance = async () => getPayload({ config: await config })

/** Re-renders the page the form was on; only news pages, whatever the form posted. */
const refreshPage = (formData: FormData) => {
  const path = String(formData.get('path') ?? '')
  revalidatePath(/^\/news(\/[\w\p{L}\p{N}%-]+)?$/u.test(path) ? path : '/news')
}

export async function signInReader(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!demoSignInEnabled()) return { error: 'Sign-in is not available here.' }
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Enter your email.' }

  const reader = await loadActiveReader(await payloadInstance(), { email })
  if (!reader) return { error: 'No active reader account uses that email.' }

  ;(await cookies()).set(READER_COOKIE, encodeReaderCookie(reader.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: READER_SESSION_DAYS * 24 * 60 * 60,
  })
  refreshPage(formData)
  return { ok: true }
}

export async function signOutReader(formData: FormData): Promise<void> {
  ;(await cookies()).delete(READER_COOKIE)
  refreshPage(formData)
}

export async function submitComment(_prev: FormState, formData: FormData): Promise<FormState> {
  const payload = await payloadInstance()
  const reader = await getReader(payload)
  if (!reader) return { error: 'Sign in to comment.' }

  const result = await postComment(payload, {
    readerId: reader.id,
    articleId: String(formData.get('articleId') ?? ''),
    body: String(formData.get('body') ?? ''),
    parentId: (formData.get('parentId') as string | null) || null,
  })
  if (!result.ok) return { error: result.error }

  refreshPage(formData)
  // A fresh nonce lets the form clear itself even when two posts in a row succeed.
  return { ok: true, nonce: Date.now() }
}
