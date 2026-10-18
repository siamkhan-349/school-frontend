export const MODULES = {
  CORE: 'core',
  ATTENDANCE: 'attendance',
  ROUTINE: 'routine',
  EXAM_RESULT: 'exam_result',
  PAYMENT: 'payment',
  PAYROLL: 'payroll',
  NOTICE: 'notice',
  PARENT: 'parent',
} as const

export type ModuleKey = (typeof MODULES)[keyof typeof MODULES]

/** "any of" semantics — a list means ANY key opens the page. */
export function satisfiesModuleGate(
  gate: string | string[] | undefined,
  hasModule: (key: string) => boolean,
): boolean {
  if (!gate) return true
  return Array.isArray(gate) ? gate.some((k) => hasModule(k)) : hasModule(gate)
}

export interface ModuleCatalogEntry {
  key: string
  label: string
  category: 'Core' | 'Academics' | 'Finance' | 'Communication' | 'Portal'
  locked?: boolean
  /** One-line pitch shown on the module card. */
  description: string
  /** What the module actually contains — kept in sync with the routes. */
  features: string[]
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
      'Logins, roles & permissions',
      'School settings & role dashboards',
      'Students — admissions, guardians & ID cards',
      'Bulk import (CSV/Excel)',
      'Academics — sessions, classes, sections & subjects',
      'Teacher–subject assignment & class hours',
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
]
