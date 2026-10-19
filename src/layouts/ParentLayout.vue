<template>
  <div class="app-shell">
    <aside id="app-nav" class="app-shell__sidebar" :class="{ 'app-shell__sidebar--open': navOpen }">
      <AppBrand />
      <nav class="app-shell__nav" aria-label="Main navigation">
        <RouterLink
          v-for="item in visibleNav"
          :key="item.path"
          :to="item.path"
          class="app-shell__link"
          active-class="app-shell__link--active"
        >
          <NavIcon :name="item.icon" />
          <span class="app-shell__link-label">{{ item.name }}</span>
        </RouterLink>
      </nav>
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
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Menu, Moon, Sun } from 'lucide-vue-next'
import AppBrand from '@/components/common/AppBrand.vue'
import NavIcon from '@/components/common/NavIcon.vue'
import UserMenu from '@/components/common/UserMenu.vue'
import { PARENT_NAV_ITEMS } from '@/constants/navigation'
import { satisfiesModuleGate } from '@/constants/modules'
import { useAuthStore } from '@/stores/auth'
import { useSchoolStore } from '@/stores/school'
import { useTheme } from '@/composables/useTheme'
import { useMobileNav } from '@/composables/useMobileNav'
import { usePageTitle } from '@/composables/usePageTitle'

const auth = useAuthStore()
const school = useSchoolStore()
const router = useRouter()
const { theme, toggleTheme } = useTheme()

// Mobile drawer: sidebar slides over the content below 900px.
const { navOpen } = useMobileNav()

const visibleNav = computed(() =>
  PARENT_NAV_ITEMS.filter(
    (item) => auth.can(item.permission) && satisfiesModuleGate(item.module, (k) => school.hasModule(k)),
  ),
)

const pageTitle = usePageTitle(visibleNav)

async function onLogout(): Promise<void> {
  auth.logout()
  school.reset()
  await router.push('/login')
}
</script>

<!-- Shell styles (sidebar, topbar, drawer) live in src/assets/shell.css —
     shared by every layout so they cannot drift apart. -->
