<template>
  <div class="app-shell">
    <aside class="app-shell__sidebar" :class="{ 'app-shell__sidebar--open': navOpen }">
      <div class="app-shell__brand">🏫 SchoolMS</div>
      <nav class="app-shell__nav">
        <div v-for="group in groupedNav" :key="group.section" class="app-shell__group">
          <div class="app-shell__section">{{ group.section }}</div>
          <RouterLink
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="app-shell__link"
            active-class="app-shell__link--active"
          >
            {{ item.name }}
          </RouterLink>
        </div>
        <!-- Super-admin works in the admin panel too — give them a way back. -->
        <RouterLink
          v-if="isSuperAdmin"
          to="/super-admin/dashboard"
          class="app-shell__link app-shell__link--super"
        >
          → Super Admin
        </RouterLink>
      </nav>
    </aside>
    <div v-if="navOpen" class="app-shell__overlay" @click="navOpen = false"></div>
    <div class="app-shell__body">
      <header class="app-shell__topbar">
        <button class="app-btn app-btn--ghost nav-toggle" type="button" @click="navOpen = !navOpen" aria-label="Open menu">
          <Menu :size="20" />
        </button>
        <span class="app-shell__env">live</span>
        <span v-if="scannerStatus !== 'ready'" class="app-shell__scan" :title="`Card reader: ${scannerStatus}`">📡 {{ scannerStatus }}</span>
        <button class="app-btn app-btn--ghost" type="button" @click="toggleTheme">
          {{ theme === 'dark' ? '☀ Light' : '🌙 Dark' }}
        </button>
        <button class="app-btn app-btn--ghost" type="button" @click="onLogout">Logout</button>
      </header>
      <main class="layout-main app-shell__main">
        <RouterView />
      </main>
    </div>
    <div class="app-toasts">
      <div v-for="t in toasts" :key="t.id" class="app-toast" :class="`app-toast--${t.type}`">
        {{ t.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Menu } from 'lucide-vue-next'
import { ADMIN_NAV_ITEMS, ADMIN_SECTION_ORDER, ACCOUNTANT_NAV_ITEMS, MONITOR_NAV_ITEMS } from '@/constants/navigation'
import { satisfiesModuleGate } from '@/constants/modules'
import { useAuthStore } from '@/stores/auth'
import { useSchoolStore } from '@/stores/school'
import { useTheme } from '@/composables/useTheme'
import { useToast } from '@/composables/useToast'
import { useCardScanner, scannerStatus } from '@/composables/useCardScanner'

const auth = useAuthStore()
const school = useSchoolStore()
const router = useRouter()
const { theme, toggleTheme } = useTheme()
const { toasts } = useToast()
// Card reader works on every admin page while the site stays open.
useCardScanner()

const visibleNav = computed(() => {
  const items =
    auth.user?.role === 'monitor'
      ? MONITOR_NAV_ITEMS
      : auth.user?.role === 'accountant'
        ? ACCOUNTANT_NAV_ITEMS
        : ADMIN_NAV_ITEMS
  return items.filter(
    (item) => auth.can(item.permission) && satisfiesModuleGate(item.module, (k) => school.hasModule(k)),
  )
})

const groupedNav = computed(() =>
  ADMIN_SECTION_ORDER.map((section) => ({
    section,
    items: visibleNav.value.filter((item) => (item.section ?? 'Overview') === section),
  })).filter((group) => group.items.length > 0),
)
const isSuperAdmin = computed(() => auth.user?.role === 'super_admin')

// Mobile drawer: sidebar slides over the content below 900px.
const navOpen = ref(false)
watch(
  () => router.currentRoute.value.fullPath,
  () => {
    navOpen.value = false
  },
)

async function onLogout(): Promise<void> {
  auth.logout()
  school.reset()
  await router.push('/login')
}
</script>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
}
.app-shell__sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: var(--spacing-lg) var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}
.app-shell__brand {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}
.app-shell__nav {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.app-shell__group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.app-shell__section {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-muted);
  text-transform: uppercase;
  padding: 0 var(--spacing-md);
}
.app-shell__link {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  color: var(--color-sidebar-text);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
}
.app-shell__link--active {
  background: var(--color-primary-light);
  color: var(--color-text);
}
.app-shell__link--super {
  margin-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-md);
  color: var(--color-primary);
}
.app-shell__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.app-shell__topbar {
  height: var(--topbar-height);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-lg);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.app-shell__env {
  margin-right: auto;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
.app-shell__scan {
  margin-right: auto;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-shell__main {
  padding-top: var(--spacing-lg);
  padding-bottom: var(--spacing-2xl);
}
.app-toasts {
  position: fixed;
  right: var(--spacing-lg);
  bottom: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  z-index: 50;
}
.app-toast {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
}
.app-toast--error {
  border-color: var(--color-danger);
}
.app-toast--success {
  border-color: var(--color-success);
}
.nav-toggle {
  display: none;
  align-items: center;
  justify-content: center;
}
@media (max-width: 900px) {
  .nav-toggle {
    display: inline-flex;
  }
  .app-shell__sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 40;
    height: 100dvh;
    overflow-y: auto;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }
  .app-shell__sidebar--open {
    transform: none;
    box-shadow: var(--shadow-lg);
  }
  .app-shell__overlay {
    position: fixed;
    inset: 0;
    z-index: 30;
    background: rgb(0 0 0 / 0.4);
  }
  .app-shell__topbar {
    height: auto;
    min-height: var(--topbar-height);
    flex-wrap: wrap;
    row-gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
  }
  .app-shell__scan {
    max-width: 45vw;
  }
}
</style>
