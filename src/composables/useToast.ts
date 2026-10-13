import { ref } from 'vue'

interface ToastItem {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

const toasts = ref<ToastItem[]>([])
let seq = 0

export function toastSequence(): number {
  return seq
}

export function useToast() {
  function push(type: ToastItem['type'], message: string): void {
    seq += 1
    const id = seq
    toasts.value.push({ id, type, message })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, 4000)
  }

  return {
    toasts,
    success: (m: string) => push('success', m),
    error: (m: string) => push('error', m),
    info: (m: string) => push('info', m),
  }
}
