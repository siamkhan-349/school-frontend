<template>
  <div class="app-shell">
    <aside class="app-shell__sidebar" :class="{ 'app-shell__sidebar--open': navOpen }">
      <div class="app-shell__brand">🏫 SchoolMS <span class="brand-tag">super</span></div>
      <nav class="app-shell__nav">
        <RouterLink
          v-for="item in visibleNav"
          :key="item.path"
          :to="item.path"
          class="app-shell__link"
          active-class="app-shell__link--active"
        >
          {{ item.name }}
        </RouterLink>
      </nav>
    </aside>
    <div v-if="navOpen" class="app-shell__overlay" @click="navOpen = false"></div>
    <div class="app-shell__body">
      <header class="app-shell__topbar">
        <button class="app-btn app-btn--ghost nav-toggle" type="button" @click="navOpen = !navOpen" aria-label="Open menu">
          <Menu :size="20" />
        </button>
        <span class="app-shell__env">super-admin</span>
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
import { SUPER_ADMIN_NAV_ITEMS } from '@/constants/navigation'
import { useAuthStore } from '@/stores/auth'
import { useSchoolStore } from '@/stores/school'
import { useTheme } from '@/composables/useTheme'
import { useToast } from '@/composables/useToast'

const auth = useAuthStore()
const school = useSchoolStore()
const router = useRouter()
const { theme, toggleTheme } = useTheme()
const { toasts } = useToast()

const visibleNav = computed(() => SUPER_ADMIN_NAV_ITEMS.filter((item) => auth.can(item.permission)))

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
.brand-tag {
  font-size: var(--font-size-xs);
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  border-radius: var(--radius-full);
  padding: 2px var(--spacing-sm);
  vertical-align: middle;
}
.app-shell__nav {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
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
}
</style>
