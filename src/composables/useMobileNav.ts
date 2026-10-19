import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

/**
 * Mobile drawer state shared by every panel layout:
 * closes on route change and on Escape, and locks body scroll while open.
 */
export function useMobileNav() {
  const router = useRouter()
  const navOpen = ref(false)

  watch(
    () => router.currentRoute.value.fullPath,
    () => {
      navOpen.value = false
    },
  )

  // The drawer covers the page — freeze the page scroll behind it.
  watch(navOpen, (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  })

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') navOpen.value = false
  }

  onMounted(() => document.addEventListener('keydown', onKeydown))
  onUnmounted(() => {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
  })

  return { navOpen }
}
