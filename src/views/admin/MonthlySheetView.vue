<template>
  <div class="page">
    <div class="page__head">
      <div>
        <button class="link-btn" type="button" @click="router.push('/admin/payroll')">← Payroll</button>
        <h1 class="page__title">Salary Sheet — {{ periodLabel(month, year) }}</h1>
        <p class="muted">Check everything first, fix where needed — Save creates the sheets.</p>
      </div>
      <div class="head-actions">
        <AppButton
          v-if="newRows.length > 0"
          type="button"
          :loading="saving"
          @click="saveSheet"
        >
          Save sheet — ৳{{ draftTotalNet }}
        </AppButton>
        <AppButton
          v-if="savedRows.length > 0"
          variant="ghost"
          type="button"
          @click="downloadCsv"
        >
          Download CSV
        </AppButton>
        <AppButton
          v-if="savedRows.length > 0"
          variant="ghost"
          type="button"
          @click="downloadPdf"
        >
          PDF
        </AppButton>
        <AppButton
          v-if="savedRows.length > 0"
          variant="ghost"
          type="button"
          @click="printSheet"
        >
          Print
        </AppButton>
        <AppButton
          v-if="savedRows.length > 0 && pendingSaved.length > 0"
          variant="ghost"
          type="button"
          :loading="payingAll"
          @click="markAllPaid"
        >
          Mark all paid
        </AppButton>
      </div>
    </div>

    <AppSkeleton v-if="loading" variant="table" :rows="8" :cols="10" />
    <p v-else-if="loadError" class="error">{{ loadError }}</p>
    <template v-else>
      <AppCard v-if="newRows.length > 0" title="Review — new sheets (not created yet)">
        <table class="table">
          <thead>
            <tr>
              <th>#</th><th>Teacher</th><th>Basic</th><th>Allow</th><th>Bonus</th>
              <th>Deduct</th><th>Net (৳)</th><th>Present</th><th>Absent</th>
              <th title="Hajira days cut by the staff late rule — set in Super Admin → Payroll → Late settings">Late cut</th>
              <th>Leave cut</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in newRows" :key="r.teacherId">
              <td>{{ i + 1 }}</td>
              <td>
                <button class="link-btn" type="button" @click.stop="openDraftDetail(r)">
                  {{ r.teacherName }}
                </button>
                <span class="muted small"> · {{ r.kind }}</span>
              </td>
              <td><input v-model.number="r.basic" type="number" min="0" class="cell-input" /></td>
              <td><input v-model.number="r.allowance" type="number" min="0" class="cell-input" /></td>
              <td><input v-model.number="r.bonus" type="number" min="0" class="cell-input" /></td>
              <td>
                <input v-model.number="r.deduction" type="number" min="0" class="cell-input" />
                <button
                  v-if="r.suggestedDeduction > 0 && r.deduction !== r.suggestedDeduction"
                  class="link-btn tiny"
                  type="button"
                  :title="`Leave: ${r.leaveDays} day(s) + late: ${r.lateCutDays} hajira, both × ৳${r.perDay}`"
                  @click="r.deduction = r.suggestedDeduction"
                >
                  Use ৳{{ r.suggestedDeduction }}
                </button>
              </td>
              <td><strong>{{ rowNet(r) }}</strong></td>
              <td>{{ r.present }}</td>
              <td>{{ r.absent }}</td>
              <td class="muted" :title="`${r.late} late day(s) → ${r.lateCutDays} hajira`">
                {{ r.lateCutDays > 0 ? `${r.lateCutDays}d` : '—' }}
              </td>
              <td class="muted">{{ r.leaveDays > 0 ? `${r.leaveDays}d` : '—' }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="totals-row">
              <td colspan="6"><strong>Total (new)</strong></td>
              <td><strong>৳{{ draftTotalNet }}</strong></td>
              <td colspan="4"></td>
            </tr>
          </tfoot>
        </table>
        <p class="muted small">
          Deduct starts with the leave cut + late cut; change it per row if the school has a different rule.
        </p>
        <p v-if="saveError" class="error">{{ saveError }}</p>
        <p v-if="saveResult" class="muted">{{ saveResult }}</p>
      </AppCard>

      <AppCard v-if="savedLoading || savedRows.length > 0" title="Created sheets">
        <AppSkeleton v-if="savedLoading" variant="table" :rows="8" :cols="10" />
        <table v-else class="table">
          <thead>
            <tr>
              <th>#</th><th>Teacher</th><th>Basic</th><th>Allow</th><th>Bonus</th>
              <th>Deduct</th><th>Net (৳)</th><th>Status</th><th>Paid</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(s, i) in savedRows"
              :key="s.id"
              class="clickable-row"
              @click="router.push(`/admin/payroll/salary/${s.id}`)"
            >
              <td>{{ i + 1 }}</td>
              <td>
                <button class="link-btn" type="button" @click.stop="router.push(`/admin/payroll/salary/${s.id}`)">
                  {{ s.teacherName }}
                </button>
              </td>
              <td>{{ s.basic }}</td>
              <td>{{ s.allowance }}</td>
              <td><input v-model.number="editOf(s).bonus" type="number" min="0" class="cell-input" @click.stop /></td>
              <td><input v-model.number="editOf(s).deduction" type="number" min="0" class="cell-input" @click.stop /></td>
              <td><strong>{{ savedNet(s) }}</strong></td>
              <td>
                <button
                  v-if="s.status === 'paid'"
                  class="chip chip--btn"
                  type="button"
                  title="Click to mark unpaid"
                  @click.stop="askUnpay(s.id, s.teacherName)"
                >
                  {{ s.status }}
                </button>
                <span v-else class="chip">{{ s.status }}</span>
              </td>
              <td>{{ s.paymentDate || '—' }}</td>
              <td class="row-actions-cell">
                <button
                  v-if="s.status !== 'paid'"
                  class="link-btn"
                  type="button"
                  :disabled="payingId === s.id"
                  @click.stop="payOne(s.id)"
                >
                  <AppSpinner v-if="payingId === s.id" size="sm" label="Working" />
                  <template v-else>Mark paid</template>
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="totals-row">
              <td colspan="6"><strong>Total (created)</strong></td>
              <td><strong>৳{{ savedTotalNet }}</strong></td>
              <td colspan="3"></td>
            </tr>
          </tfoot>
        </table>
        <div class="save-row">
          <p v-if="editError" class="error">{{ editError }}</p>
          <AppButton
            type="button"
            :disabled="changedCount === 0"
            :loading="savingEdits"
            @click="saveEdits"
          >
            {{ changedCount > 0 ? `Save changes (${changedCount})` : 'Save changes' }}
          </AppButton>
          <p class="muted small">Edit Bonus / Deduct above, then Save here to save all changes together. Click a row for full detail.</p>
        </div>
      </AppCard>

      <p v-if="!newRows.length && !savedRows.length" class="muted">No active teachers found.</p>
    </template>

    <AppConfirmDialog
      :open="confirmUnpay.open"
      :message="confirmUnpay.message"
      :busy="unpaying"
      @cancel="confirmUnpay.open = false"
      @confirm="doUnpay"
    />

  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import { useGenerateMonth, usePaySalary, useSalaries } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { printWithTitle } from '@/utils/print'
import { salarySheetPdf } from '@/utils/pdf'
import { payrollService } from '@/services'
import type { SalaryRecord, SheetDraftRow } from '@/types/models'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const periodLabel = (m: number, y: number): string => `${MONTHS[m - 1] ?? m} ${y}`
const num = (v: unknown): number => Number(v) || 0
const grossOf = (s: SalaryRecord): number =>
  num(s.basic) + num(s.allowance) + num(s.bonus)

interface DraftEdit extends SheetDraftRow {
  bonus: number
  deduction: number
}

const route = useRoute()
const router = useRouter()
async function openDraftDetail(r: DraftEdit): Promise<void> {
  // If a sheet already exists for this teacher, open the salary detail page
  // directly (full page, not a modal).
  const existingId = r.existingSheetId || savedSheetByTeacher.value[r.teacherId]
  if (existingId) {
    router.push(`/admin/payroll/salary/${existingId}`)
    return
  }
  // Otherwise save the sheet (all rows, with current edits) first, then open
  // this teacher's salary detail page.
  saving.value = true
  saveError.value = ''
  try {
    const res = await generateMonthSheets({
      month: month.value,
      year: year.value,
      rows: newRows.value.map((row) => ({
        teacherId: row.teacherId,
        basic: num(row.basic),
        allowance: num(row.allowance),
        bonus: num(row.bonus),
        deduction: num(row.deduction),
      })),
    })
    const d = res.data
    const sheet = (d?.sheets ?? []).find((s: { teacherId?: string; id?: string }) => s.teacherId === r.teacherId)
    toast.success('Monthly sheet saved')
    await loadDraft()
    if (sheet?.id) {
      router.push(`/admin/payroll/salary/${sheet.id}`)
    } else {
      saveResult.value = `${d?.created ?? 0} sheet(s) created`
        + ((d?.skipped?.length ?? 0) ? `, ${d?.skipped.length} skipped` : '')
    }
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}
const toast = useToast()
const qc = useQueryClient()
const month = computed(() => Number(route.params.month) || 0)
const year = computed(() => Number(route.params.year) || 0)

const draft = reactive<{ rows: DraftEdit[] }>({ rows: [] })
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const saveError = ref('')
const saveResult = ref('')

async function loadDraft(): Promise<void> {
  if (!month.value || !year.value) return
  loading.value = true
  loadError.value = ''
  saveResult.value = ''
  try {
    const res = await payrollService.sheetDraft(month.value, year.value)
    draft.rows = (res.data?.rows ?? []).map((r) => ({
      ...r,
      bonus: 0,
      deduction: r.suggestedDeduction,
    }))
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load draft'
  } finally {
    loading.value = false
  }
}
watch([month, year], () => void loadDraft(), { immediate: true })

const newRows = computed(() => draft.rows.filter((r) => !r.existingSheetId))
const rowNet = (r: DraftEdit): number =>
  num(r.basic) + num(r.allowance) + num(r.bonus) - num(r.deduction)
const draftTotalNet = computed(() => newRows.value.reduce((s, r) => s + rowNet(r), 0))

const { data: salData, isLoading: savedLoading } = useSalaries(month, year)
const savedRows = computed(() => salData.value?.data ?? [])
const savedSheetByTeacher = computed(() => {
  const map: Record<string, string> = {}
  for (const s of savedRows.value) {
    if (s.teacherId) map[s.teacherId] = s.id
  }
  return map
})

// Inline edits for created sheets (Bonus / Deduct fixed right here).
const savedEdits = reactive<Record<string, { bonus: number; deduction: number }>>({})
function editOf(s: SalaryRecord): { bonus: number; deduction: number } {
  if (!savedEdits[s.id]) {
    savedEdits[s.id] = { bonus: num(s.bonus), deduction: num(s.deduction) }
  }
  return savedEdits[s.id] as { bonus: number; deduction: number }
}
watch(savedRows, (rows) => {
  for (const s of rows) {
    if (!savedEdits[s.id]) {
      savedEdits[s.id] = { bonus: num(s.bonus), deduction: num(s.deduction) }
    }
  }
}, { immediate: true })
const savedNet = (s: SalaryRecord): number => {
  const e = savedEdits[s.id]
  const bonus = e ? num(e.bonus) : num(s.bonus)
  const deduction = e ? num(e.deduction) : num(s.deduction)
  return num(s.basic) + num(s.allowance) + bonus - deduction
}
const changedIds = computed(() =>
  savedRows.value
    .filter((s) => {
      const e = savedEdits[s.id]
      return e && (num(e.bonus) !== num(s.bonus) || num(e.deduction) !== num(s.deduction))
    })
    .map((s) => s.id),
)
const changedCount = computed(() => changedIds.value.length)
const savedTotalNet = computed(() => savedRows.value.reduce((sum, s) => sum + savedNet(s), 0))
const totals = computed(() => {
  const t = { basic: 0, allowance: 0, bonus: 0, deduction: 0, gross: 0, net: 0 }
  for (const s of savedRows.value) {
    t.basic += num(s.basic)
    t.allowance += num(s.allowance)
    t.bonus += num(s.bonus)
    t.deduction += num(s.deduction)
    t.gross += grossOf(s)
    t.net += num(s.net)
  }
  return t
})
const pendingSaved = computed(() => savedRows.value.filter((s) => s.status !== 'paid'))

const { mutateAsync: generateMonthSheets } = useGenerateMonth()

async function saveSheet(): Promise<void> {
  saveError.value = ''
  saveResult.value = ''
  saving.value = true
  try {
    const res = await generateMonthSheets({
      month: month.value,
      year: year.value,
      rows: newRows.value.map((r) => ({
        teacherId: r.teacherId,
        basic: num(r.basic),
        allowance: num(r.allowance),
        bonus: num(r.bonus),
        deduction: num(r.deduction),
      })),
    })
    const d = res.data
    saveResult.value = `${d?.created ?? 0} sheet(s) created`
      + ((d?.skipped?.length ?? 0) ? `, ${d?.skipped.length} skipped` : '')
    toast.success('Monthly sheet saved')
    await loadDraft()
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

const payingAll = ref(false)
const payingId = ref('')
const unpaying = ref(false)
const confirmUnpay = ref({ open: false, id: '', message: '' })
const { mutateAsync: markPaid } = usePaySalary()
async function payOne(id: string): Promise<void> {
  payingId.value = id
  try {
    await markPaid(id)
    toast.success('Marked paid')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  } finally {
    payingId.value = ''
  }
}

function askUnpay(id: string, name: string): void {
  confirmUnpay.value = { open: true, id, message: `Mark "${name}" as unpaid (back to pending)?` }
}
async function doUnpay(): Promise<void> {
  unpaying.value = true
  try {
    await payrollService.update(confirmUnpay.value.id, { status: 'pending', paymentDate: null })
    toast.success('Marked unpaid')
    confirmUnpay.value.open = false
    await qc.invalidateQueries({ queryKey: ['salaries'] })
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  } finally {
    unpaying.value = false
  }
}
async function markAllPaid(): Promise<void> {
  payingAll.value = true
  try {
    for (const s of pendingSaved.value) await markPaid(s.id)
    toast.success('All sheets marked paid')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  } finally {
    payingAll.value = false
  }
}

const savingEdits = ref(false)
const editError = ref('')
async function saveEdits(): Promise<void> {
  editError.value = ''
  savingEdits.value = true
  try {
    for (const id of changedIds.value) {
      const e = savedEdits[id]
      await payrollService.update(id, {
        bonus: num(e?.bonus),
        deduction: num(e?.deduction),
      })
    }
    toast.success('Changes saved')
    await qc.invalidateQueries({ queryKey: ['salaries'] })
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    savingEdits.value = false
  }
}

function downloadCsv(): void {
  const head = ['#', 'Teacher', 'Basic', 'Allowance', 'Bonus', 'Deduction', 'Gross', 'Net', 'Present', 'Absent', 'Status', 'Paid Date']
  const lines = [head.join(',')]
  savedRows.value.forEach((s, i) => {
    const cells = [
      i + 1,
      `"${String(s.teacherName).replace(/"/g, '""')}"`,
      num(s.basic), num(s.allowance), num(s.bonus), num(s.deduction),
      grossOf(s), num(s.net),
      s.presentDays ?? 0, s.absentDays ?? 0,
      s.status, s.paymentDate || '',
    ]
    lines.push(cells.join(','))
  })
  lines.push(['', 'Total', totals.value.basic, totals.value.allowance, totals.value.bonus,
    totals.value.deduction, totals.value.gross, totals.value.net, '', '', '', ''].join(','))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `salary-sheet-${year.value}-${String(month.value).padStart(2, '0')}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  toast.success('Salary sheet downloaded')
}

function printSheet(): void {
  printWithTitle(`Salary Sheet - ${periodLabel(month.value, year.value)}`)
}
function downloadPdf(): void {
  salarySheetPdf({
    schoolName: 'School',
    periodLabel: periodLabel(month.value, year.value),
    rows: savedRows.value.map((s) => ({
      teacherName: s.teacherName,
      basic: num(s.basic),
      allowance: num(s.allowance),
      bonus: num(s.bonus),
      deduction: num(s.deduction),
      gross: grossOf(s),
      net: num(s.net),
      status: s.status,
      paymentDate: s.paymentDate || '',
    })),
    totals: {
      basic: num(totals.value.basic),
      allowance: num(totals.value.allowance),
      bonus: num(totals.value.bonus),
      deduction: num(totals.value.deduction),
      gross: num(totals.value.gross),
      net: num(totals.value.net),
    },
  })
}
</script>

<style scoped>
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-lg);
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-top: var(--spacing-xs);
}
.head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}
.muted {
  color: var(--color-text-muted);
}
.small {
  font-size: var(--font-size-xs);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.link-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.link-btn.tiny {
  font-size: var(--font-size-xs);
  display: block;
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
.cell-input {
  width: 90px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font: inherit;
  background: var(--color-surface);
  color: var(--color-text);
}
.clickable-row {
  cursor: pointer;
}
.clickable-row:hover td {
  background: var(--color-background);
}
.totals-row td {
  border-top: 2px solid var(--color-border);
  background: var(--color-background);
}
.chip {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  font-size: var(--font-size-xs);
  text-transform: capitalize;
}
.chip--btn {
  border: none;
  cursor: pointer;
  font: inherit;
}
.row-actions-cell {
  text-align: right;
  white-space: nowrap;
}
.save-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
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
  width: min(520px, 100%);
  max-height: 90vh;
  overflow: auto;
}
.modal--wide {
  width: min(560px, 100%);
}
.modal__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-md);
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xs) var(--spacing-md);
}
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.detail-row--strong {
  font-weight: var(--font-weight-semibold);
}
.detail-key {
  color: var(--color-text-muted);
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}
@media print {
  .head-actions,
  .link-btn {
    display: none;
  }
  .page__head {
    margin-bottom: var(--spacing-md);
  }
}
</style>
