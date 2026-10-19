<template>
  <div class="page">
    <h1 class="page__title">My Profile</h1>
    <AppCard title="Account">
      <div class="account">
        <PersonAvatar :name="auth.user?.name" :size="64" />
        <span class="account__name">{{ auth.user?.name || 'Account' }}</span>
      </div>
      <dl class="kv">
        <div><dt>Username</dt><dd>{{ auth.user?.email || '—' }}</dd></div>
        <div><dt>Role</dt><dd>{{ roleLabel }}</dd></div>
        <div><dt>Account ID</dt><dd>{{ auth.user?.id || '—' }}</dd></div>
      </dl>
    </AppCard>
    <PasswordChangeForm />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppCard from '@/components/common/AppCard.vue'
import PasswordChangeForm from '@/components/common/PasswordChangeForm.vue'
import PersonAvatar from '@/components/common/PersonAvatar.vue'
import { useAuthStore } from '@/stores/auth'

/**
 * My Profile — the signed-in user's own account page, shared by the admin and
 * super-admin panels (teachers keep their richer staff-record profile page).
 * The page re-fetches /me on mount: the session user is cached at login, so
 * without this an account rename (or an older cache) would linger here.
 */
const auth = useAuthStore()

onMounted(() => {
  void auth.refreshUser()
})

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  teacher: 'Teacher',
  accountant: 'Accountant',
  parent: 'Parent',
  student: 'Student',
  monitor: 'Monitor',
}

const roleLabel = computed(() => {
  const role = auth.user?.role
  if (!role) return '—'
  return ROLE_LABELS[role] ?? role
})
</script>

<style scoped>
.page {
  display: grid;
  gap: var(--spacing-md);
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: 0;
}
.account {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  min-width: 0;
}
.account__name {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  overflow-wrap: anywhere;
}
/* One labeled row per value — username stays visible and explicit. */
.kv {
  display: grid;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  margin: var(--spacing-lg) 0 0;
}
.kv div {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--spacing-xs);
}
.kv dt {
  color: var(--color-text-muted);
}
.kv dd {
  margin: 0;
  overflow-wrap: anywhere;
  text-align: right;
}
</style>
