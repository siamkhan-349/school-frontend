export const MODULES = {
  CORE: 'core',
  STUDENTS: 'students',
  ACADEMICS: 'academics',
  ATTENDANCE: 'attendance',
  ROUTINE: 'routine',
  EXAM_RESULT: 'exam_result',
  PAYMENT: 'payment',
  PAYROLL: 'payroll',
  SMS: 'sms',
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
 * Locked rows are base modules that ship with every school: Students +
 * Academic Setup are the spine/master data everything else reads and SMS is
 * free — the API re-adds all four on every write, so they cannot be dropped.
 */
export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  {
    key: 'core',
    label: 'Core',
    category: 'Core',
    locked: true,
    description: 'The platform shell — logins, roles, settings and the shared dashboard every role uses.',
    features: [
      'Logins, roles & permissions',
      'School profile & settings',
      'Role dashboards & reports',
      'Teachers & staff records',
      'Admin user management',
    ],
  },
  {
    key: 'students',
    label: 'Students',
    category: 'Core',
    locked: true,
    description: 'The student spine — admissions, profiles and guardians everything else reads.',
    features: [
      'Admissions & student profiles',
      'Guardians & contact info',
      'Bulk import (CSV/Excel)',
      'Student ID cards',
    ],
  },
  {
    key: 'academics',
    label: 'Academic Setup',
    category: 'Core',
    locked: true,
    description: 'Master data — the sessions, classes, sections and subjects every page reads.',
    features: [
      'Academic sessions',
      'Classes, sections & shifts',
      'Departments & subjects',
      'Teacher–subject assignment',
      'Class hours (start & end)',
    ],
  },
  {
    key: 'sms',
    label: 'SMS',
    category: 'Core',
    locked: true,
    description: "Bulk SMS at no module cost — sends use the school's SMS credit balance.",
    features: [
      'Templates with placeholders',
      'Bulk send (class, section, group)',
      'Send log & delivery status',
      'Credit balance tracking',
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
