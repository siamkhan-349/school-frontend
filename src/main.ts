import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { MutationCache, QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

import App from './App.vue'
import router from './router'
import { toastSequence, useToast } from './composables/useToast'
import { useTheme } from './composables/useTheme'
import { useAuthStore } from './stores/auth'
import { useSchoolStore } from './stores/school'

function errorMessage(error: unknown): string {
  const err = error as {
    response?: { data?: { message?: string; detail?: string } }
    message?: string
  }
  return (
    err?.response?.data?.message ?? err?.response?.data?.detail ?? err?.message ?? 'Something went wrong.'
  )
}

const toast = useToast()

/** Global mutation fallback — silent failures become toasts. */
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      const handled = typeof mutation.options.onError === 'function'
      const before = toastSequence()
      setTimeout(() => {
        if (handled || toastSequence() !== before) return
        toast.error(errorMessage(error))
      }, 0)
    },
  }),
  defaultOptions: {
    queries: {
      // Auth failures never heal on retry — don't double-log 401/403s.
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status === 401 || status === 403) return false
        return failureCount < 1
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

const app = createApp(App)
app.use(createPinia())
app.use(VueQueryPlugin, { queryClient })
app.use(router)

/** The API client fires this when the refresh token is dead: drop everything
 *  and go to login instead of hammering the backend with 401s. */
window.addEventListener('school:session-expired', () => {
  try {
    useAuthStore().logout()
    useSchoolStore().reset()
  } catch {
    /* stores not ready yet — nothing to clear */
  }
  if (router.currentRoute.value.path !== '/login') {
    router.push('/login').catch(() => {})
  }
})

useTheme().initTheme()
app.mount('#app')
