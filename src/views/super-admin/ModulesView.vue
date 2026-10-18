<template>
  <div class="page">
    <h1 class="page__title">Module Management</h1>
    <AppCard>
      <p class="muted">Super-admin only. Base modules — Core, Students, Academic Setup and SMS — ship with every school and stay locked here. Toggle the add-ons to lock/unlock them for the whole school: locked modules hide instantly from sidebar and routes. Admins cannot change these.</p>
      <p v-if="isLoading" class="muted">Loading…</p>
      <table v-else class="table">
        <thead>
          <tr><th>Module</th><th>Category</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="m in MODULE_CATALOG" :key="m.key">
            <td>{{ m.label }}</td>
            <td>{{ m.category }}</td>
            <td>
              <span class="chip" :class="{ 'chip--off': !enabledSet.has(m.key) }">
                {{ enabledSet.has(m.key) ? 'enabled' : 'disabled' }}
              </span>
            </td>
            <td class="row-actions">
              <button
                v-if="!m.locked"
                class="link-btn"
                type="button"
                :disabled="saving"
                @click="toggle(m.key)"
              >
                {{ enabledSet.has(m.key) ? 'Disable' : 'Enable' }}
              </button>
              <span v-else class="muted">locked</span>
            </td>
          </tr>
        </tbody>
      </table>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AppCard from '@/components/common/AppCard.vue'
import { MODULE_CATALOG } from '@/constants/modules'
import { useModules, useUpdateModules } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { useSchoolStore } from '@/stores/school'

const toast = useToast()
const school = useSchoolStore()
// Entitlements endpoint (/coaching/modules) — writes are super-admin only.
const { data, isLoading } = useModules()
const { mutateAsync: updateModules, isPending: saving } = useUpdateModules()
const enabledSet = ref<Set<string>>(new Set())

watch(
  data,
  (res) => {
    if (res?.data) enabledSet.value = new Set(res.data.enabledModules)
  },
  { immediate: true },
)

async function toggle(key: string): Promise<void> {
  const next = new Set(enabledSet.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  enabledSet.value = next
  try {
    await updateModules([...next])
    await school.refresh()
    toast.success(`Module ${next.has(key) ? 'enabled' : 'disabled'}`)
  } catch {
    toast.error('Update failed')
  }
}
</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-lg);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-sm);
}
.table th,
.table td {
  text-align: left;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}
.chip {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--color-success-light);
  color: var(--color-success);
  font-size: var(--font-size-xs);
}
.chip--off {
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
}
.row-actions {
  text-align: right;
}
.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
}
.link-btn:disabled {
  opacity: 0.5;
}
</style>
