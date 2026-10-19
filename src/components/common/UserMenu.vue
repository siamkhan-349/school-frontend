<template>
  <div ref="rootEl" class="user-menu" @focusout="onFocusOut">
    <button
      ref="triggerEl"
      class="user-menu__trigger"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="`Account menu for ${displayName}`"
      @click="toggle"
      @keydown.down.prevent="openWithFocus"
    >
      <PersonAvatar :name="displayName" :size="30" />
      <span class="user-menu__meta">
        <span class="user-menu__name">{{ displayName }}</span>
        <span v-if="roleLabel" class="user-menu__role">{{ roleLabel }}</span>
      </span>
      <ChevronDown
        :size="16"
        class="user-menu__chevron"
        :class="{ 'user-menu__chevron--open': open }"
        aria-hidden="true"
      />
    </button>

    <div v-if="open" ref="menuEl" class="user-menu__panel" role="menu" aria-label="Account">
      <div class="user-menu__head">
        <span class="user-menu__head-name">{{ displayName }}</span>
        <span v-if="email" class="user-menu__head-email">{{ email }}</span>
        <span v-if="roleLabel" class="user-menu__role-chip">{{ roleLabel }}</span>
      </div>
      <RouterLink
        v-if="profileRoute"
        class="user-menu__item"
        role="menuitem"
        :to="profileRoute"
        @click="close()"
      >
        <UserRound :size="16" aria-hidden="true" />
        My Profile
      </RouterLink>
      <button class="user-menu__item" type="button" role="menuitem" @click="onLogout">
        <LogOut :size="16" aria-hidden="true" />
        Logout
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { ChevronDown, LogOut, UserRound } from 'lucide-vue-next'
import PersonAvatar from './PersonAvatar.vue'

const props = withDefaults(
  defineProps<{
    name?: string
    email?: string
    role?: string
  }>(),
  { name: '', email: '', role: '' },
)
const emit = defineEmits<{ logout: [] }>()

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  teacher: 'Teacher',
  accountant: 'Accountant',
  parent: 'Parent',
  student: 'Student',
  monitor: 'Monitor',
}

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const triggerEl = ref<HTMLButtonElement | null>(null)
const menuEl = ref<HTMLElement | null>(null)

const displayName = computed(() => props.name.trim() || 'Account')
const roleLabel = computed(() => (props.role ? (ROLE_LABELS[props.role] ?? props.role) : ''))

/** Role → its own profile page, where the panel has one. */
const PROFILE_ROUTES: Record<string, string> = {
  super_admin: '/super-admin/profile',
  admin: '/admin/profile',
  accountant: '/admin/profile',
  teacher: '/teacher/profile',
}
const profileRoute = computed(() => PROFILE_ROUTES[props.role] ?? '')

function toggle(): void {
  if (open.value) close()
  else open.value = true
}

function openWithFocus(): void {
  open.value = true
  void nextTick(() => menuEl.value?.querySelector<HTMLElement>('[role="menuitem"]')?.focus())
}

function close(restoreFocus = false): void {
  open.value = false
  if (restoreFocus) triggerEl.value?.focus()
}

function onDocumentPointer(event: PointerEvent): void {
  if (open.value && !rootEl.value?.contains(event.target as Node)) close()
}

function onDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open.value) close(true)
}

/** Tabbing out of the menu closes it, moving focus back first. */
function onFocusOut(event: FocusEvent): void {
  const next = event.relatedTarget as Node | null
  if (open.value && next && !rootEl.value?.contains(next)) close()
}

function onLogout(): void {
  close()
  emit('logout')
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointer)
  document.addEventListener('keydown', onDocumentKeydown)
})
onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointer)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<style scoped>
.user-menu {
  position: relative;
}
.user-menu__trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  height: 40px;
  padding: 0 var(--spacing-sm);
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.user-menu__trigger:hover {
  background: var(--color-surface-alt);
}
.user-menu__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.15;
  min-width: 0;
}
.user-menu__name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-menu__role {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
.user-menu__chevron {
  color: var(--color-text-muted);
  transition: transform var(--transition-fast);
}
.user-menu__chevron--open {
  transform: rotate(180deg);
}
.user-menu__panel {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  min-width: 230px;
  z-index: 50;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-xs);
  animation: user-menu-in 0.12s ease-out;
}
@keyframes user-menu-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.user-menu__head {
  display: grid;
  gap: 2px;
  padding: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--spacing-xs);
}
.user-menu__head-name {
  font-weight: var(--font-weight-bold);
}
.user-menu__head-email {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  overflow-wrap: anywhere;
}
.user-menu__role-chip {
  justify-self: start;
  margin-top: 2px;
  font-size: var(--font-size-xs);
  background: var(--color-primary-light);
  color: var(--color-text);
  border-radius: var(--radius-full);
  padding: 2px var(--spacing-sm);
}
.user-menu__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  height: 40px;
  padding: 0 var(--spacing-sm);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  font-weight: var(--font-weight-medium);
  text-align: left;
  text-decoration: none;
}
.user-menu__item:hover {
  background: var(--color-surface-alt);
}
@media (max-width: 640px) {
  .user-menu__meta,
  .user-menu__chevron {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .user-menu__panel {
    animation: none;
  }
  .user-menu__chevron {
    transition: none;
  }
}
</style>
