import { onMounted, onUnmounted, ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { attendanceService } from '@/services'
import { staffScanMode } from './useCardScanner'

/** Last staff tap, separate from the student scanner state. */
export const lastStaffTap = ref({ ok: '', err: '' })

export interface LastStaffTapOk {
  ok: true
  tap: 'entry' | 'exit' | 'duplicate'
  teacher: { id: string; name: string; designation: string; kind: string }
  entryTime: string
  exitTime: string
  status: string
  message: string
  cardId: string
  at: number
}

export interface LastStaffTapErr {
  ok: false
  error: string
  cardId: string
  at: number
}

export const lastStaffTapDetail = ref<LastStaffTapOk | LastStaffTapErr | null>(null)

function tapErrorMessage(error: unknown): string {
  const err = error as {
    response?: { data?: { message?: string } }
    message?: string
  }
  return err?.response?.data?.message ?? err?.message ?? 'Tap failed'
}

/*
 * Staff-only card/finger scanning. The reader sends an ID either way, so the
 * handling is identical to cards — only the endpoint differs from students.
 * Active only while the staff live page is open (it flips staffScanMode, and
 * the student scanner stays silent meanwhile).
 */
export function useStaffScanner() {
  const qc = useQueryClient()
  const { mutateAsync } = useMutation({
    mutationFn: (cardId: string) => attendanceService.staffTap(cardId),
    onSuccess: (res, cardId) => {
      const d = res.data
      const msg =
        d.tap === 'duplicate'
          ? res.message
          : d.tap === 'entry'
            ? `${d.teacher.name} — Entry ${d.entryTime} (${d.status})`
            : `${d.teacher.name} — Exit ${d.exitTime}`
      lastStaffTap.value = { ok: msg, err: '' }
      lastStaffTapDetail.value = {
        ok: true,
        tap: d.tap,
        teacher: d.teacher,
        entryTime: d.entryTime,
        exitTime: d.exitTime,
        status: d.status,
        message: msg,
        cardId: String(cardId ?? ''),
        at: Date.now(),
      }
      qc.invalidateQueries({ queryKey: ['staff-attendance'] })
    },
    onError: (e: unknown, cardId) => {
      const msg = tapErrorMessage(e)
      lastStaffTap.value = { ok: '', err: msg }
      lastStaffTapDetail.value = { ok: false, error: msg, cardId: String(cardId ?? ''), at: Date.now() }
    },
  })

  /** Resolves once the tap call settles, so callers can drive a busy state. */
  async function punch(cardId: string): Promise<void> {
    const value = cardId.trim()
    if (value.length < 3) return
    try {
      await mutateAsync(value)
    } catch {
      /* onError already surfaces the failure in lastStaffTap */
    }
  }

  let burst = ''
  let burstAt = 0
  function onKey(e: KeyboardEvent): void {
    const el = e.target as HTMLElement | null
    const tag = (el?.tagName ?? '').toUpperCase()
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    const now = Date.now()
    if (now - burstAt > 5000) burst = ''
    burstAt = now
    if (e.key === 'Enter' || e.key === 'Tab') {
      const value = burst.trim()
      burst = ''
      if (value.length >= 3) {
        e.preventDefault()
        punch(value)
      }
      return
    }
    if (e.key.length === 1) burst += e.key
  }

  onMounted(() => {
    staffScanMode.value = true
    window.addEventListener('keydown', onKey)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', onKey)
    staffScanMode.value = false
    burst = ''
  })

  return { punch }
}
