import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export const testUser = {
  email: 'dev@payloadcms.com',
  password: 'test',
}

/**
 * Seeds a test staff member (the admin-panel auth collection) for e2e admin tests.
 * The Super Admin role and Management department are created by onInit in payload.config.
 */
export async function seedTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  // Delete existing test user if any
  await payload.delete({
    collection: 'staff',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })

  const role = await payload.find({ collection: 'roles', where: { isSuperAdmin: { equals: true } }, limit: 1 })
  const department = await payload.find({ collection: 'staff-departments', limit: 1 })

  // Create fresh test user
  await payload.create({
    collection: 'staff',
    data: {
      ...testUser,
      name: 'Test Admin',
      role: role.docs[0].id,
      staffDepartment: department.docs[0].id,
    },
  })
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'staff',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })
}
