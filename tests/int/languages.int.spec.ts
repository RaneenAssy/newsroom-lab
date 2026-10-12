import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

let payload: Payload
const created: string[] = []

describe('languages (production LanguageForm rules)', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })
  afterAll(async () => {
    if (created.length) await payload.delete({ collection: 'languages', where: { id: { in: created } }, overrideAccess: true })
  })

  const staffUser = async () => {
    const staff = (await payload.find({ collection: 'staff', limit: 1, depth: 0, overrideAccess: true })).docs[0]
    return { ...staff, collection: 'staff' as const }
  }

  it('requires a flag when staff create a language', async () => {
    await expect(
      // @ts-expect-error the required flag is left out on purpose
      payload.create({ collection: 'languages', data: { name: 'Test', code: `t${Date.now()}`, appLangCode: 'tt', rtl: '0', status: 'active' }, user: await staffUser(), overrideAccess: false }),
    ).rejects.toThrow(/Upload flag/i)
  })

  it('gives every language a flag on startup, so older records stay editable', async () => {
    const withoutFlag = await payload.count({ collection: 'languages', where: { or: [{ flagImg: { exists: false } }, { flagImg: { equals: null } }] }, overrideAccess: true })
    expect(withoutFlag.totalDocs).toBe(0)
    const english = (await payload.find({ collection: 'languages', where: { code: { equals: 'en' } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
    const updated = await payload.update({ collection: 'languages', id: english.id, data: { status: english.status }, user: await staffUser(), overrideAccess: false })
    expect(updated.flagImg).toBeTruthy()
  })
})
