<template>
  <div class="page">
    <div class="no-print">
    <h1 class="page__title">Reports</h1>

    <div class="stat-grid">
      <AppCard title="Students">
        <strong class="stat">{{ students.length }}</strong>
      </AppCard>
      <AppCard title="Teachers">
        <strong class="stat">{{ teachers.length }}</strong>
      </AppCard>
      <AppCard title="Total Dues (৳)">
        <strong class="stat">{{ totalDues }}</strong>
      </AppCard>
      <AppCard title="Pass Rate (latest published)">
        <strong class="stat">{{ passRate }}%</strong>
      </AppCard>
    </div>

    <div class="grid">
      <AppCard title="Students per Class">
        <Bar v-if="studentsChart" :data="studentsChart" :options="chartOptions" />
        <p v-else class="muted">No data.</p>
      </AppCard>
      <AppCard title="Dues per Class (৳)">
        <Bar v-if="duesChart" :data="duesChart" :options="chartOptions" />
        <p v-else class="muted">No dues.</p>
      </AppCard>
    </div>

    <div class="report-head">
      <h2 class="section-title">Accounts Report — Income vs Expense</h2>
      <div class="report-actions">
        <AppButton variant="ghost" type="button" :disabled="!accSummary" @click="exportCSV">Export CSV</AppButton>
        <AppButton variant="ghost" type="button" :disabled="!accSummary" @click="downloadPdf">PDF</AppButton>
        <AppButton variant="ghost" type="button" :disabled="!accSummary" @click="printReport">Print</AppButton>
      </div>
    </div>

    <AppCard>
      <div class="preset-row">
        <button
          v-for="p in presets"
          :key="p.key"
          type="button"
          :class="['preset-btn', { 'preset-btn--active': activePreset === p.key }]"
          @click="applyPreset(p.key)"
        >{{ p.label }}</button>
        <input v-model="accFrom" type="date" class="app-input__control preset-date" @change="activePreset = 'custom'" />
        <span class="muted">to</span>
        <input v-model="accTo" type="date" class="app-input__control preset-date" @change="activePreset = 'custom'" />
      </div>
      <p class="muted period-note">{{ periodNote }} <span v-if="accFetching" class="updating">· Updating…</span></p>
      <p v-if="accLoading && !accSummary" class="muted">Loading accounts…</p>
      <div v-if="accSummary" class="acc-grid" :class="{ 'acc-grid--fetching': accFetching }">
        <div class="acc-card"><p class="acc-label">Opening Balance</p><p class="acc-value">৳{{ fmt(accSummary.openingBalance) }}</p></div>
        <div class="acc-card acc-card--in"><p class="acc-label">Income (period)</p><p class="acc-value">৳{{ fmt(accSummary.totalIn) }}</p></div>
        <div class="acc-card acc-card--out"><p class="acc-label">Expense (period)</p><p class="acc-value">৳{{ fmt(accSummary.totalOut) }}</p></div>
        <div class="acc-card acc-card--bal"><p class="acc-label">Closing Balance</p><p class="acc-value">৳{{ fmt(accSummary.closingBalance ?? accSummary.balance) }}</p></div>
      </div>
    </AppCard>

    <div v-if="accSummary" class="grid">
      <AppCard title="Income by head">
        <table class="mini-table">
          <thead><tr><th>Head</th><th>Entries</th><th>Total (৳)</th></tr></thead>
          <tbody>
            <tr v-for="r in accIncomeHeads" :key="r.head"><td>{{ r.head }}</td><td class="muted">{{ r.count }}</td><td class="num-in">{{ fmt(r.amount) }}</td></tr>
            <tr v-if="!accIncomeHeads.length"><td colspan="3" class="muted">No income in this period.</td></tr>
          </tbody>
        </table>
      </AppCard>
      <AppCard title="Expense by head">
        <table class="mini-table">
          <thead><tr><th>Head</th><th>Entries</th><th>Total (৳)</th></tr></thead>
          <tbody>
            <tr v-for="r in accExpenseHeads" :key="r.head"><td>{{ r.head }}</td><td class="muted">{{ r.count }}</td><td class="num-out">{{ fmt(r.amount) }}</td></tr>
            <tr v-if="!accExpenseHeads.length"><td colspan="3" class="muted">No expense in this period.</td></tr>
          </tbody>
        </table>
      </AppCard>
    </div>

    <AppCard v-if="accSummary" title="Month-wise Income vs Expense">
      <Bar v-if="accMonthChart" :data="accMonthChart" :options="chartOptions" />
      <p v-else class="muted">No data in this period.</p>
    </AppCard>
    </div><!-- /.no-print -->

    <!-- Print-only sheet: Excel-style tabular statement (row/column, B/W safe). -->
    <div v-if="accSummary" class="print-sheet-only">
      <div class="print-sheet">
        <h1>{{ schoolName }}</h1>
        <h2>Income &amp; Expense Statement</h2>
        <p class="sheet-meta">Period: {{ sheetPeriod }} &nbsp;|&nbsp; Printed: {{ printedOn }} &nbsp;|&nbsp; Entries: {{ accSummary.count }}</p>
        <table>
          <thead><tr><th>SL</th><th>Particulars</th><th class="num">Amount (৳)</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>Opening Balance (carry-forward)</td><td class="num">{{ fmt(accSummary.openingBalance) }}</td></tr>
            <tr><td>2</td><td>Total Income (period)</td><td class="num">{{ fmt(accSummary.totalIn) }}</td></tr>
            <tr><td>3</td><td>Total Expense (period)</td><td class="num">{{ fmt(accSummary.totalOut) }}</td></tr>
            <tr class="total-row"><td>4</td><td>Closing Balance (1 + 2 − 3)</td><td class="num">{{ fmt(accSummary.closingBalance ?? accSummary.balance) }}</td></tr>
          </tbody>
        </table>
        <h2>Income by Head</h2>
        <table>
          <thead><tr><th>SL</th><th>Head</th><th class="num">Entries</th><th class="num">Amount (৳)</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in accIncomeHeads" :key="r.head"><td>{{ i + 1 }}</td><td>{{ r.head }}</td><td class="num">{{ r.count }}</td><td class="num">{{ fmt(r.amount) }}</td></tr>
            <tr v-if="!accIncomeHeads.length"><td colspan="4">No income in this period.</td></tr>
            <tr v-else class="total-row"><td colspan="3">Total Income</td><td class="num">{{ fmt(accSummary.totalIn) }}</td></tr>
          </tbody>
        </table>
        <h2>Expense by Head</h2>
        <table>
          <thead><tr><th>SL</th><th>Head</th><th class="num">Entries</th><th class="num">Amount (৳)</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in accExpenseHeads" :key="r.head"><td>{{ i + 1 }}</td><td>{{ r.head }}</td><td class="num">{{ r.count }}</td><td class="num">{{ fmt(r.amount) }}</td></tr>
            <tr v-if="!accExpenseHeads.length"><td colspan="4">No expense in this period.</td></tr>
            <tr v-else class="total-row"><td colspan="3">Total Expense</td><td class="num">{{ fmt(accSummary.totalOut) }}</td></tr>
          </tbody>
        </table>
        <div class="sign-row">
          <div class="sign-box">Prepared by &amp; Date</div>
          <div class="sign-box">Checked by &amp; Date</div>
          <div class="sign-box">Approved by &amp; Date</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import { useChartPalette } from '@/composables/useChartPalette'
import { useClasses, useExams, useExamResults, useLedgerSummary, useSettings, useStudents, useTeachers } from '@/composables/useQueries'
import { printWithTitle } from '@/utils/print'
import { accountsReportPdf } from '@/utils/pdf'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const { palette } = useChartPalette()

const { data: studentData } = useStudents({ perPage: 500 })
const students = computed(() => studentData.value?.data.items ?? [])
const { data: teacherData } = useTeachers({ perPage: 500 })
const teachers = computed(() => teacherData.value?.data.items ?? [])
const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])

const totalDues = computed(() => students.value.reduce((sum, s) => sum + s.dueAmount, 0))

const studentsChart = computed(() => {
  if (classes.value.length === 0) return null
  return {
    labels: classes.value.map((c) => c.label),
    datasets: [
      {
        data: classes.value.map((c) => students.value.filter((s) => s.classId === c.id).length),
        backgroundColor: palette.value.primary,
        borderRadius: 8,
      },
    ],
  }
})

const duesChart = computed(() => {
  const withDues = classes.value.filter((c) =>
    students.value.some((s) => s.classId === c.id && s.dueAmount > 0),
  )
  if (withDues.length === 0) return null
  return {
    labels: withDues.map((c) => c.label),
    datasets: [
      {
        data: withDues.map((c) =>
          students.value.filter((s) => s.classId === c.id).reduce((sum, s) => sum + s.dueAmount, 0),
        ),
        backgroundColor: palette.value.warning,
        borderRadius: 8,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
}

// Pass rate of the most recently published exam (server-computed).
const { data: examData } = useExams({ perPage: 500 })
const latestPublished = computed(() =>
  (examData.value?.data.items ?? []).find((e) => e.status === 'published'),
)
const { data: examResultsData } = useExamResults(() => latestPublished.value?.id ?? '')
const passRate = computed(() => examResultsData.value?.data.summary.passRate ?? 0)

// ---------- Accounts report (weekly / monthly / bi-monthly / yearly / full) ----------
const fmt = (v: unknown): string => (Number(v) || 0).toLocaleString('en-IN')
const iso = (d: Date): string => d.toISOString().slice(0, 10)

type PresetKey = 'week' | 'month' | 'quarter' | 'year' | 'full' | 'custom'
const presets: { key: PresetKey; label: string }[] = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'Last 3 Months' },
  { key: 'year', label: 'This Year' },
  { key: 'full', label: 'Full' },
]
const activePreset = ref<PresetKey>('month')
const accFrom = ref<string>('')
const accTo = ref<string>('')

function applyPreset(key: PresetKey): void {
  activePreset.value = key
  const now = new Date()
  if (key === 'full') {
    accFrom.value = ''
    accTo.value = ''
    return
  }
  if (key === 'week') {
    const day = (now.getDay() + 6) % 7 // Monday start
    const mon = new Date(now)
    mon.setDate(now.getDate() - day)
    accFrom.value = iso(mon)
    accTo.value = iso(now)
    return
  }
  if (key === 'month') {
    accFrom.value = iso(new Date(now.getFullYear(), now.getMonth(), 1))
    accTo.value = iso(now)
    return
  }
  if (key === 'quarter') {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 3)
    accFrom.value = iso(d)
    accTo.value = iso(now)
    return
  }
  accFrom.value = iso(new Date(now.getFullYear(), 0, 1))
  accTo.value = iso(now)
}
applyPreset('month')

const accParams = computed(() => ({
  from: accFrom.value || undefined,
  to: accTo.value || undefined,
}))
const { data: accData, isLoading: accLoading, isFetching: accFetching } = useLedgerSummary(accParams)
const accSummary = computed(() => accData.value?.data)
const accIncomeHeads = computed(() => (accSummary.value?.byHead ?? []).filter((r) => r.kind === 'income'))
const accExpenseHeads = computed(() => (accSummary.value?.byHead ?? []).filter((r) => r.kind === 'expense'))
const periodNote = computed(() => {
  if (!accFrom.value && !accTo.value) return 'Period: Full history (opening ৳0)'
  return `Period: ${accFrom.value || '…'} to ${accTo.value || '…'} · ${accSummary.value?.count ?? 0} entries`
})
const accMonthChart = computed(() => {
  const rows = accSummary.value?.byMonth ?? []
  if (!rows.length) return null
  return {
    labels: rows.map((r) => r.month),
    datasets: [
      { label: 'Income', data: rows.map((r) => r.income), backgroundColor: palette.value.primary, borderRadius: 6 },
      { label: 'Expense', data: rows.map((r) => r.expense), backgroundColor: palette.value.danger, borderRadius: 6 },
    ],
  }
})

function exportCSV(): void {
  const s = accSummary.value
  if (!s) return
  const lines = [
    `Accounts Report,${accFrom.value || 'start'} to ${accTo.value || 'today'}`,
    `Opening Balance,${s.openingBalance ?? 0}`,
    `Income (period),${s.totalIn}`,
    `Expense (period),${s.totalOut}`,
    `Closing Balance,${s.closingBalance ?? s.balance}`,
    '',
    'Income by head,Entries,Amount',
    ...accIncomeHeads.value.map((r) => `"${r.head}",${r.count},${r.amount}`),
    '',
    'Expense by head,Entries,Amount',
    ...accExpenseHeads.value.map((r) => `"${r.head}",${r.count},${r.amount}`),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `accounts-report-${accFrom.value || 'full'}-${accTo.value || 'today'}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
function printReport(): void {
  printWithTitle(`${schoolName.value} - Accounts Report (${sheetPeriod.value})`)
}
function downloadPdf(): void {
  const s = accSummary.value
  if (!s) return
  accountsReportPdf({
    schoolName: schoolName.value,
    period: sheetPeriod.value,
    printedOn: printedOn.value,
    opening: Number(s.openingBalance ?? 0),
    totalIn: Number(s.totalIn ?? 0),
    totalOut: Number(s.totalOut ?? 0),
    closing: Number(s.closingBalance ?? s.balance ?? 0),
    count: Number(s.count ?? 0),
    incomeHeads: accIncomeHeads.value,
    expenseHeads: accExpenseHeads.value,
  })
}

// ---------- Print sheet helpers ----------
const { data: settingsData } = useSettings()
const schoolName = computed(() => settingsData.value?.data.schoolName || 'School')
const sheetPeriod = computed(() => {
  if (!accFrom.value && !accTo.value) return 'Full history'
  return `${accFrom.value || '…'} to ${accTo.value || '…'}`
})
const printedOn = computed(() => new Date().toISOString().slice(0, 10))
</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-lg);
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
.stat {
  font-size: var(--font-size-2xl);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--spacing-md);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.report-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
  flex-wrap: wrap;
}
.section-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  margin: 0;
}
.report-actions {
  display: flex;
  gap: var(--spacing-sm);
}
.preset-row {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: var(--spacing-sm);
}
.preset-btn {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: var(--radius-full);
  padding: 6px 14px;
  font: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.preset-btn--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
  font-weight: 600;
}
.preset-date {
  max-width: 160px;
}
.period-note {
  margin: 0 0 var(--spacing-md);
}
.acc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--spacing-md);
  transition: opacity 0.15s ease;
}
.acc-grid--fetching {
  opacity: 0.6;
}
.updating {
  color: var(--color-primary);
  font-weight: 600;
}
.acc-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  background: var(--color-background);
}
.acc-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin: 0 0 4px;
}
.acc-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin: 0;
}
.acc-card--in .acc-value {
  color: var(--color-success, green);
}
.acc-card--out .acc-value {
  color: var(--color-danger);
}
.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.mini-table th,
.mini-table td {
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border);
}
.num-in {
  color: var(--color-success, green);
  font-weight: 600;
}
.num-out {
  color: var(--color-danger);
  font-weight: 600;
}
@media print {
  .report-actions,
  .preset-row {
    display: none;
  }
}
</style>
