import type { StudentStatus } from '@/types/models'

/** Every status the API accepts (DB stores "left", shown as "Dropout"). */
export const STUDENT_STATUS_OPTIONS: { value: StudentStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'completed', label: 'Completed' },
  { value: 'left', label: 'Dropout' },
]

export function studentStatusLabel(status: string): string {
  return STUDENT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? (status || '—')
}
