import type { UserRole } from '@/types/models'

/**
 * Role separation:
 * - super_admin bypasses everything (can do all admin work + platform screens).
 * - every other role opens only its own prefix (admin.*, parent.*, ...).
 * - accountant works INSIDE the admin panel with a finance + student-admit
 *   subset (view + add/edit students, full fees/payments/payroll), but no
 *   delete and no academic/system screens.
 * Admin must NOT pass super-admin.* permissions — those screens are platform-only.
 */
const ACCOUNTANT_ALLOWED = new Set([
  'admin.dashboard.view',
  'admin.students.view',
  'admin.students.manage',
  'admin.teachers.view',
  'admin.payments.view',
  'admin.payments.manage',
  'admin.reports.view',
  // Own account page ("My Profile") — self-service for every panel member.
  'admin.profile.view',
])

export function canUsePermission(role: UserRole | null, permission: string): boolean {
  if (!role) return false
  if (role === 'super_admin') return true
  if (role === 'accountant') return ACCOUNTANT_ALLOWED.has(permission)
  return permission.startsWith(`${role}.`)
}
