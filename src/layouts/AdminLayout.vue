<template>
  <div class="app-shell">
    <aside id="app-nav" class="app-shell__sidebar" :class="{ 'app-shell__sidebar--open': navOpen }">
      <AppBrand />
      <nav class="app-shell__nav" aria-label="Main navigation">
        <div v-for="group in groupedNav" :key="group.section" class="app-shell__group">
          <button
            class="app-shell__section"
            :class="{ 'app-shell__section--active': group.section === activeSection }"
            type="button"
            :aria-expanded="!collapsed[group.section]"
            :aria-controls="`nav-group-${group.section}`"
            @click="toggleSection(group.section)"
          >
            <span>{{ group.section }}</span>
            <ChevronDown
              :size="16"
              class="app-shell__section-chevron"
              :class="{ 'app-shell__section-chevron--collapsed': collapsed[group.section] }"
            />
          </button>
          <div
            v-show="!collapsed[group.section]"
            :id="`nav-group-${group.section}`"
            class="app-shell__group-items"
          >
            <RouterLink
              v-for="item in group.items"
              :key="item.path"
              :to="item.path"
              class="app-shell__link"
              active-class="app-shell__link--active"
            >
              <NavIcon :name="item.icon" />
              <span class="app-shell__link-label">{{ item.name }}</span>
            </RouterLink>
          </div>
        </div>
      </nav>
      <!-- Super-admin works in the admin panel too — pinned below the nav so
           it stays reachable no matter how far the list is scrolled. -->
      <RouterLink
        v-if="isSuperAdmin"
        to="/super-admin/dashboard"
        class="app-shell__link app-shell__link--super"
      >
        <NavIcon name="external" />
        <span class="app-shell__link-label">Super Admin</span>
      </RouterLink>
    </aside>
    <div v-if="navOpen" class="app-shell__overlay" aria-hidden="true" @click="navOpen = false"></div>
    <div class="app-shell__body">
      <header class="app-shell__topbar">
        <button
          class="app-btn app-btn--ghost nav-toggle"
          type="button"
          :aria-expanded="navOpen"
          aria-controls="app-nav"
          :aria-label="navOpen ? 'Close menu' : 'Open menu'"
          @click="navOpen = !navOpen"
        >
          <Menu :size="20" />
        </button>
        <span class="app-shell__title">{{ pageTitle }}</span>
        <span
          v-if="scannerPending || scannerStatus !== 'ready'"
          class="app-shell__scan"
          :title="`Card reader: ${scannerPending ? 'reading…' : scannerStatus}`"
        >
          <AppSpinner v-if="scannerPending" size="sm" label="Reading card" />
          📡 {{ scannerPending ? 'Reading…' : scannerStatus }}
        </span>
        <button
          class="app-shell__icon-btn"
          type="button"
          :aria-label="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
          :title="theme === 'dark' ? 'Light theme' : 'Dark theme'"
          @click="toggleTheme"
        >
          <Sun v-if="theme === 'dark'" :size="18" />
          <Moon v-else :size="18" />
        </button>
        <UserMenu
          :name="auth.user?.name"
          :email="auth.user?.email"
          :role="auth.user?.role"
          @logout="onLogout"
        />
      </header>
      <main class="layout-main app-shell__main">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronDown, Menu, Moon, Sun } from 'lucide-vue-next'
import { ADMIN_NAV_ITEMS, ADMIN_SECTION_ORDER, ACCOUNTANT_NAV_ITEMS, MONITOR_NAV_ITEMS } from '@/constants/navigation'
import { satisfiesModuleGate } from '@/constants/modules'
import AppSpinner from '@/components/common/AppSpinner.vue'
import AppBrand from '@/components/common/AppBrand.vue'
import NavIcon from '@/components/common/NavIcon.vue'
import UserMenu from '@/components/common/UserMenu.vue'
import { useAuthStore } from '@/stores/auth'
import { useSchoolStore } from '@/stores/school'
import { useTheme } from '@/composables/useTheme'
import { useMobileNav } from '@/composables/useMobileNav'
import { usePageTitle } from '@/composables/usePageTitle'
import { useCardScanner, scannerPending, scannerStatus } from '@/composables/useCardScanner'

const auth = useAuthStore()
const school = useSchoolStore()
const router = useRouter()
const route = useRoute()
const { theme, toggleTheme } = useTheme()
// Card reader works on every admin page while the site stays open.
useCardScanner()

// Mobile drawer: sidebar slides over the content below 900px.
const { navOpen } = useMobileNav()

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
const pageTitle = usePageTitle(visibleNav)

/* ---- Collapsible nav groups ----
   Long menus stay readable: sections start open, the choice is remembered,
   and the section that owns the current route always opens itself. */
const COLLAPSE_KEY = 'school.nav.collapsed'

function readCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? '{}') as Record<string, boolean>
  } catch {
    return {}
  }
}
const collapsed = ref<Record<string, boolean>>(readCollapsed())

function persistCollapsed(): void {
  try {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed.value))
  } catch {
    /* ignore */
  }
}
function toggleSection(section: string): void {
  collapsed.value = { ...collapsed.value, [section]: !collapsed.value[section] }
  persistCollapsed()
}

/** Group that owns the current route — header highlight + auto-expand. */
const activeSection = computed(() => {
  const path = route.path
  const group = groupedNav.value.find((entry) =>
    entry.items.some((item) => item.path === path || path.startsWith(`${item.path}/`)),
  )
  return group?.section ?? ''
})

watch(
  activeSection,
  (section) => {
    if (section && collapsed.value[section]) {
      collapsed.value = { ...collapsed.value, [section]: false }
      persistCollapsed()
    }
  },
  { immediate: true },
)

async function onLogout(): Promise<void> {
  auth.logout()
  school.reset()
  await router.push('/login')
}
</script>

<!-- Shell styles (sidebar, topbar, drawer) live in src/assets/shell.css —
     shared by every layout so they cannot drift apart. -->
