<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Full Fee Setup</h1>
        <p class="page__hint">Pick a class to name its fees together. Monthly-type fees repeat on their cycle.</p>
      </div>
      <AppButton variant="ghost" type="button" @click="goBack">← Fee Management</AppButton>
    </div>

    <AppCard>
      <div class="form">
        <label>Class
          <select v-model="struct.classId" class="app-input__control">
            <option value="">Select class</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
        </label>
        <label v-if="structClass?.hasDepartments">Department
          <select v-model="struct.departmentId" class="app-input__control">
            <option :value="null">All departments (common)</option>
            <option v-for="d in structDepartments" :key="d.id" :value="d.id">{{ d.label }}</option>
          </select>
        </label>
      </div>
      <p v-if="!struct.classId" class="muted">Pick a class to set its fees.</p>
      <template v-else>
        <AppSkeleton v-if="structLoading" variant="table" :rows="8" :cols="4" />
        <table v-else class="table">
          <thead>
            <tr><th>Fee name</th><th>Amount (৳)</th><th>Cycle</th><th></th></tr>
          </thead>
          <tbody>
            <template v-if="struct.departmentId">
              <tr class="row--group"><td colspan="4">Common — inherited by every department (read-only here)</td></tr>
              <tr v-for="row in commonRows" :key="'c-' + row.id">
                <td>{{ row.name }}</td><td>৳{{ row.amount }}</td><td class="muted">{{ cycleLabel(row.cycleDays) }}</td><td></td>
              </tr>
              <tr class="row--group"><td colspan="4">{{ deptName }} only — editable</td></tr>
            </template>
            <tr v-if="struct.departmentId && catalogRows.length === 0">
              <td colspan="4" class="muted">No extra fees for this department — it uses the common fees above. Add below only if this department charges extra (e.g. lab).</td>
            </tr>
            <tr v-for="row in catalogRows" :key="row.id || row.name" :class="{ 'row--dirty': isDirty(row) }">
              <td>
                <input v-model="row.name" class="app-input__control" placeholder="e.g. মাসিক বেতন" :disabled="!!row.id" />
              </td>
              <td><input v-model.number="row.amount" type="number" min="0" class="app-input__control amount" /></td>
              <td><input v-model.number="row.cycleDays" type="number" min="0" class="app-input__control amount" title="0 = one-time, 30 = monthly" /></td>
              <td class="row-actions">
                <AppButton
                  variant="ghost"
                  :disabled="!isDirty(row)"
                  :loading="savingRow === rowKey(row)"
                  @click="saveRow(row)"
                >
                  Save
                </AppButton>
              </td>
            </tr>
            <tr class="row--total">
              <td>Total</td><td>৳{{ catalogSum }}</td><td class="muted">one-time + first cycle</td><td></td>
            </tr>
          </tbody>
        </table>
        <form class="inline-form" @submit.prevent="addRow">
          <input v-model="newName" class="app-input__control" placeholder="New fee name…" />
          <input v-model.number="newAmount" type="number" min="0" class="app-input__control amount" placeholder="৳" />
          <input v-model.number="newCycle" type="number" min="0" class="app-input__control amount" placeholder="days (30)" title="0 = one-time, 30 = monthly" />
          <AppButton type="submit" :disabled="!newName.trim()" :loading="addingRow">Add</AppButton>
        </form>
        <div class="form-actions">
          <AppButton :disabled="!structDirty" :loading="savingAll" @click="saveAll">
            All Save
          </AppButton>
        </div>
      </template>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import {
  useClasses,
  useDepartments,
  useFeeCatalog,
  useSaveFeeCatalog,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import type { FeeCatalogItem } from '@/types/models'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])

function cycleLabel(days: number): string {
  if (!days || days <= 0) return 'One-time'
  if (days === 30) return 'Monthly'
  if (days === 365) return 'Yearly'
  return `Every ${days}d`
}

const struct = reactive({
  classId: String(route.query.classId ?? ''),
  departmentId: (route.query.departmentId ? String(route.query.departmentId) : null) as string | null,
})
const structClass = computed(() => classes.value.find((c) => c.id === struct.classId))
const { data: structDeptData } = useDepartments(() => struct.classId || undefined)
const structDepartments = computed(() => structDeptData.value?.data ?? [])
watch(() => struct.classId, () => {
  struct.departmentId = null
})

const { data: structData, isLoading: structLoading } = useFeeCatalog(
  () => struct.classId,
  () => struct.departmentId,
)
// Inherited common rows, shown read-only above the dept-specific editable rows.
const { data: commonData } = useFeeCatalog(
  () => (struct.departmentId ? struct.classId : ''),
  () => null,
)
const commonRows = computed(() => (commonData.value?.data ?? []).filter((r) => r.isActive))
const deptName = computed(() =>
  structDepartments.value.find((d) => d.id === struct.departmentId)?.label ?? '',
)

interface EditableRow {
  id: string
  name: string
  amount: number
  cycleDays: number
}
const catalogRows = ref<EditableRow[]>([])
const pristine = ref<Record<string, string>>({})
function rowKey(row: EditableRow): string {
  return row.id || `new:${row.name}`
}
watch(structData, (res) => {
  const rows = ((res?.data ?? []) as FeeCatalogItem[])
    .filter((r) => r.isActive)
    .map((r) => ({ id: r.id, name: r.name, amount: Number(r.amount) || 0, cycleDays: Number(r.cycleDays) || 0 }))
  catalogRows.value = rows
  pristine.value = Object.fromEntries(
    rows.map((r) => [rowKey(r), JSON.stringify([r.name, r.amount, r.cycleDays])]),
  )
})
function isDirty(row: EditableRow): boolean {
  if (!row.id) return !!row.name.trim()
  return pristine.value[rowKey(row)] !== JSON.stringify([row.name, Number(row.amount) || 0, Number(row.cycleDays) || 0])
}
const structDirty = computed(() => catalogRows.value.some(isDirty))
const catalogSum = computed(() =>
  catalogRows.value.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
)
const { mutateAsync: saveFeeCatalog } = useSaveFeeCatalog()
const savingRow = ref('')
const savingAll = ref(false)

async function saveRow(row: EditableRow): Promise<void> {
  if (!struct.classId || !isDirty(row) || !row.name.trim()) return
  savingRow.value = rowKey(row)
  try {
    await saveFeeCatalog({
      classId: struct.classId,
      departmentId: struct.departmentId,
      fees: [{ id: row.id || undefined, name: row.name.trim(), amount: Number(row.amount) || 0, cycleDays: Number(row.cycleDays) || 0 }],
    })
    toast.success(`${row.name.trim()} saved`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Save failed')
  } finally {
    savingRow.value = ''
  }
}

async function saveAll(): Promise<void> {
  if (!struct.classId || !structDirty.value) return
  savingAll.value = true
  try {
    const dirty = catalogRows.value.filter(isDirty).filter((r) => r.name.trim())
    await saveFeeCatalog({
      classId: struct.classId,
      departmentId: struct.departmentId,
      fees: dirty.map((r) => ({ id: r.id || undefined, name: r.name.trim(), amount: Number(r.amount) || 0, cycleDays: Number(r.cycleDays) || 0 })),
    })
    toast.success(`${dirty.length} fees saved`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Save failed')
  } finally {
    savingAll.value = false
  }
}

const newName = ref('')
const newAmount = ref(0)
const newCycle = ref(0)
const addingRow = ref(false)
async function addRow(): Promise<void> {
  const name = newName.value.trim()
  if (!name || !struct.classId || addingRow.value) return
  if (catalogRows.value.some((r) => r.name.trim().toLowerCase() === name.toLowerCase())) {
    toast.error(`"${name}" already exists — edit its row instead.`)
    return
  }
  addingRow.value = true
  try {
    await saveFeeCatalog({
      classId: struct.classId,
      departmentId: struct.departmentId,
      fees: [{ name, amount: Number(newAmount.value) || 0, cycleDays: Number(newCycle.value) || 0 }],
    })
    toast.success(`"${name}" saved`)
    newName.value = ''
    newAmount.value = 0
    newCycle.value = 0
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Save failed')
  } finally {
    addingRow.value = false
  }
}

function goBack(): void {
  router.push('/admin/fees')
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-xs);
}
.page__hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}
.form label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  max-width: 320px;
}
.form-actions {
  margin-top: var(--spacing-sm);
  display: flex;
  justify-content: flex-end;
}
.amount {
  max-width: 140px;
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
.row--dirty td:first-child {
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}
.row--total td {
  font-weight: var(--font-weight-bold);
}
.row--group td {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-muted);
  text-transform: uppercase;
}
.inline-form {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  align-items: center;
  flex-wrap: wrap;
}
.inline-form .app-input__control {
  flex: 1;
  min-width: 140px;
}
</style>
