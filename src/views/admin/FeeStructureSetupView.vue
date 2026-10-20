<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Full Fee Setup</h1>
        <p class="page__hint">Pick a class, then optionally a department or section. A section fee overrides the same fee name for that section; monthly-type fees repeat on their cycle. For a one-time charge on students already admitted (exam, tour), use <RouterLink to="/admin/fees/extra">Extra Fee</RouterLink>.</p>
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
        <label v-if="struct.classId && structSections.length">Section
          <select v-model="struct.sectionId" class="app-input__control">
            <option :value="null">All sections (common)</option>
            <option v-for="s in structSections" :key="s.id" :value="s.id">{{ s.label }}</option>
          </select>
        </label>
      </div>
      <p v-if="!struct.classId" class="muted">Pick a class to set its fees.</p>
      <template v-else>
        <div v-if="saveErrors.length" ref="errorBox" class="form-errors" role="alert">
          <strong>Could not save fees</strong>
          <ul>
            <li v-for="(message, index) in saveErrors" :key="index">{{ message }}</li>
          </ul>
        </div>
        <AppSkeleton v-if="structLoading" variant="table" :rows="8" :cols="4" />
        <table v-else class="table">
          <thead>
            <tr><th>Fee name</th><th>Amount (৳)</th><th>Cycle</th><th></th></tr>
          </thead>
          <tbody>
            <template v-for="group in inheritedGroups" :key="group.key">
              <tr class="row--group row--sub"><td colspan="4">{{ group.label }} — inherited (read-only)</td></tr>
              <tr v-for="row in group.rows" :key="group.key + '-' + row.id">
                <td>{{ row.name }}</td><td>৳{{ row.amount }}</td><td class="muted">{{ cycleLabel(row.cycleDays) }}</td><td></td>
              </tr>
            </template>
            <tr v-if="scopeActive" class="row--group"><td colspan="4">{{ editableScopeLabel }} — editable</td></tr>
            <tr v-if="scopeActive && catalogRows.length === 0">
              <td colspan="4" class="muted">No extra fees for this scope — it uses the inherited fees above. Add below only if this scope charges extra or needs a different amount.</td>
            </tr>
            <tr v-for="row in catalogRows" :key="row.id || row.name" :class="{ 'row--dirty': isDirty(row) }">
              <td>
                <input v-model="row.name" class="app-input__control" placeholder="e.g. Monthly Fee" :disabled="!!row.id" />
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
              <td>{{ scopeActive ? 'Scope total' : 'Total' }}</td>
              <td>৳{{ catalogSum }}</td>
              <td class="muted">{{ scopeActive ? 'editable rows only' : 'one-time + first cycle' }}</td>
              <td></td>
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
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import {
  useClasses,
  useDepartments,
  useFeeCatalog,
  useSaveFeeCatalog,
  useSections,
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
  sectionId: (route.query.sectionId ? String(route.query.sectionId) : null) as string | null,
})
const structClass = computed(() => classes.value.find((c) => c.id === struct.classId))
const { data: structDeptData } = useDepartments(() => struct.classId || undefined)
const structDepartments = computed(() => structDeptData.value?.data ?? [])
const { data: structSectionData } = useSections(() => struct.classId || undefined, undefined, true)
const structSections = computed(() =>
  (structSectionData.value?.data ?? []).filter((s) => s.classId === struct.classId),
)
watch(() => struct.classId, () => {
  struct.departmentId = null
  struct.sectionId = null
  clearSaveErrors()
})
watch([() => struct.departmentId, () => struct.sectionId], clearSaveErrors)

const scopeActive = computed(() => !!struct.departmentId || !!struct.sectionId)
const bothScope = computed(() => !!struct.departmentId && !!struct.sectionId)

const { data: structData, isLoading: structLoading } = useFeeCatalog(
  () => struct.classId,
  () => struct.departmentId,
  () => struct.sectionId,
)
// Inherited rows are the less-specific scopes shown read-only above the
// exact-scope editable rows. A section overrides a department, which
// overrides class-common, for the same fee name.
const { data: commonData } = useFeeCatalog(
  () => (scopeActive.value ? struct.classId : ''),
  () => null,
  () => null,
)
const { data: deptInheritedData } = useFeeCatalog(
  () => (bothScope.value ? struct.classId : ''),
  () => struct.departmentId,
  () => null,
)
const { data: sectionInheritedData } = useFeeCatalog(
  () => (bothScope.value ? struct.classId : ''),
  () => null,
  () => struct.sectionId,
)
const deptName = computed(() =>
  structDepartments.value.find((d) => d.id === struct.departmentId)?.label ?? '',
)
const sectionName = computed(() =>
  structSections.value.find((s) => s.id === struct.sectionId)?.label ?? '',
)
const editableScopeLabel = computed(() => {
  if (bothScope.value) return `${deptName.value} + ${sectionName.value} only`
  if (struct.departmentId) return `${deptName.value} only`
  if (struct.sectionId) return `${sectionName.value} only`
  return 'Class fees'
})

interface EditableRow {
  id: string
  name: string
  amount: number
  cycleDays: number
}
interface InheritedGroup {
  key: string
  label: string
  rows: FeeCatalogItem[]
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
// Effective inherited rows after scope precedence and exact-scope
// overrides. Grouped by the scope that supplied the winning row so the
// read-only block says where each amount comes from.
const inheritedGroups = computed<InheritedGroup[]>(() => {
  if (!scopeActive.value) return []
  const byName = new Map<string, { row: FeeCatalogItem; source: string }>()
  const add = (rows: FeeCatalogItem[], source: string) => {
    for (const row of rows) {
      if (!row.isActive) continue
      byName.set(row.name.trim().toLowerCase(), { row, source })
    }
  }
  add((commonData.value?.data ?? []) as FeeCatalogItem[], 'class')
  if (bothScope.value) {
    add((deptInheritedData.value?.data ?? []) as FeeCatalogItem[], 'department')
    add((sectionInheritedData.value?.data ?? []) as FeeCatalogItem[], 'section')
  }
  const editableNames = new Set(catalogRows.value.map((r) => r.name.trim().toLowerCase()))
  const effective = [...byName.values()].filter(
    ({ row }) => !editableNames.has(row.name.trim().toLowerCase()),
  )
  const classRows = effective.filter((r) => r.source === 'class').map((r) => r.row)
  const deptRows = effective.filter((r) => r.source === 'department').map((r) => r.row)
  const sectionRows = effective.filter((r) => r.source === 'section').map((r) => r.row)
  const groups: InheritedGroup[] = []
  if (classRows.length) groups.push({ key: 'class', label: 'Class common', rows: classRows })
  if (deptRows.length) groups.push({ key: 'department', label: deptName.value, rows: deptRows })
  if (sectionRows.length) groups.push({ key: 'section', label: sectionName.value, rows: sectionRows })
  return groups
})
const { mutateAsync: saveFeeCatalog } = useSaveFeeCatalog()
const savingRow = ref('')
const savingAll = ref(false)
const saveErrors = ref<string[]>([])
const errorBox = ref<HTMLElement | null>(null)

function clearSaveErrors(): void {
  saveErrors.value = []
}

function validateFee(name: string, amount: number | string, cycleDays: number | string): string | null {
  const feeName = name.trim()
  if (!feeName) return 'Every fee row needs a name.'
  const numericAmount = Number(amount)
  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    return `"${feeName}": amount must be 0 or greater.`
  }
  const numericCycle = Number(cycleDays)
  if (!Number.isInteger(numericCycle) || numericCycle < 0) {
    return `"${feeName}": cycle must be a whole number of days (0 = one-time).`
  }
  return null
}

function errorMessages(e: unknown): string[] {
  const response = (e as {
    response?: { data?: { message?: string; errors?: { fees?: unknown } } }
  }).response
  const fees = response?.data?.errors?.fees
  if (Array.isArray(fees) && fees.length && fees.every((item) => typeof item === 'string')) {
    return fees as string[]
  }
  if (response?.data?.message) return [response.data.message]
  return [e instanceof Error ? e.message : 'Save failed']
}

function showSaveErrors(messages: string[]): void {
  saveErrors.value = messages
  const first = messages[0]
  toast.error(
    messages.length === 1 && first
      ? first
      : `${messages.length} fee row(s) need attention. See the error list above.`,
  )
  void nextTick(() => {
    errorBox.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

async function saveRow(row: EditableRow): Promise<void> {
  clearSaveErrors()
  if (!struct.classId || !isDirty(row)) return
  const validation = validateFee(row.name, row.amount, row.cycleDays)
  if (validation) {
    showSaveErrors([validation])
    return
  }
  savingRow.value = rowKey(row)
  try {
    await saveFeeCatalog({
      classId: struct.classId,
      departmentId: struct.departmentId,
      sectionId: struct.sectionId,
      fees: [{ id: row.id || undefined, name: row.name.trim(), amount: Number(row.amount) || 0, cycleDays: Number(row.cycleDays) || 0 }],
    })
    toast.success(`${row.name.trim()} saved`)
  } catch (e) {
    showSaveErrors(errorMessages(e))
  } finally {
    savingRow.value = ''
  }
}

async function saveAll(): Promise<void> {
  clearSaveErrors()
  if (!struct.classId || !structDirty.value) return
  const dirty = catalogRows.value.filter(isDirty)
  const validationErrors = dirty
    .map((row) => validateFee(row.name, row.amount, row.cycleDays))
    .filter((message): message is string => message !== null)
  if (validationErrors.length) {
    showSaveErrors(validationErrors)
    return
  }
  savingAll.value = true
  try {
    await saveFeeCatalog({
      classId: struct.classId,
      departmentId: struct.departmentId,
      sectionId: struct.sectionId,
      fees: dirty.map((r) => ({ id: r.id || undefined, name: r.name.trim(), amount: Number(r.amount) || 0, cycleDays: Number(r.cycleDays) || 0 })),
    })
    toast.success(`${dirty.length} ${dirty.length === 1 ? 'fee' : 'fees'} saved`)
  } catch (e) {
    showSaveErrors(errorMessages(e))
  } finally {
    savingAll.value = false
  }
}

const newName = ref('')
const newAmount = ref(0)
const newCycle = ref(0)
const addingRow = ref(false)
async function addRow(): Promise<void> {
  clearSaveErrors()
  const name = newName.value.trim()
  if (!name || !struct.classId || addingRow.value) return
  if (catalogRows.value.some((r) => r.name.trim().toLowerCase() === name.toLowerCase())) {
    showSaveErrors([`"${name}" already exists — edit its row instead.`])
    return
  }
  const validation = validateFee(name, newAmount.value, newCycle.value)
  if (validation) {
    showSaveErrors([validation])
    return
  }
  addingRow.value = true
  try {
    await saveFeeCatalog({
      classId: struct.classId,
      departmentId: struct.departmentId,
      sectionId: struct.sectionId,
      fees: [{ name, amount: Number(newAmount.value) || 0, cycleDays: Number(newCycle.value) || 0 }],
    })
    toast.success(`"${name}" saved`)
    newName.value = ''
    newAmount.value = 0
    newCycle.value = 0
  } catch (e) {
    showSaveErrors(errorMessages(e))
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
.page__hint a {
  color: var(--color-primary);
}
.form-errors {
  scroll-margin-top: calc(var(--topbar-height) + var(--spacing-md));
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  background: var(--color-danger-light);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.form-errors ul {
  margin: var(--spacing-xs) 0 0;
  padding-left: var(--spacing-lg);
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
.row--group.row--sub td {
  padding-top: var(--spacing-md);
  padding-bottom: var(--spacing-xs);
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
