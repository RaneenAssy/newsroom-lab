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
      payload.create({ collection: 'languages', data: { name: 'Test', code: `t${Date.now()}`, appLangCode: 'tt', rtl: '0', status: 'active' }, user: await staffUser(), overrideAccess: false }),
    ).rejects.toThrow(/Upload flag/i)
  })

  it('lets staff change only the status of an older language that has no flag (the list switch)', async () => {
    const language = await payload.create({ collection: 'languages', data: { name: 'Legacy', code: `l${Date.now()}`, appLangCode: 'll', rtl: '0', status: 'active' }, overrideAccess: true })
    created.push(language.id)
    const updated = await payload.update({ collection: 'languages', id: language.id, data: { status: 'inactive' }, user: await staffUser(), overrideAccess: false })
    expect(updated.status).toBe('inactive')
  })
})
