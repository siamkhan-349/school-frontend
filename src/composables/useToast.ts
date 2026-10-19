import { ref } from 'vue'

interface ToastItem {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

/** More than 3 stacked toasts covers half a phone screen. */
const MAX_TOASTS = 3
const TOAST_TTL = 4000

const toasts = ref<ToastItem[]>([])
let seq = 0

export function toastSequence(): number {
  return seq
}

export function useToast() {
  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function push(type: ToastItem['type'], message: string): void {
    seq += 1
    const id = seq
    toasts.value.push({ id, type, message })
    if (toasts.value.length > MAX_TOASTS) {
      toasts.value = toasts.value.slice(-MAX_TOASTS)
    }
    setTimeout(() => dismiss(id), TOAST_TTL)
  }

  return {
    toasts,
    dismiss,
    success: (m: string) => push('success', m),
    error: (m: string) => push('error', m),
    info: (m: string) => push('info', m),
  }
}
