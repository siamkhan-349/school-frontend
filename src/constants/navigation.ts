export interface NavItem {
  name: string
  path: string
  icon: string
  permission: string
  module?: string | string[]
  section?: string
}

export const ADMIN_SECTION_ORDER = [
  'Overview',
  'People',
  'Academics',
  'Finance',
  'Communication',
  'System',
] as const

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard', permission: 'admin.dashboard.view', section: 'Overview' },
  { name: 'Academics', path: '/admin/academics', icon: 'academics', permission: 'admin.dashboard.view', module: 'academics', section: 'Academics' },
  { name: 'Students', path: '/admin/students', icon: 'students', permission: 'admin.students.view', module: 'students', section: 'People' },
  { name: 'Card IDs', path: '/admin/students/cards', icon: 'students', permission: 'admin.students.manage', module: 'students', section: 'People' },
  { name: 'Teachers & Staff', path: '/admin/teachers', icon: 'people', permission: 'admin.teachers.view', section: 'People' },
  { name: 'Routine', path: '/admin/routine', icon: 'routine', permission: 'admin.routine.view', module: 'routine', section: 'Academics' },
  { name: 'Attendance', path: '/admin/attendance', icon: 'attendance', permission: 'admin.attendance.view', module: 'attendance', section: 'Academics' },
  { name: 'Live Attendance', path: '/live', icon: 'attendance', permission: 'admin.attendance.view', module: 'attendance', section: 'Academics' },
  { name: 'Staff Live', path: '/admin/attendance/staff-live', icon: 'attendance', permission: 'admin.attendance.view', module: 'attendance', section: 'Academics' },
  { name: 'Exams', path: '/admin/exams', icon: 'exam', permission: 'admin.results.view', module: 'exam_result', section: 'Academics' },
  { name: 'Results', path: '/admin/results', icon: 'results', permission: 'admin.results.view', module: 'exam_result', section: 'Academics' },
  { name: 'Collect Fee', path: '/admin/fees/collect', icon: 'payments', permission: 'admin.payments.view', module: 'payment', section: 'Finance' },
  { name: 'Fee', path: '/admin/fees', icon: 'payments', permission: 'admin.payments.view', module: 'payment', section: 'Finance' },
  { name: 'Dues List', path: '/admin/fees/dues', icon: 'payments', permission: 'admin.payments.view', module: 'payment', section: 'Finance' },
  { name: 'Payments', path: '/admin/payments', icon: 'invoice', permission: 'admin.payments.view', module: 'payment', section: 'Finance' },
  { name: 'Payroll', path: '/admin/payroll', icon: 'salary', permission: 'admin.dashboard.view', module: 'payroll', section: 'Finance' },
  { name: 'Accounts', path: '/admin/accounts', icon: 'invoice', permission: 'admin.payments.view', module: 'payment', section: 'Finance' },
  { name: 'SMS', path: '/admin/sms', icon: 'sms', permission: 'admin.dashboard.view', module: 'sms', section: 'Communication' },
  { name: 'Notice & Events', path: '/admin/events', icon: 'news', permission: 'admin.dashboard.view', module: 'notice', section: 'Communication' },
  { name: 'Reports', path: '/admin/reports', icon: 'reports', permission: 'admin.reports.view', section: 'System' },
  { name: 'Users', path: '/admin/users', icon: 'people', permission: 'admin.users.view', section: 'System' },
  { name: 'Settings', path: '/admin/settings', icon: 'settings', permission: 'admin.dashboard.view', section: 'System' },
]

/** The live-display login sees exactly one page. */
export const MONITOR_NAV_ITEMS: NavItem[] = [
  { name: 'Live Attendance', path: '/live', icon: 'attendance', permission: 'monitor.live.view', module: 'attendance', section: 'Overview' },
]

/** Accountant works inside /admin with a finance + student-admit subset (no delete). */
export const ACCOUNTANT_NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard', permission: 'admin.dashboard.view', section: 'Overview' },
  { name: 'Students', path: '/admin/students', icon: 'students', permission: 'admin.students.view', module: 'students', section: 'People' },
  { name: 'Card IDs', path: '/admin/students/cards', icon: 'students', permission: 'admin.students.manage', module: 'students', section: 'People' },
  { name: 'Teachers & Staff', path: '/admin/teachers', icon: 'people', permission: 'admin.teachers.view', section: 'People' },
  { name: 'Collect Fee', path: '/admin/fees/collect', icon: 'payments', permission: 'admin.payments.view', module: 'payment', section: 'Finance' },
  { name: 'Fee', path: '/admin/fees', icon: 'payments', permission: 'admin.payments.view', module: 'payment', section: 'Finance' },
  { name: 'Dues List', path: '/admin/fees/dues', icon: 'payments', permission: 'admin.payments.view', module: 'payment', section: 'Finance' },
  { name: 'Payments', path: '/admin/payments', icon: 'invoice', permission: 'admin.payments.view', module: 'payment', section: 'Finance' },
  { name: 'Payroll', path: '/admin/payroll', icon: 'salary', permission: 'admin.dashboard.view', module: 'payroll', section: 'Finance' },
  { name: 'Accounts', path: '/admin/accounts', icon: 'invoice', permission: 'admin.payments.view', module: 'payment', section: 'Finance' },
  { name: 'Reports', path: '/admin/reports', icon: 'reports', permission: 'admin.reports.view', section: 'System' },
]

export const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [  { name: 'Dashboard', path: '/super-admin/dashboard', icon: 'dashboard', permission: 'super-admin.dashboard.view' },
  { name: 'Modules', path: '/super-admin/modules', icon: 'modules', permission: 'super-admin.modules.view' },
  { name: 'System', path: '/super-admin/system', icon: 'system', permission: 'super-admin.system.view' },
  { name: 'SMS Control', path: '/super-admin/sms', icon: 'sms', permission: 'super-admin.system.view' },
  // Super-admin does all admin work too — one-click entry into the school panel.
  // Permission is admin.* so only super_admin (bypass) sees it; plain admins
  // never reach the super-admin shell to see this item.
  { name: '→ Admin Panel', path: '/admin/dashboard', icon: 'dashboard', permission: 'admin.dashboard.view' },
]

export const TEACHER_NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/teacher/dashboard', icon: 'dashboard', permission: 'teacher.dashboard.view' },
  { name: 'My Schedule', path: '/teacher/schedule', icon: 'routine', permission: 'teacher.schedule.view', module: 'routine' },
  { name: 'Leaves', path: '/teacher/leaves', icon: 'leave', permission: 'teacher.leaves.view', module: 'payroll' },
  { name: 'Salary', path: '/teacher/salary', icon: 'salary', permission: 'teacher.salary.view', module: 'payroll' },
  { name: 'Events', path: '/teacher/events', icon: 'news', permission: 'teacher.events.view', module: 'notice' },
  { name: 'Profile', path: '/teacher/profile', icon: 'people', permission: 'teacher.profile.view' },
]

export const PARENT_NAV_ITEMS: NavItem[] = [  { name: 'Dashboard', path: '/parent/dashboard', icon: 'dashboard', permission: 'parent.dashboard.view' },
  { name: 'My Children', path: '/parent/children', icon: 'children', permission: 'parent.children.view' },
  { name: 'Results', path: '/parent/results', icon: 'results', permission: 'parent.results.view', module: 'exam_result' },
  { name: 'Routine', path: '/parent/routine', icon: 'routine', permission: 'parent.routine.view', module: 'routine' },
  { name: 'Fees', path: '/parent/fees', icon: 'payments', permission: 'parent.payments.view', module: 'payment' },
  { name: 'Events', path: '/parent/events', icon: 'event', permission: 'parent.events.view', module: 'notice' },
]
