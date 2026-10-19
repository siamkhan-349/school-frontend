<template>
  <div class="live-shell">
    <header class="live-shell__topbar">
      <span class="live-shell__brand">📡 {{ schoolName }} — Live Attendance</span>
      <span v-if="scannerPending || scannerStatus !== 'ready'" class="live-shell__scan">
        <AppSpinner v-if="scannerPending" size="sm" label="Reading card" />
        {{ scannerPending ? 'Reading…' : scannerStatus }}
      </span>
      <span class="live-shell__clock">{{ clock }}</span>
      <button class="app-btn app-btn--ghost" type="button" @click="onLogout">Logout</button>
    </header>
    <main class="live-shell__main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSchoolStore } from '@/stores/school'
import AppSpinner from '@/components/common/AppSpinner.vue'
import { useSettings } from '@/composables/useQueries'
import { useCardScanner, scannerPending, scannerStatus } from '@/composables/useCardScanner'

const auth = useAuthStore()
const school = useSchoolStore()
const router = useRouter()

const { data: settingsData } = useSettings()
const schoolName = computed(() => settingsData.value?.data.schoolName || 'School')

// Card reader works here too — same shell-wide listener as the admin panel.
useCardScanner()

const clock = ref('')
let timer: ReturnType<typeof setInterval> | null = null
function tick(): void {
  clock.value = new Date().toLocaleString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
onMounted(() => {
  tick()
  timer = setInterval(tick, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

async function onLogout(): Promise<void> {
  auth.logout()
  school.reset()
  await router.push('/login')
}
</script>

<!-- Shell styles (topbar, live grid) live in src/assets/shell.css —
     shared with the panel layouts. -->
