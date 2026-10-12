/**
 * LOCAL TEST ACCOUNT for the backoffice styling spike: a Super Admin staff member used by the screenshot script
 * (scripts/backoffice-screenshots.mjs). Local development database only; never use these credentials anywhere else.
 *
 *   npx payload run scripts/seed-backoffice-tester.ts
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'

export const TESTER_EMAIL = 'backoffice-spike@example.test'
export const TESTER_PASSWORD = 'fOVW9XSLtBncdM3SbOKz'

const payload = await getPayload({ config })
const role = (await payload.find({ collection: 'roles', where: { isSuperAdmin: { equals: true } }, limit: 1, depth: 0 })).docs[0]
const department = (await payload.find({ collection: 'staff-departments', limit: 1, depth: 0 })).docs[0]
const existing = await payload.find({ collection: 'staff', where: { email: { equals: TESTER_EMAIL } }, limit: 1, depth: 0, overrideAccess: true })
if (!existing.totalDocs) {
  await payload.create({ collection: 'staff', overrideAccess: true, data: { email: TESTER_EMAIL, password: TESTER_PASSWORD, name: 'Spike Tester', role: role.id, staffDepartment: department.id } as never })
}
console.log('backoffice test staff ready')
process.exit(0)
