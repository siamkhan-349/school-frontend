<template>
  <div class="page">
    <h1 class="page__title">Module Management</h1>
    <p class="page__lead">
      Super-admin only. Base modules — Core, Students, Academic Setup and SMS — ship with every
      school and stay locked. Toggle the add-ons to lock/unlock them for the whole school: locked
      modules hide instantly from the sidebar and routes. Admins cannot change these.
    </p>

    <p v-if="isLoading" class="muted">Loading…</p>
    <template v-else>
      <section v-for="group in groups" :key="group.title" class="module-group">
        <h2 class="module-group__title">{{ group.title }}</h2>
        <div class="module-grid">
          <article
            v-for="m in group.items"
            :key="m.key"
            class="module-card"
            :class="{ 'module-card--off': !enabledSet.has(m.key) }"
          >
            <header class="module-card__head">
              <h3 class="module-card__name">{{ m.label }}</h3>
              <span class="chip" :class="{ 'chip--off': !enabledSet.has(m.key) }">
                {{ enabledSet.has(m.key) ? 'enabled' : 'disabled' }}
              </span>
            </header>
            <p class="module-card__desc">{{ m.description }}</p>
            <ul class="module-card__features">
              <li v-for="feature in m.features" :key="feature">{{ feature }}</li>
            </ul>
            <footer class="module-card__foot">
              <span v-if="m.locked" class="module-card__lock">
                <Lock :size="14" aria-hidden="true" />
                Always on — locked
              </span>
              <AppButton
                v-else
                :variant="enabledSet.has(m.key) ? 'ghost' : 'primary'"
                :disabled="saving"
                @click="toggle(m.key)"
              >
                {{ enabledSet.has(m.key) ? 'Disable' : 'Enable' }}
              </AppButton>
            </footer>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Lock } from 'lucide-vue-next'
import AppButton from '@/components/common/AppButton.vue'
import { MODULE_CATALOG, type ModuleCatalogEntry } from '@/constants/modules'
import { useModules, useUpdateModules } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { useSchoolStore } from '@/stores/school'

const toast = useToast()
const school = useSchoolStore()
// Entitlements endpoint (/coaching/modules) — writes are super-admin only.
const { data, isLoading } = useModules()
const { mutateAsync: updateModules, isPending: saving } = useUpdateModules()
const enabledSet = ref<Set<string>>(new Set())

const GROUP_TITLES: Record<string, string> = {
  Core: 'Base modules — always on',
  Academics: 'Academics add-ons',
  Finance: 'Finance add-ons',
  Communication: 'Communication add-ons',
  Portal: 'Portal add-ons',
}

// Sections follow catalog order (base first), then first-seen category order.
const groups = computed(() => {
  const order: string[] = []
  const byCategory = new Map<string, ModuleCatalogEntry[]>()
  for (const m of MODULE_CATALOG) {
    if (!byCategory.has(m.category)) {
      byCategory.set(m.category, [])
      order.push(m.category)
    }
    byCategory.get(m.category)?.push(m)
  }
  return order.map((category) => ({
    title: GROUP_TITLES[category] ?? category,
    items: byCategory.get(category) ?? [],
  }))
})

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
  margin-bottom: var(--spacing-sm);
}
.page__lead {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  max-width: 860px;
  margin-bottom: var(--spacing-xl);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.module-group {
  margin-bottom: var(--spacing-xl);
}
.module-group__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-md);
}
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--spacing-md);
}
.module-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
.module-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}
.module-card__name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.module-card__desc {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
}
.module-card__features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.module-card__features li {
  display: flex;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
.module-card__features li::before {
  content: '';
  flex: none;
  width: 5px;
  height: 5px;
  margin-top: 8px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
}
.module-card--off .module-card__features {
  opacity: 0.55;
}
.module-card__foot {
  margin-top: auto;
  padding-top: var(--spacing-sm);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}
.module-card__lock {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.chip {
  display: inline-block;
  flex: none;
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
</style>
