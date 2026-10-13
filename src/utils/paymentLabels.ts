import type { Payment } from '@/types/models'

/**
 * Receipt type display. A multi-head receipt names every head it covers —
 * showing only the first one would mislead (e.g. a receipt covering exam
 * as its second head would read as admission-only).
 */
export function receiptTypeLabel(
  p: Pick<Payment, 'feeType' | 'breakdown'> & { feeName?: string },
  labelOf: (feeType: string) => string,
): string {
  const lines = p.breakdown ?? []
  if (lines.length > 1) return `Multiple (${lines.length})`
  const first = lines[0]
  const key = first?.feeName || first?.feeType || p.feeName || p.feeType
  return labelOf(key)
}

export function receiptTypeTitle(
  p: Pick<Payment, 'feeType' | 'breakdown'> & { feeName?: string },
  labelOf: (feeType: string) => string,
): string {
  const lines = p.breakdown ?? []
  if (lines.length > 1)
    return lines.map((l) => labelOf(l.feeName || l.feeType)).join(', ')
  return ''
}
