<template>
  <div class="live-shell">
    <header class="live-shell__topbar">
      <span class="live-shell__brand">📡 {{ schoolName }} — Live Attendance</span>
      <span v-if="scannerStatus !== 'ready'" class="live-shell__scan">{{ scannerStatus }}</span>
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
import { useSettings } from '@/composables/useQueries'
import { useCardScanner, scannerStatus } from '@/composables/useCardScanner'

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

<style scoped>
.live-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}
.live-shell__topbar {
  height: var(--topbar-height);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: 0 var(--spacing-lg);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.live-shell__brand {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-base);
  margin-right: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.live-shell__clock {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.live-shell__scan {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  max-width: 340px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.live-shell__main {
  flex: 1;
  padding: var(--spacing-lg);
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
}
@media (max-width: 640px) {
  .live-shell__topbar {
    height: auto;
    min-height: var(--topbar-height);
    flex-wrap: wrap;
    row-gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
  }
  .live-shell__brand {
    flex: 1 1 100%;
  }
  .live-shell__scan {
    max-width: 55vw;
  }
  .live-shell__main {
    padding: var(--spacing-md);
  }
}
</style>
