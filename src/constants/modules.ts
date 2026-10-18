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
}

/**
 * Platform catalog shown in the super-admin Modules page.
 * Locked rows are base modules that ship with every school: Students +
 * Academic Setup are the spine/master data everything else reads and SMS is
 * free — the API re-adds all four on every write, so they cannot be dropped.
 */
export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  { key: 'core', label: 'Core', category: 'Core', locked: true },
  { key: 'students', label: 'Students', category: 'Core', locked: true },
  { key: 'academics', label: 'Academic Setup', category: 'Core', locked: true },
  { key: 'sms', label: 'SMS', category: 'Core', locked: true },
  { key: 'attendance', label: 'Attendance', category: 'Academics' },
  { key: 'routine', label: 'Routine', category: 'Academics' },
  { key: 'exam_result', label: 'Exam & Result', category: 'Academics' },
  { key: 'payment', label: 'Fees & Payments', category: 'Finance' },
  { key: 'payroll', label: 'Payroll', category: 'Finance' },
  { key: 'notice', label: 'Notice & Events', category: 'Communication' },
  { key: 'parent', label: 'Parent Portal', category: 'Portal' },
]
