<template>
  <div class="page">
    <h1 class="page__title">Collect Fee</h1>

    <div class="collect-grid">
    <AppCard class="collect-form">
      <form class="form" @submit.prevent="collect">
        <div class="picker">
          <label>Student
            <input
              v-model="studentQuery"
              type="search"
              class="app-input__control"
              placeholder="Search by name, roll, or card…"
              autocomplete="off"
              @input="onStudentQueryInput"
              @focus="studentOpen = studentQuery.trim().length > 0"
              @blur="closePickerSoon"
            />
          </label>
          <ul v-if="studentOpen" class="picker__menu" role="listbox">
            <li v-if="filteredStudents.length === 0" class="picker__empty">No students match your search.</li>
            <li v-for="s in filteredStudents.slice(0, 20)" :key="s.id" role="option">
              <button type="button" class="picker__item" @mousedown.prevent="selectStudent(s)">
                <span>{{ s.name }}</span>
                <span class="picker__meta">Roll {{ s.roll }} · Due ৳{{ s.dueAmount }}</span>
              </button>
            </li>
          </ul>
          <p v-if="studentError" class="error">{{ studentError }}</p>
        </div>
        <div v-if="pickedStudent" class="due-card">
          <span>Total ৳{{ pickedStudent.totalAmount }}</span>
          <span>Paid ৳{{ pickedStudent.paidAmount }}</span>
          <span class="due-card__due">Due ৳{{ pickedStudent.dueAmount }}</span>
        </div>
        <div v-if="isMultiHead" class="head-table">
          <div class="head-table__row head-table__row--head">
            <span>Fee name</span><span>Due</span><span>Paid</span><span>Pay now</span>
          </div>
          <div v-for="r in headRowsVisible" :key="r.key" class="head-table__row">
            <span>{{ r.name }}<em v-if="r.dueFor" class="duefor"> · {{ r.dueFor.slice(0, 7) }}</em></span>
            <span class="due-card__due">৳{{ r.due }}</span>
            <span class="muted">৳{{ r.paid }}</span>
            <span><input
              v-model.number="headInputs[r.key]"
              type="number"
              min="0"
              :max="r.due"
              class="app-input__control head-table__input"
            /></span>
          </div>
          <p v-if="!headRowsVisible.length" class="muted head-table__empty">All fees clear — nothing due.</p>
        </div>
        <template v-else>
          <div v-if="singleDue" class="single-due">
            <span class="single-due__label">Due fee</span>
            <span class="single-due__name">{{ singleDue.name }}<em v-if="singleDue.dueFor" class="duefor"> · {{ singleDue.dueFor.slice(0, 7) }}</em></span>
            <span class="single-due__amount">৳{{ singleDue.due }}</span>
          </div>
          <label>Fee name
            <select v-model="form.feeType" class="app-input__control" :disabled="!!singleDue">
              <option v-for="n in feeNameOptions" :key="n" :value="n">{{ n }}</option>
            </select>
          </label>
          <label>Amount (৳)<input v-model.number="form.amount" type="number" min="0" class="app-input__control" required /></label>
          <p v-if="allHeadsClear" class="muted">All fees clear — nothing due.</p>
        </template>
        <label v-if="isMultiHead">Amount (৳)<input :value="multiTotal" type="number" class="app-input__control" readonly /></label>
        <label>Method
          <select v-model="form.paymentMethod" class="app-input__control">
            <option v-for="m in methodOptions" :key="m.id" :value="m.value">{{ m.label }}</option>
          </select>
        </label>
        <label>Date<input v-model="form.paymentDate" type="date" class="app-input__control" required /></label>
        <label>Collector<input v-model="form.collectorName" class="app-input__control" /></label>
        <label>Notes<input v-model="form.notes" class="app-input__control" placeholder="optional" /></label>
        <p class="muted">Due after this collection: ৳{{ previewDue }}</p>
        <p v-if="formError" class="error">{{ formError }}</p>
        <AppButton type="submit" :disabled="collecting">{{ collecting ? 'Collecting…' : 'Collect' }}</AppButton>
      </form>
    </AppCard>

    <AppCard v-if="pickedStudent" title="Payment history" class="collect-history">
      <p class="muted">{{ pickedStudent.name }}<span v-if="pickedStudent.roll"> · Roll {{ pickedStudent.roll }}</span></p>
      <p v-if="histLoading" class="muted">Loading…</p>
      <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr><th>Date</th><th>Receipt</th><th>Type</th><th>Amount</th><th>Paid</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in histPaged" :key="p.id">
            <td>{{ p.paymentDate }}</td>
            <td>{{ p.receiptNumber }}</td>
            <td><span :title="histTypeTitle(p)">{{ histTypeLabel(p) }}</span></td>
            <td>৳{{ p.amount }}</td>
            <td>৳{{ p.paid }}</td>
            <td>{{ p.status }}</td>
          </tr>
          <tr v-if="histPaged.length === 0">
            <td colspan="6" class="muted">No payments recorded for this student yet.</td>
          </tr>
        </tbody>
      </table>
      </div>
      <AppPagination v-model:page="histPage" v-model:per-page="histPerPage" :total="histRows.length" />
    </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import {
  useCollectPayment,
  useFeeCatalog,
  usePaymentMethods,
  useStudent,
  useStudentPayments,
  useStudents,
} from '@/composables/useQueries'
import { usePagedList } from '@/composables/usePagedList'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { receiptTypeLabel, receiptTypeTitle } from '@/utils/paymentLabels'
import type { Payment, Student } from '@/types/models'

const toast = useToast()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const today = (): string => new Date().toISOString().slice(0, 10)

const { data: studentData } = useStudents({ perPage: 500 })
const allStudents = computed(() => studentData.value?.data.items ?? [])

const { data: methodData } = usePaymentMethods()
const methodOptions = computed(() => methodData.value?.data ?? [{ id: 'cash', label: 'Cash', value: 'cash' }])

const form = reactive({
  studentId: '',
  feeType: '',
  amount: 0,
  paymentMethod: 'cash',
  paymentDate: today(),
  collectorName: auth.user?.email ?? 'Admin',
  notes: '',
})
watch(methodOptions, (opts) => {
  if (!opts.some((m) => m.value === form.paymentMethod) && opts.length) {
    form.paymentMethod = opts[0]?.value ?? 'cash'
  }
})
const pickedStudent = computed(() => allStudents.value.find((s) => s.id === form.studentId))

// Fee names under the picked student's class (collection dropdown source).
const { data: pickedCatalogData } = useFeeCatalog(
  () => pickedStudent.value?.classId ?? '',
  () => pickedStudent.value?.departmentId ?? null,
  true,
)
const catalogNames = computed(() =>
  ((pickedCatalogData.value?.data ?? []) as { name: string; isActive: boolean }[])
    .filter((r) => r.isActive)
    .map((r) => r.name),
)
const feeNameOptions = computed(() => {
  const dues = headRows.value.map((r) => r.name)
  const names = [...dues]
  for (const n of catalogNames.value) if (!names.includes(n)) names.push(n)
  if (form.feeType && !names.includes(form.feeType)) names.push(form.feeType)
  return names.length ? names : ['Monthly']
})
watch(catalogNames, (names) => {
  if (!form.feeType && names.length) form.feeType = names[0] ?? ''
})

// Search picker (coaching record-payment pattern): type to filter, pick one.
// Typing clears the pick; mousedown on an option wins over input blur.
const studentQuery = ref('')
const studentOpen = ref(false)
const studentError = ref('')
let pickerBlurTimer: ReturnType<typeof setTimeout> | null = null

const filteredStudents = computed(() => {
  const q = studentQuery.value.trim().toLowerCase()
  if (!q) return []
  return allStudents.value.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      String(s.roll ?? '').toLowerCase().includes(q) ||
      (s.cardId ?? '').toLowerCase().includes(q),
  )
})

function studentLabel(s: Student): string {
  return `${s.name}${s.roll ? ` — Roll ${s.roll}` : ''}`
}

function selectStudent(s: Student): void {
  form.studentId = s.id
  studentQuery.value = studentLabel(s)
  studentError.value = ''
  studentOpen.value = false
}

function onStudentQueryInput(): void {
  form.studentId = ''
  studentOpen.value = studentQuery.value.trim().length > 0
}

function closePickerSoon(): void {
  if (pickerBlurTimer) clearTimeout(pickerBlurTimer)
  pickerBlurTimer = setTimeout(() => {
    studentOpen.value = false
  }, 150)
}

// Deep link from the Dues page (?studentId=…) — resolved further below,
// once the dues rows exist, so a query change on a reused page also works.
const wantedId = computed(() => String(route.query.studentId ?? ''))

// Amount defaults are applied after history loads (see applyHeadDefault).
const lastPickedId = ref('')
const appliedHeadFor = ref('')

const formError = ref('')
const { mutateAsync: collectPayment, isPending: collecting } = useCollectPayment()

// Payment history under the form (coaching pattern) — new student, page 1.
const { data: histData, isLoading: histLoading } = useStudentPayments(() => form.studentId)
const histRows = computed(() => histData.value?.data ?? [])
const { page: histPage, perPage: histPerPage } = usePagedList(10)
watch(() => form.studentId, () => {
  histPage.value = 1
})
const histPaged = computed(() => {
  const start = (histPage.value - 1) * histPerPage.value
  return histRows.value.slice(start, start + histPerPage.value)
})

function headLabel(name: string): string {
  return name
}
function histTypeLabel(p: Payment): string {
  return receiptTypeLabel(p, headLabel)
}
function histTypeTitle(p: Payment): string {
  return receiptTypeTitle(p, headLabel)
}

interface DueRow {
  key: string
  name: string
  dueFor: string
  charge: number
  paid: number
  due: number
  feeItemId: string
}

// Name-wise dues: per-cycle rows (feeDues) minus receipts matched by
// (name, dueFor). Old receipts without dueFor fall onto the oldest unpaid
// row with the same name (FIFO). Empty snapshot = legacy student →
// fall back to the whole-due behaviour.
const headRows = computed((): DueRow[] => {
  const dues = (pickedStudent.value?.feeDues ?? []) as {
    name: string
    amount: number
    dueFor?: string
    feeItemId?: string
  }[]
  const base: DueRow[] =
    dues.length > 0
      ? dues
          .filter((d) => d.name && (Number(d.amount) || 0) > 0)
          .map((d) => ({
            key: `${d.name}||${d.dueFor || ''}`,
            name: d.name,
            dueFor: d.dueFor || '',
            charge: Number(d.amount) || 0,
            paid: 0,
            due: 0,
            feeItemId: d.feeItemId || '',
          }))
      : Object.entries(
          (pickedStudent.value?.feeBreakdown ?? {}) as Record<string, number>,
        )
          .map(([name, charge]) => ({
            key: `${name}||`,
            name,
            dueFor: '',
            charge: Number(charge) || 0,
            paid: 0,
            due: 0,
            feeItemId: '',
          }))
          .filter((r) => r.charge > 0)
  const byKey = new Map(base.map((r) => [r.key, r]))
  const fifo = (name: string): DueRow | undefined =>
    base
      .filter((r) => r.name === name && r.charge - r.paid > 0)
      .sort((a, b) => (a.dueFor || '').localeCompare(b.dueFor || ''))[0]
  for (const p of histRows.value) {
    const lines = (p.breakdown ?? []) as {
      feeType: string
      feeName?: string
      dueFor?: string
      paid: number
    }[]
    const attributions: { name: string; dueFor: string; paid: number }[] =
      lines.length > 0
        ? lines
            .filter((l) => l.feeName || l.feeType)
            .map((l) => ({
              name: l.feeName || l.feeType,
              dueFor: l.dueFor || '',
              paid: Number(l.paid) || 0,
            }))
        : [
            {
              name: (p as Payment).feeName || p.feeType,
              dueFor: '',
              paid: Number(p.paid) || 0,
            },
          ]
    for (const a of attributions) {
      if (!a.name || a.paid <= 0) continue
      const exact = byKey.get(`${a.name}||${a.dueFor}`)
      if (exact) {
        exact.paid += a.paid
        continue
      }
      const target = fifo(a.name)
      if (target) target.paid += a.paid
    }
  }
  return base.map((r) => ({ ...r, due: Math.max(0, r.charge - r.paid) }))
})
const isMultiHead = computed(() => headRowsVisible.value.length > 1)
// Exactly one fee left due → lock the name so a wrong selection is
// impossible; the banner above the dropdown names it explicitly.
const singleDue = computed(() =>
  headRowsVisible.value.length === 1 ? headRowsVisible.value[0] : null,
)
const allHeadsClear = computed(() => {
  const s = pickedStudent.value
  return !!s && (Object.keys(s.feeBreakdown ?? {}).length > 0 || (s.feeDues ?? []).length > 0) && headRowsVisible.value.length === 0
})
// Fully-paid fees (due 0) carry nothing to collect — hide them like the
// history below already records them.
const headRowsVisible = computed(() => headRows.value.filter((r) => r.due > 0))

// Per-name paid inputs (multi-name mode). Defaults to each row's full due;
// edit down for a partial payment.
const headInputs = ref<Record<string, number>>({})
const multiTotal = computed(() =>
  headRowsVisible.value.reduce((sum, r) => sum + (Number(headInputs.value[r.key]) || 0), 0),
)

// Amount defaults: 2+ due rows → per-row inputs; 1 due row → that fee +
// its due; legacy → the whole due. Once per student — typed values survive.
function applyHeadDefault(): void {
  const s = pickedStudent.value
  if (!s || appliedHeadFor.value === s.id) return
  const hasBreakdown =
    Object.keys(s.feeBreakdown ?? {}).length > 0 || (s.feeDues ?? []).length > 0
  if (hasBreakdown && !histData.value) return // receipts still loading
  appliedHeadFor.value = s.id
  lastPickedId.value = s.id
  const dueHeads = headRows.value.filter((r) => r.due > 0)
  if (dueHeads.length > 1) {
    const next: Record<string, number> = {}
    for (const r of dueHeads) next[r.key] = r.due
    headInputs.value = next
  } else if (dueHeads.length === 1) {
    const only = dueHeads[0] as DueRow
    form.feeType = only.name
    form.amount = only.due
  } else {
    form.amount = hasBreakdown ? 0 : Number(s.dueAmount) || 0
  }
}

const previewDue = computed(() => {
  const due = Number(pickedStudent.value?.dueAmount) || 0
  const taking = isMultiHead.value ? multiTotal.value : Number(form.amount) || 0
  return Math.max(0, due - taking)
})

watch(pickedStudent, () => {
  applyHeadDefault()
})
watch(histData, () => {
  applyHeadDefault()
})

// Deep-link resolution (?studentId=…): the old watch only fired when the
// 500-row picker list itself changed, so a cached list, a reused page, or a
// student beyond row 500 all landed on an empty picker. This watches the
// query too, and falls back to a direct fetch when the list cannot name them.
const appliedQuery = ref('')
function resetStudentPick(): void {
  form.feeType = ''
  form.amount = 0
  headInputs.value = {}
  appliedHeadFor.value = ''
}
function applyWantedStudent(): void {
  const id = wantedId.value
  if (!id || appliedQuery.value === id) return
  const match = allStudents.value.find((s) => s.id === id)
  if (!match) return
  appliedQuery.value = id
  resetStudentPick()
  selectStudent(match)
}
watch([allStudents, wantedId], () => {
  applyWantedStudent()
}, { immediate: true })

const { data: wantedData } = useStudent(wantedId)
watch(wantedData, (res) => {
  const s = res?.data
  const id = wantedId.value
  if (!id || !s || appliedQuery.value === id || s.id !== id) return
  appliedQuery.value = id
  resetStudentPick()
  selectStudent(s)
})

async function collect(): Promise<void> {
  formError.value = ''
  if (!form.studentId) {
    studentError.value = 'Pick a student first.'
    return
  }
  try {
    if (isMultiHead.value) {
      // One receipt for the whole collection — per-name split travels in
      // breakdown so no fee's money lands on another fee.
      const lines = headRows.value
        .map((r) => ({
          feeType: r.name,
          feeName: r.name,
          dueFor: r.dueFor,
          amount: r.due,
          paid: Math.min(Math.max(0, Number(headInputs.value[r.key]) || 0), r.due),
        }))
        .filter((r) => r.paid > 0)
      if (!lines.length) {
        formError.value = 'Enter an amount for at least one fee.'
        return
      }
      const res = await collectPayment({
        studentId: form.studentId,
        feeType: lines[0]?.feeName ?? form.feeType,
        feeName: lines[0]?.feeName ?? form.feeType,
        amount: lines.reduce((s, r) => s + r.amount, 0),
        discount: 0,
        paid: lines.reduce((s, r) => s + r.paid, 0),
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        collectorName: form.collectorName.trim() || 'Admin',
        notes: form.notes.trim(),
        breakdown: lines,
      })
      toast.success(`Payment collected (${res.data.receiptNumber})`)
      await router.push(`/admin/payments/${res.data.id}`)
    } else {
      const res = await collectPayment({
        studentId: form.studentId,
        feeType: form.feeType,
        feeName: form.feeType,
        amount: form.amount,
        discount: 0,
        paid: form.amount,
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        collectorName: form.collectorName.trim() || 'Admin',
        notes: form.notes.trim(),
      })
      toast.success(`Payment collected (${res.data.receiptNumber})`)
      await router.push(`/admin/payments/${res.data.id}`)
    }
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Collection failed'
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
  margin-bottom: var(--spacing-lg);
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
/* Form + history share one responsive grid: side by side on wide
   screens, stacked on narrow ones. Both cards keep the same structure. */
.collect-grid {
  display: grid;
  grid-template-columns: minmax(340px, 480px) minmax(0, 1fr);
  gap: var(--spacing-md);
  align-items: start;
}
.collect-grid > * {
  min-width: 0;
}
.collect-history .table-wrap {
  overflow-x: auto;
}
@media (max-width: 1024px) {
  .collect-grid {
    grid-template-columns: 1fr;
  }
}
.form label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.due-card {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  background: var(--color-primary-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
}
.due-card__due {
  font-weight: var(--font-weight-bold);
}
.picker {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.picker__menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin: var(--spacing-xs) 0 0;
  padding: var(--spacing-xs) 0;
  list-style: none;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  max-height: 240px;
  overflow-y: auto;
  z-index: 20;
}
.picker__empty {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
.picker__item {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: var(--spacing-sm) var(--spacing-md);
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  text-align: left;
}
.picker__item:hover {
  background: var(--color-primary-light);
}
.picker__meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
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
.head-table {
  display: flex;
  flex-direction: column;
  font-size: var(--font-size-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.head-table__row {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr;
  gap: var(--spacing-sm);
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}
@media (max-width: 640px) {
  .head-table__row {
    grid-template-columns: 1fr 1fr;
  }
}
.head-table__input {
  max-width: 140px;
}
.single-due {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-warning-light, var(--color-primary-light));
  border: 1px solid var(--color-warning, var(--color-border));
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}
.single-due__label {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
}
.single-due__name {
  font-weight: var(--font-weight-semibold);
  flex: 1;
}
.single-due__amount {
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  font-size: var(--font-size-base);
}
.duefor {
  font-style: normal;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}
.head-table__empty {
  padding: var(--spacing-sm) var(--spacing-md);
}
.head-table__row:last-child {
  border-bottom: none;
}
.head-table__row--head {
  font-weight: var(--font-weight-bold);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
}
.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  padding: 0;
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.success {
  color: var(--color-success);
  font-size: var(--font-size-sm);
}
.link {
  color: var(--color-primary);
}
</style>
