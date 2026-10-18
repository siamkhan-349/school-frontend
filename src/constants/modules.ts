export const MODULES = {
  CORE: 'core',
  ATTENDANCE: 'attendance',
  ROUTINE: 'routine',
  EXAM_RESULT: 'exam_result',
  STAFF: 'staff',
  PAYMENT: 'payment',
  PAYROLL: 'payroll',
  ACCOUNTS: 'accounts',
  NOTICE: 'notice',
  TEACHER: 'teacher',
  ACCOUNTANT: 'accountant',
  MONITOR: 'monitor',
  PARENT: 'parent',
  REPORTS: 'reports',
  USERS: 'users',
  SETTINGS: 'settings',
} as const

export type ModuleKey = (typeof MODULES)[keyof typeof MODULES]

/** "any of" semantics — a list means ANY key opens the page. */
export function satisfiesModuleGate(
  gate: ModuleKey | ModuleKey[] | undefined,
  hasModule: (key: string) => boolean,
): boolean {
  if (!gate) return true
  return Array.isArray(gate) ? gate.some((k) => hasModule(k)) : hasModule(gate)
}

export interface ModuleCatalogEntry {
  key: ModuleKey
  label: string
  category: 'Core' | 'Academics' | 'People' | 'Finance' | 'Communication' | 'Portal' | 'System'
  locked?: boolean
  /** One-line pitch shown on the module card. */
  description: string
  /** What the module actually contains — kept in sync with the routes. */
  features: string[]
  /** Dependency hint shown under the features (resolver pulls the key in). */
  note?: string
}

/**
 * Platform catalog shown in the super-admin Modules page.
 * The locked Core row is the whole base set — platform shell, students,
 * academic setup and free SMS. The API re-adds it on every non-empty write,
 * so it can never be dropped; the rest are toggleable add-ons.
 */
export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  {
    key: 'core',
    label: 'Core',
    category: 'Core',
    locked: true,
    description: 'Ships with every school — the platform shell, students, academic setup and free SMS (sends use the credit balance).',
    features: [
      'Logins, roles & dashboards',
      'Students — admissions, guardians & ID cards',
      'Bulk import (CSV/Excel)',
      'Academics — sessions, classes, sections & subjects',
      'SMS — templates, bulk send & log',
    ],
  },
  {
    key: 'attendance',
    label: 'Attendance',
    category: 'Academics',
    description: 'Daily student and staff attendance, with live card-tap support.',
    features: [
      'Daily student attendance',
      'Staff attendance',
      'Live card-tap view (RFID)',
      'Monthly sheets & summaries',
      'Per-student attendance detail',
    ],
  },
  {
    key: 'routine',
    label: 'Routine',
    category: 'Academics',
    description: 'Weekly class timetable with clash checking and teacher schedules.',
    features: [
      'Weekly class routines',
      'Clash detection',
      'Teacher schedules',
      'Printable routine sheets',
    ],
  },
  {
    key: 'exam_result',
    label: 'Exam & Result',
    category: 'Academics',
    description: 'Exams, marks, merit lists and report cards.',
    features: [
      'Exams & subject setup',
      'Marks entry (admin & teacher)',
      'Merit list & rankings',
      'Report cards & result sheets',
      'Publish results to parent portal',
    ],
  },
  {
    key: 'staff',
    label: 'Teachers & Staff',
    category: 'People',
    description: 'Teacher, staff and employee records — profiles, subjects and photos.',
    features: [
      'Teacher & staff records',
      'Employee directory',
      'Teacher–subject assignment & class hours',
      'Photos & contact details',
    ],
    note: 'Enabled automatically while Attendance, Routine, Exams, Payroll, Notice or Users is on.',
  },
  {
    key: 'payment',
    label: 'Fees & Payments',
    category: 'Finance',
    description: 'Fee collection — structure, dues, receipts and payment entries.',
    features: [
      'Fee heads & class-wise structure',
      'Collect fees + printable receipts',
      'Dues list & bulk payment',
      'Payment methods & entries',
    ],
  },
  {
    key: 'payroll',
    label: 'Payroll',
    category: 'Finance',
    description: 'Staff salary sheets, payments and leave approval.',
    features: [
      'Monthly salary sheets',
      'Generate & mark paid',
      'Salary types & deductions',
      'Leave requests & approvals',
    ],
  },
  {
    key: 'accounts',
    label: 'Accounts & Ledger',
    category: 'Finance',
    description: 'School fund ledger — money in and out with heads and period summaries.',
    features: [
      'Income & expense entries',
      'Ledger heads & totals',
      'Balance summary by period',
      'Month-wise income vs expense',
    ],
  },
  {
    key: 'notice',
    label: 'Notice & Events',
    category: 'Communication',
    description: 'Notices and events for the staff and parent portals.',
    features: [
      'Notices & events',
      'Audience targeting',
      'Publish & archive',
      'Shown in staff & parent feeds',
    ],
  },
  {
    key: 'teacher',
    label: 'Teacher Panel',
    category: 'Portal',
    description: 'Teacher logins — own dashboard, schedule, leaves, salary slips and marks entry.',
    features: [
      'Teacher logins',
      'Own dashboard & profile',
      'Schedule, leaves & salary slips',
      'Marks entry (with Exam & Result)',
    ],
  },
  {
    key: 'accountant',
    label: 'Accountant Panel',
    category: 'Portal',
    description: 'Finance-staff logins — a scoped admin panel for fees, payroll and accounts.',
    features: [
      'Accountant logins',
      'Students & fee collection',
      'Payments, payroll & accounts',
      'Reports access (with Reports)',
    ],
  },
  {
    key: 'monitor',
    label: 'Monitor Panel',
    category: 'Portal',
    description: 'Live display logins — card-tap arrivals on a screen at the gate.',
    features: [
      'Monitor (display) logins',
      'Live card-tap screen',
      'Auto-refreshing arrival feed',
    ],
    note: 'Needs Attendance — enabled together.',
  },
  {
    key: 'parent',
    label: 'Parent Portal',
    category: 'Portal',
    description: 'Read-only portal where guardians follow their child — results, fees, routine and notices.',
    features: [
      'Child overview & profile',
      'Routine & results',
      'Fees, dues & receipts',
      'Notices & events feed',
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    category: 'System',
    description: 'Analytics page — student and dues charts, pass-rate snapshot and income-vs-expense statement.',
    features: [
      'Student & dues charts',
      'Pass-rate snapshot',
      'Income vs expense report (with Accounts)',
      'CSV / PDF / print export',
    ],
  },
  {
    key: 'users',
    label: 'Users',
    category: 'System',
    description: 'Login management — create and manage teacher, parent and accountant logins.',
    features: [
      'Login accounts list',
      'Role, status & password control',
      'Teacher-login linking',
      'Guardian child linking',
    ],
    note: 'Needs Teachers & Staff — enabled together.',
  },
  {
    key: 'settings',
    label: 'Settings',
    category: 'System',
    description: 'The school profile — name, address, timings, holidays and preferences.',
    features: [
      'School profile & timings',
      'Weekly & fixed holidays',
      'Change password',
      'Salary types (with Payroll)',
    ],
  },
]
