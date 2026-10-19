<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Fee Management</h1>
        <p class="page__hint">Name fees per class — and per department where the class has them (Class 9/10). Monthly-type fees repeat on their cycle; collection prefills from here.</p>
      </div>
      <div class="mode-row">
        <AppButton variant="ghost" type="button" @click="goSetup()">Full Fee Setup</AppButton>
        <AppButton type="button" @click="quickOpen = true">Single Fee Add</AppButton>
      </div>
    </div>

    <div class="chips">
      <span class="chip"><AppSkeleton v-if="ovLoading" variant="chip" :width="'72px'" /><template v-else>{{ configuredClasses }} {{ configuredClasses === 1 ? 'class' : 'classes' }} configured</template></span>
      <span class="chip"><AppSkeleton v-if="ovLoading" variant="chip" :width="'72px'" /><template v-else>{{ overviewRows.length }} fees set</template></span>
    </div>

    <AppCard title="Saved fees">
      <FilterPanel>
        <input v-model="ovSearch" class="app-input__control" placeholder="Search class / fee name…" />
        <select v-model="ovClassId" class="app-input__control">
          <option value="">All classes</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
        </select>
        <AppButton variant="ghost" type="button" @click="resetOverview">Reset</AppButton>
      </FilterPanel>
      <AppSkeleton v-if="ovLoading" variant="table" :rows="8" :cols="6" />
      <table v-else class="table">
        <thead>
          <tr><th><button class="sort-btn" type="button" @click="ovSort.toggle('class')">Class{{ ovSort.arrow('class') }}</button></th><th>Scope</th><th>Fee name</th><th>Cycle</th><th><button class="sort-btn" type="button" @click="ovSort.toggle('amount')">Amount (৳){{ ovSort.arrow('amount') }}</button></th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="row in pagedOverview" :key="row.id">
            <td>{{ row.classLabel }}</td>
            <td>
              <span class="badge" :class="row.departmentId ? 'badge--dept' : 'badge--common'">
                {{ row.department || 'Common' }}
              </span>
            </td>
            <td>{{ row.name }}</td>
            <td class="muted">{{ cycleLabel(row.cycleDays) }}</td>
            <td>৳{{ row.amount }}</td>
            <td class="row-actions">
              <button class="link-btn" type="button" @click="openPriceEdit(row)">Edit</button>
            </td>
          </tr>
          <tr v-if="pagedOverview.length === 0">
            <td colspan="6" class="muted">No fees set yet — open Full Fee Setup to set them.</td>
          </tr>
        </tbody>
      </table>
      <AppPagination v-model:page="ovPage" v-model:per-page="ovPerPage" :total="sortedOverview.length" :busy="ovLoading" />
    </AppCard>

    <AppCard title="Recurring dues">
      <p class="muted">Monthly-type fees accrue per cycle. Auto runs daily — use this when a run was missed.</p>
      <div class="mode-row">
        <AppButton type="button" :loading="generatingDues" @click="runGenerateDues">
          Generate dues now
        </AppButton>
      </div>
      <p v-if="duesMsg" class="note">{{ duesMsg }}</p>
      <p v-if="duesError" class="error">{{ duesError }}</p>
    </AppCard>

    <Teleport to="body">
      <div v-if="editing" class="modal-backdrop" @click.self="editing = null">
        <div class="modal" role="dialog" aria-modal="true">
          <h3 class="modal__title">Edit fee</h3>
          <p class="modal__sub">{{ editing.classLabel }} · {{ editing.department || 'Common' }} · {{ editing.name }}</p>
          <label>Fee name
            <input v-model="editing.name" type="text" class="app-input__control" />
          </label>
          <label>Amount (৳)
            <input v-model.number="editing.amount" type="number" min="0" class="app-input__control" />
          </label>
          <label>Repeat every N days (0 = one-time)
            <input v-model.number="editing.cycleDays" type="number" min="0" class="app-input__control" placeholder="e.g. 30 for monthly" />
          </label>
          <p v-if="priceError" class="error">{{ priceError }}</p>
          <div class="modal__actions">
            <AppButton variant="ghost" type="button" @click="editing = null">Cancel</AppButton>
            <AppButton type="button" :loading="savingPrice" @click="savePrice">
              Save
            </AppButton>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="quickOpen" class="modal-backdrop" @click.self="quickOpen = false">
        <div class="modal" role="dialog" aria-modal="true">
          <h3 class="modal__title">Single Fee Add</h3>
          <p class="modal__sub">Only one fee — no need to open the full form.</p>
          <label>Class
            <select v-model="quick.classId" class="app-input__control">
              <option value="">Select class</option>
              <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
          </label>
          <label v-if="quickClass?.hasDepartments">Department
            <select v-model="quick.departmentId" class="app-input__control">
              <option :value="null">Common</option>
              <option v-for="d in quickDepartments" :key="d.id" :value="d.id">{{ d.label }}</option>
            </select>
          </label>
          <label>Fee name
            <input v-model="quick.name" class="app-input__control" placeholder="e.g. মাসিক বেতন" />
          </label>
          <label>Repeat every N days (0 = one-time)
            <input v-model.number="quick.cycleDays" type="number" min="0" class="app-input__control" placeholder="30 = monthly" />
          </label>
          <label>Amount (৳)
            <input
              v-model.number="quick.amount"
              type="number"
              min="0"
              class="app-input__control"
              @input="quickTouched = true"
            />
          </label>
          <p v-if="quickExisting > 0" class="note">Already set at ৳{{ quickExisting }} — saving will update it.</p>
          <p v-if="quickError" class="error">{{ quickError }}</p>
          <div class="modal__actions">
            <AppButton variant="ghost" type="button" @click="quickOpen = false">Cancel</AppButton>
            <AppButton type="button" :disabled="!quick.classId || !quick.name.trim()" :loading="savingQuick" @click="saveQuick">
              Save fee
            </AppButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import {
  useClasses,
  useDepartments,
  useFeeCatalog,
  useFeeCatalogOverview,
  useGenerateDues,
  useSaveFeeCatalog,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { useClientSort, usePagedList } from '@/composables/usePagedList'
import type { FeeCatalogItem } from '@/types/models'

const router = useRouter()
const toast = useToast()

const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])

function cycleLabel(days: number): string {
  if (!days || days <= 0) return 'One-time'
  if (days === 30) return 'Monthly'
  if (days === 365) return 'Yearly'
  return `Every ${days} days`
}

// ---------- saved catalog overview ----------
const { data: ovData, isLoading: ovLoading } = useFeeCatalogOverview()
const overviewRows = computed(() => ovData.value?.data ?? [])
const configuredClasses = computed(() => new Set(overviewRows.value.map((r) => r.classId)).size)

const ovSearch = ref('')
const ovClassId = ref('')
const { page: ovPage, perPage: ovPerPage } = usePagedList(10)
const ovSort = useClientSort<'class' | 'amount'>()
watch([ovSearch, ovClassId], () => {
  ovPage.value = 1
})
function resetOverview(): void {
  ovSearch.value = ''
  ovClassId.value = ''
}
const filteredOverview = computed(() => {
  const q = ovSearch.value.trim().toLowerCase()
  return overviewRows.value.filter((r) => {
    if (ovClassId.value && r.classId !== ovClassId.value) return false
    if (!q) return true
    return (
      r.classLabel.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      String(r.amount).includes(q)
    )
  })
})
const sortedOverview = computed(() =>
  ovSort.apply(filteredOverview.value, (r) =>
    ovSort.key.value === 'amount' ? Number(r.amount) || 0 : r.classLabel,
  ),
)
const pagedOverview = computed(() => {
  const start = (ovPage.value - 1) * ovPerPage.value
  return sortedOverview.value.slice(start, start + ovPerPage.value)
})

// Single-fee edit modal (overview Edit → only that fee, not all).
const editing = ref<{
  id: string
  classId: string
  classLabel: string
  departmentId: string | null
  department: string
  name: string
  amount: number
  cycleDays: number
} | null>(null)
const priceError = ref('')
const savingPrice = ref(false)

function openPriceEdit(row: FeeCatalogItem): void {
  priceError.value = ''
  editing.value = {
    id: row.id,
    classId: row.classId,
    classLabel: row.classLabel,
    departmentId: row.departmentId,
    department: row.department,
    name: row.name,
    amount: Number(row.amount) || 0,
    cycleDays: Number(row.cycleDays) || 0,
  }
}

async function savePrice(): Promise<void> {
  const m = editing.value
  if (!m) return
  if (!m.name.trim()) {
    priceError.value = 'Fee name is required.'
    return
  }
  priceError.value = ''
  savingPrice.value = true
  try {
    await saveFeeCatalog({
      classId: m.classId,
      departmentId: m.departmentId,
      fees: [{ id: m.id, name: m.name.trim(), amount: Number(m.amount) || 0, cycleDays: Number(m.cycleDays) || 0 }],
    })
    toast.success(`${m.name} saved`)
    editing.value = null
  } catch (e) {
    priceError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    savingPrice.value = false
  }
}

// ---------- quick add one fee (modal — few inputs) ----------
const quickOpen = ref(false)

function goSetup(): void {
  const query: Record<string, string> = {}
  if (ovClassId.value) query.classId = ovClassId.value
  router.push({ path: '/admin/fees/structure/setup', query })
}

const quick = reactive({
  classId: '',
  departmentId: null as string | null,
  name: '',
  amount: 0,
  cycleDays: 0,
})
const quickClass = computed(() => classes.value.find((c) => c.id === quick.classId))
const { data: quickDeptData } = useDepartments(() => quick.classId || undefined)
const quickDepartments = computed(() => quickDeptData.value?.data ?? [])
watch(() => quick.classId, () => {
  quick.departmentId = null
})

// If this class already has this fee name, show it + a short note.
// Manual typing wins — auto-fill only runs until the user touches the box.
const { data: quickCatalogData } = useFeeCatalog(() => quick.classId, () => quick.departmentId)
const quickExisting = computed(() => {
  if (!quick.name.trim()) return 0
  const row = (quickCatalogData.value?.data ?? []).find(
    (r) => r.name.trim().toLowerCase() === quick.name.trim().toLowerCase(),
  )
  return row ? Number(row.amount) || 0 : 0
})
const quickTouched = ref(false)
watch([() => quick.classId, () => quick.departmentId, () => quick.name], () => {
  quickTouched.value = false
})
watch(quickExisting, (stored) => {
  if (!quickTouched.value && quick.name.trim()) quick.amount = stored
})
const quickError = ref('')
const savingQuick = ref(false)

async function saveQuick(): Promise<void> {
  quickError.value = ''
  if (!quick.classId || !quick.name.trim()) {
    quickError.value = 'Select a class and write a fee name.'
    return
  }
  savingQuick.value = true
  try {
    await saveFeeCatalog({
      classId: quick.classId,
      departmentId: quick.departmentId,
      fees: [{ name: quick.name.trim(), amount: Number(quick.amount) || 0, cycleDays: Number(quick.cycleDays) || 0 }],
    })
    toast.success(`${quick.name.trim()} saved`)
    quick.name = ''
    quick.amount = 0
    quick.cycleDays = 0
    quickOpen.value = false
  } catch (e) {
    quickError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    savingQuick.value = false
  }
}

// ---------- per-class editor lives on its child page now ----------
// (/admin/fees/structure/setup) — this page keeps overview + quick modals.
const { mutateAsync: saveFeeCatalog } = useSaveFeeCatalog()

// ---------- manual dues generation ----------
const { mutateAsync: generateDues, isPending: generatingDues } = useGenerateDues()
const duesMsg = ref('')
const duesError = ref('')

async function runGenerateDues(): Promise<void> {
  duesMsg.value = ''
  duesError.value = ''
  try {
    const res = await generateDues({ classId: ovClassId.value || undefined })
    duesMsg.value = `${res.data.created} dues generated for ${res.data.students} students.`
    toast.success('Dues generated')
  } catch (e) {
    duesError.value = e instanceof Error ? e.message : 'Failed'
  }
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-xs);
}
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
}
.page__hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.chips {
  display: flex;
  gap: var(--spacing-sm);
}
.mode-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}
.chip {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  font-size: var(--font-size-xs);
}
.badge {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  background: var(--color-primary-light);
}
.badge--dept {
  background: var(--color-warning-light, var(--color-primary-light));
}
.badge--common {
  background: var(--color-primary-light);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.table th,
.table td {
  text-align: left;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}
.row-actions {
  text-align: right;
}
.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.sort-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.sort-btn:hover {
  color: var(--color-primary);
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(16, 24, 40, 0.45);
  display: grid;
  place-items: center;
  z-index: 60;
  padding: var(--spacing-lg);
}
.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-lg);
  width: min(400px, 100%);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.modal__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.modal__sub {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
.modal label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.note {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  margin: 0;
}
</style>
