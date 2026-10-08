import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers.js'
import type { Payload } from 'payload'

/**
 * Demo reader sign-in for the comments proof of concept.
 *
 * On uafinances.com, readers log in through the public API, which this playground does not have. As a stand-in, a
 * reader signs in by entering the email of a customer record (`users`), with no password, and gets a signed cookie
 * naming that user. It is on in development only (or with COMMENTS_DEMO_SIGNIN=true) and must never ship: a real
 * integration would read the reader's existing UA Finance session instead.
 */
export const READER_COOKIE = 'uaf_demo_reader'
export const READER_SESSION_DAYS = 7

export const demoSignInEnabled = (): boolean =>
  process.env.COMMENTS_DEMO_SIGNIN === 'true' || process.env.NODE_ENV !== 'production'

export type Reader = { id: string; name: string; email: string }

const sign = (userId: string): string =>
  createHmac('sha256', `${process.env.PAYLOAD_SECRET}:reader-session`).update(userId).digest('base64url')

export const encodeReaderCookie = (userId: string): string => `${userId}.${sign(userId)}`

const decodeReaderCookie = (value: string | undefined): string | null => {
  if (!value) return null
  const dot = value.lastIndexOf('.')
  if (dot <= 0) return null
  const userId = value.slice(0, dot)
  const given = Buffer.from(value.slice(dot + 1))
  const expected = Buffer.from(sign(userId))
  return given.length === expected.length && timingSafeEqual(given, expected) ? userId : null
}

/** The customer record if it may comment: it exists and is neither disabled (`status`) nor deactivated (`active`). */
export const loadActiveReader = async (payload: Payload, where: { id: string } | { email: string }): Promise<Reader | null> => {
  const found = await payload.find({
    collection: 'users',
    where: 'id' in where ? { id: { equals: where.id } } : { email: { equals: where.email.trim().toLowerCase() } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const user = found.docs[0]
  if (!user || user.status === false || user.active === false) return null
  return { id: user.id, name: user.name, email: user.email }
}

/** The signed-in reader for this request, or null. */
export const getReader = async (payload: Payload): Promise<Reader | null> => {
  if (!demoSignInEnabled()) return null
  const userId = decodeReaderCookie((await cookies()).get(READER_COOKIE)?.value)
  return userId ? loadActiveReader(payload, { id: userId }) : null
}
