import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/lib/api/apiClient'

/**
 * School (tenant) config — live backend only.
 * Single source for module-gating + session.
 */
export const useSchoolStore = defineStore('school', () => {
  const enabledModules = ref<string[]>([])
  const suspended = ref(false)
  const loaded = ref(false)

  const hasModule = computed(() => (key: string) => enabledModules.value.includes(key))

  async function fetchEnabledModules(force = false): Promise<void> {
    if (loaded.value && !force) return
    const res = await apiClient.get<{ modules: string[] }>('/school/modules')
    enabledModules.value = res.data.modules
    loaded.value = true
  }

  function reset(): void {
    enabledModules.value = []
    suspended.value = false
    loaded.value = false
  }

  return { enabledModules, suspended, loaded, hasModule, fetchEnabledModules, refresh: () => fetchEnabledModules(true), reset }
})
