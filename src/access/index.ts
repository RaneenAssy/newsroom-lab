import type { Access, PayloadRequest } from 'payload'

export const authenticated: Access = ({ req }) => Boolean(req.user)

type StaffAccess = { superAdmin: boolean; permissions: Set<string> }

/**
 * Resolves the logged-in staff member's role once per request: Super Admin flag plus the names of
 * the active permissions on the role. Mirrors `requirePermission` in the legacy API.
 */
const loadStaffAccess = async (req: PayloadRequest): Promise<StaffAccess> => {
  const cached = req.context.staffAccess as StaffAccess | undefined
  if (cached) return cached

  const result: StaffAccess = { superAdmin: false, permissions: new Set() }
  if (req.user?.collection === 'staff') {
    const roleRef = (req.user as { role?: string | { id: string } }).role
    const roleId = typeof roleRef === 'object' ? roleRef?.id : roleRef
    if (roleId) {
      const role = await req.payload.findByID({ collection: 'roles', id: roleId, depth: 0, req })
      result.superAdmin = Boolean(role?.isSuperAdmin)
      const permissionIds = (role?.permissions ?? []).map((p) => (typeof p === 'object' ? p.id : p))
      if (permissionIds.length) {
        const permissions = await req.payload.find({
          collection: 'permissions',
          where: { and: [{ id: { in: permissionIds } }, { status: { equals: true } }] },
          limit: permissionIds.length,
          depth: 0,
          pagination: false,
          req,
        })
        result.permissions = new Set(permissions.docs.map((p) => p.name))
      }
    }
  }
  req.context.staffAccess = result
  return result
}

export const superAdminOnly: Access = async ({ req }) => (await loadStaffAccess(req)).superAdmin

/** Passes for Super Admins, or staff whose role holds at least one of the named permissions. */
export const hasPermission =
  (...names: string[]): Access =>
  async ({ req }) => {
    const { superAdmin, permissions } = await loadStaffAccess(req)
    return superAdmin || names.some((name) => permissions.has(name))
  }

const auditLogAllowlist = new Set(
  (process.env.AUDIT_LOG_AUTHORIZED_USERS_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
)

/** Audit logs: Super Admins, the `view_audit_logs` permission, or an emailed allowlist (legacy behaviour). */
export const canReadAuditLogs: Access = async (args) => {
  const email = (args.req.user as { email?: string } | null)?.email?.toLowerCase()
  if (email && auditLogAllowlist.has(email)) return true
  return hasPermission('view_audit_logs')(args)
}
