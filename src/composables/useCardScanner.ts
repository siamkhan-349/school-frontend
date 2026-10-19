import { onMounted, onUnmounted, ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { attendanceService } from '@/services'

/** Last reader tap, shared so any page can display it (attendance shows it inline). */
export const lastCardTap = ref({ ok: '', err: '' })

export interface LastTapOk {
  ok: true
  tap: 'entry' | 'exit' | 'duplicate'
  student: { id: string; name: string; roll: string; classLabel: string }
  entryTime: string
  exitTime: string
  status: string
  message: string
  cardId: string
  at: number
}

export interface LastTapErr {
  ok: false
  error: string
  cardId: string
  at: number
}

/** Structured last tap — the /live screen reads this to show duplicates big in the middle. */
export const lastTapDetail = ref<LastTapOk | LastTapErr | null>(null)

/** Short topbar status: last tap result, or "ready". */
export const scannerStatus = ref('ready')

/** Staff live page sets this while open — the student scanner stays silent
 * there so the two systems never double-handle one punch. */
export const staffScanMode = ref(false)

/** True while a reader tap POST is in flight — shells show a tiny spinner. */
export const scannerPending = ref(false)

const INTERACTIVE = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'])

function tapErrorMessage(error: unknown): string {
  const err = error as {
    response?: { data?: { message?: string } }
    message?: string
  }
  return err?.response?.data?.message ?? err?.message ?? 'Tap failed'
}

/*
 * Shell-wide card scanning: the reader types like a keyboard, so one global
 * listener catches its burst on ANY admin page — the site just needs to stay
 * open, no particular page or focused box. Normal typing is never stolen:
 * keys landing in a text field, or Enter/Space on a focused button, are left
 * alone. A burst = 3+ chars ending with Enter inside ~1.5s (readers finish
 * in milliseconds).
 */
export function useCardScanner() {
  const qc = useQueryClient()
  const { mutate } = useMutation({
    mutationFn: async (cardId: string) => {
      scannerPending.value = true
      try {
        return await attendanceService.tap(cardId)
      } finally {
        scannerPending.value = false
      }
    },
    // Feedback lives in the topbar status only — no toast (reader fires
    // all day; toasts would bury real messages).
    onSuccess: (res, cardId) => {
      const d = res.data
      const msg =
        d.tap === 'duplicate'
          ? res.message
          : d.tap === 'entry'
            ? `${d.student.name} — Entry ${d.entryTime} (${d.status})`
            : `${d.student.name} — Exit ${d.exitTime}`
      lastCardTap.value = { ok: msg, err: '' }
      scannerStatus.value = msg
      lastTapDetail.value = {
        ok: true,
        tap: d.tap,
        student: d.student,
        entryTime: d.entryTime,
        exitTime: d.exitTime,
        status: d.status,
        message: msg,
        cardId: String(cardId ?? ''),
        at: Date.now(),
      }
      qc.invalidateQueries({ queryKey: ['attendance'] })
      qc.invalidateQueries({ queryKey: ['attendance-recent'] })
      qc.invalidateQueries({ queryKey: ['attendance-summary'] })
      qc.invalidateQueries({ queryKey: ['attendance-history'] })
      qc.invalidateQueries({ queryKey: ['attendance-report'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e: unknown, cardId) => {
      const msg = tapErrorMessage(e)
      lastCardTap.value = { ok: '', err: msg }
      scannerStatus.value = msg
      lastTapDetail.value = { ok: false, error: msg, cardId: String(cardId ?? ''), at: Date.now() }
    },
  })

  let burst = ''
  let burstAt = 0
  function fire(value: string): void {
    if (value.length >= 3) mutate(value)
  }
  function onKey(e: KeyboardEvent): void {
    // Staff live screen runs its own separate scanner.
    if (staffScanMode.value) return
    const el = e.target as HTMLElement | null
    const tag = (el?.tagName ?? '').toUpperCase()
    // Text fields keep their own keys (the scan box handles its own Enter).
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    // Focused buttons/links keep Enter/Space for activation.
    if (INTERACTIVE.has(tag) && (e.key === 'Enter' || e.key === ' ')) return
    const now = Date.now()
    // Readers finish in milliseconds; humans testing by hand get 5s.
    if (now - burstAt > 5000) burst = ''
    burstAt = now
    // Most readers end with Enter; some send Tab instead. Tab is only
    // hijacked on plain page body — never from a control.
    if (e.key === 'Enter' || (e.key === 'Tab' && !INTERACTIVE.has(tag))) {
      const value = burst.trim()
      burst = ''
      if (value.length >= 3) {
        e.preventDefault()
        fire(value)
      }
      return
    }
    if (e.key.length === 1) burst += e.key
  }

  onMounted(() => {
    window.addEventListener('keydown', onKey)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', onKey)
    burst = ''
  })
}
