import type { UserRole } from '@/types/models'

/**
 * Role separation:
 * - super_admin bypasses everything (can do all admin work + platform screens).
 * - every other role opens only its own prefix (admin.*, parent.*, ...).
 * Admin must NOT pass super-admin.* permissions — those screens are platform-only.
 */
export function canUsePermission(role: UserRole | null, permission: string): boolean {
  if (!role) return false
  if (role === 'super_admin') return true
  return permission.startsWith(`${role}.`)
}
