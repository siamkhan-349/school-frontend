<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Accounts — School Fund</h1>
        <p class="muted">Money INTO school / OUT of school. Fee collection and salary payment post here automatically.</p>
      </div>
      <RouterLink to="/admin/accounts/new" class="add-entry-link">
        <AppButton type="button">+ Add Account Entry</AppButton>
      </RouterLink>
    </div>

    <div class="tabs">
      <button :class="['tab', { 'tab--active': tab === 'ledger' }]" type="button" @click="tab = 'ledger'">
        Ledger
      </button>
      <button :class="['tab', { 'tab--active': tab === 'summary' }]" type="button" @click="tab = 'summary'">
        Summary
      </button>
      <button :class="['tab', { 'tab--active': tab === 'heads' }]" type="button" @click="tab = 'heads'">
        Heads
      </button>
      <button :class="['tab', { 'tab--active': tab === 'opening' }]" type="button" @click="tab = 'opening'">
        Opening Balance
      </button>
    </div>

    <!-- Ledger -->
    <template v-if="tab === 'ledger'">
      <div class="cards">
        <AppCard><p class="stat-label">Opening Balance</p><AppSkeleton v-if="sumLoading" variant="text" width="72px" /><p v-else class="stat-value">৳{{ fmt(summary?.openingBalance) }}</p></AppCard>
        <AppCard><p class="stat-label">Total In (period)</p><AppSkeleton v-if="sumLoading" variant="text" width="72px" /><p v-else class="stat-value stat-value--in">৳{{ fmt(summary?.totalIn) }}</p></AppCard>
        <AppCard><p class="stat-label">Total Out (period)</p><AppSkeleton v-if="sumLoading" variant="text" width="72px" /><p v-else class="stat-value stat-value--out">৳{{ fmt(summary?.totalOut) }}</p></AppCard>
        <AppCard><p class="stat-label">Closing Balance</p><AppSkeleton v-if="sumLoading" variant="text" width="72px" /><p v-else class="stat-value">৳{{ fmt(summary?.closingBalance ?? summary?.balance) }}</p></AppCard>
      </div>

      <AppCard title="Ledger">
        <FilterPanel>
          <select v-model="kindFilter" class="app-input__control">
            <option value="">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <input type="date" class="app-input__control" title="From" :value="from" @change="from = ($event.target as HTMLInputElement).value || undefined" />
          <input type="date" class="app-input__control" title="To" :value="to" @change="to = ($event.target as HTMLInputElement).value || undefined" />
          <input v-model="search" class="app-input__control" placeholder="Search head / note…" />
          <AppButton variant="ghost" type="button" :disabled="!rows.length" @click="exportCsv">CSV</AppButton>
        </FilterPanel>

        <AppSkeleton v-if="isLoading" variant="table" :rows="8" :cols="6" />
        <p v-else-if="isError" class="error">Failed to load ledger.</p>
        <table v-else class="table" :class="{ 'is-fetching': isFetching && !isLoading }">
          <thead>
            <tr><th>Date</th><th>Head</th><th>In (৳)</th><th>Out (৳)</th><th>Note</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="e in pagedRows" :key="e.id">
              <td>{{ e.date }}</td>
              <td>{{ e.head }} <span v-if="e.refType !== 'manual'" class="auto-tag">auto</span></td>
              <td class="num-in">{{ e.kind === 'income' ? fmt(e.amount) : '—' }}</td>
              <td class="num-out">{{ e.kind === 'expense' ? fmt(e.amount) : '—' }}</td>
              <td class="muted">{{ e.note || '—' }}</td>
              <td class="row-actions-cell">
                <button
                  v-if="e.refType === 'manual'"
                  class="link-btn link-btn--danger"
                  type="button"
                  @click="askRemove(e.id, e.head)"
                >
                  Delete
                </button>
              </td>
            </tr>
            <tr v-if="!pagedRows.length">
              <td colspan="6" class="muted">No entries yet.</td>
            </tr>
          </tbody>
          <tfoot v-if="pagedRows.length">
            <tr class="totals-row">
              <td colspan="2"><strong>Total (this page)</strong></td>
              <td><strong>{{ fmt(pagedIn) }}</strong></td>
              <td><strong>{{ fmt(pagedOut) }}</strong></td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
        <AppPagination v-model:page="page" v-model:per-page="perPage" :total="rows.length" :busy="isFetching" />
      </AppCard>
    </template>

    <!-- Summary -->
    <template v-else-if="tab === 'summary'">
      <AppCard title="Head-wise totals">
        <p class="muted head-hint">How much came in / went out per head for the selected period.</p>
        <FilterPanel>
          <input type="date" class="app-input__control" title="From" :value="summaryFrom" @change="summaryFrom = ($event.target as HTMLInputElement).value || undefined" />
          <input type="date" class="app-input__control" title="To" :value="summaryTo" @change="summaryTo = ($event.target as HTMLInputElement).value || undefined" />
        </FilterPanel>
        <div class="head-cols">
          <div>
            <h4 class="head-col-title head-col-title--in">Income by head</h4>
            <AppSkeleton v-if="summaryLoading" variant="table" :rows="3" :cols="3" />
            <table v-else class="table">
              <thead><tr><th>Head</th><th>Entries</th><th>Total (৳)</th></tr></thead>
              <tbody>
                <tr v-for="r in incomeByHead" :key="r.head">
                  <td>{{ r.head }}</td>
                  <td class="muted">{{ r.count }}</td>
                  <td class="num-in">{{ fmt(r.amount) }}</td>
                </tr>
                <tr v-if="!incomeByHead.length"><td colspan="3" class="muted">No income in this period.</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4 class="head-col-title head-col-title--out">Expense by head</h4>
            <AppSkeleton v-if="summaryLoading" variant="table" :rows="3" :cols="3" />
            <table v-else class="table">
              <thead><tr><th>Head</th><th>Entries</th><th>Total (৳)</th></tr></thead>
              <tbody>
                <tr v-for="r in expenseByHead" :key="r.head">
                  <td>{{ r.head }}</td>
                  <td class="muted">{{ r.count }}</td>
                  <td class="num-out">{{ fmt(r.amount) }}</td>
                </tr>
                <tr v-if="!expenseByHead.length"><td colspan="3" class="muted">No expense in this period.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </AppCard>
    </template>

    <!-- Heads -->
    <template v-else-if="tab === 'heads'">
      <AppCard title="Income / Expense Heads">
        <p class="muted head-hint">Heads can differ per school — create your own here. These are Accounts-only<template v-if="school.hasModule('payment')"> and unrelated to student fee heads (those live under <RouterLink to="/admin/fees">Fee Management</RouterLink>)</template>.</p>
        <form class="head-form" @submit.prevent="saveHead">
          <select v-model="headForm.kind" class="app-input__control">
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <input v-model="headForm.name" class="app-input__control" placeholder="New head name, e.g. Donation / Electricity bill" required />
          <AppButton type="submit" :loading="savingHead">+ Add Head</AppButton>
        </form>
        <p v-if="headFormError" class="error">{{ headFormError }}</p>
        <div class="head-cols">
          <div>
            <h4 class="head-col-title">Income heads</h4>
            <AppSkeleton v-if="allHeadsLoading" variant="list" :rows="3" />
            <ul v-else class="head-list">
              <li v-for="h in incomeHeads" :key="h.id">
                <span>{{ h.name }}</span>
                <button class="link-btn link-btn--danger" type="button" @click="removeHead(h.id, h.name)">Delete</button>
              </li>
              <li v-if="!incomeHeads.length" class="muted">No income heads yet.</li>
            </ul>
          </div>
          <div>
            <h4 class="head-col-title">Expense heads</h4>
            <AppSkeleton v-if="allHeadsLoading" variant="list" :rows="3" />
            <ul v-else class="head-list">
              <li v-for="h in expenseHeads" :key="h.id">
                <span>{{ h.name }}</span>
                <button class="link-btn link-btn--danger" type="button" @click="removeHead(h.id, h.name)">Delete</button>
              </li>
              <li v-if="!expenseHeads.length" class="muted">No expense heads yet.</li>
            </ul>
          </div>
        </div>
      </AppCard>
    </template>

    <!-- Opening -->
    <template v-else>
      <AppCard title="Opening Balance (carry-forward)">
        <p class="muted head-hint">Cash in hand at the start of the year/period — recorded once. Every later report picks it up as Opening automatically. <span v-if="openingCount">There are now {{ openingCount }} opening entries.</span></p>
        <form class="head-form" @submit.prevent="saveOpening">
          <input v-model.number="openingForm.amount" type="number" min="0" step="0.01" class="app-input__control" placeholder="Amount (৳)" required />
          <input v-model="openingForm.date" type="date" class="app-input__control" />
          <input v-model="openingForm.note" class="app-input__control" placeholder="Note, e.g. Cash in hand Jan 1" />
          <AppButton type="submit" :loading="savingOpening">Save Opening</AppButton>
        </form>
        <p v-if="openingError" class="error">{{ openingError }}</p>
      </AppCard>
    </template>

    <AppConfirmDialog
      :open="confirm.open"
      :message="confirm.message"
      :busy="deleting"
      @cancel="confirm.open = false"
      @confirm="doRemove"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import { useCreateLedgerEntry, useCreateLedgerHead, useDeleteLedgerEntry, useDeleteLedgerHead, useLedger, useLedgerHeads, useLedgerSummary } from '@/composables/useQueries'
import { usePagedList } from '@/composables/usePagedList'
import { useToast } from '@/composables/useToast'
import { useSchoolStore } from '@/stores/school'
import { downloadCsv } from '@/utils/pdf'

const school = useSchoolStore()
const toast = useToast()
const num = (v: unknown): number => Number(v) || 0
const fmt = (v: unknown): string => num(v).toLocaleString('en-IN')

type AccountTab = 'ledger' | 'summary' | 'heads' | 'opening'
const tab = ref<AccountTab>('ledger')
const kindFilter = ref('')
const search = ref('')
const from = ref<string | undefined>(undefined)
const to = ref<string | undefined>(undefined)
const summaryFrom = ref<string | undefined>(undefined)
const summaryTo = ref<string | undefined>(undefined)

const params = computed(() => ({
  kind: kindFilter.value || undefined,
  search: search.value || undefined,
  from: from.value,
  to: to.value,
}))
const { data, isLoading, isFetching, isError } = useLedger(params)
const rows = computed(() => data.value?.data ?? [])
const { page, perPage } = usePagedList(10)
watch([kindFilter, search, from, to], () => {
  page.value = 1
})
const pagedRows = computed(() => {
  const start = (page.value - 1) * perPage.value
  return rows.value.slice(start, start + perPage.value)
})
const pagedIn = computed(() => pagedRows.value.filter((e) => e.kind === 'income').reduce((s, e) => s + num(e.amount), 0))
const pagedOut = computed(() => pagedRows.value.filter((e) => e.kind === 'expense').reduce((s, e) => s + num(e.amount), 0))

function exportCsv(): void {
  downloadCsv(
    `ledger-${from.value || 'full'}-${to.value || 'today'}.csv`,
    ['SL', 'Date', 'Kind', 'Head', 'Amount (Tk)', 'Source', 'Note'],
    rows.value.map((e, i) => [i + 1, e.date, e.kind, e.head, num(e.amount), e.refType, e.note || '']),
  )
  toast.success(`${rows.value.length} entries exported`)
}

const sumParams = computed(() => ({ from: from.value, to: to.value }))
const { data: sumData, isLoading: sumLoading } = useLedgerSummary(sumParams)
const summary = computed(() => sumData.value?.data)

// Head-wise totals has its own period so switching tabs doesn't silently
// change the ledger's filter (or vice versa).
const summaryParams = computed(() => ({ from: summaryFrom.value, to: summaryTo.value }))
const { data: headSummaryData, isLoading: summaryLoading } = useLedgerSummary(summaryParams)
const headSummary = computed(() => headSummaryData.value?.data)
const incomeByHead = computed(() => (headSummary.value?.byHead ?? []).filter((r) => r.kind === 'income'))
const expenseByHead = computed(() => (headSummary.value?.byHead ?? []).filter((r) => r.kind === 'expense'))

// Opening count is all-time, not tied to either tab's date filter.
const { data: allSummaryData } = useLedgerSummary()
const openingCount = computed(() => (allSummaryData.value?.data.byHead ?? []).filter((r) => r.head === 'Opening Balance').reduce((s, r) => s + r.count, 0))

// Opening balance — one-time carry-forward (saved as income / Opening Balance head).
const openingForm = reactive({ amount: 0, date: '', note: '' })
const openingError = ref('')
const savingOpening = ref(false)
const { mutateAsync: createEntry } = useCreateLedgerEntry()

async function saveOpening(): Promise<void> {
  openingError.value = ''
  if (!(num(openingForm.amount) > 0)) {
    openingError.value = 'Amount must be greater than 0.'
    return
  }
  savingOpening.value = true
  try {
    await createEntry({
      kind: 'income',
      head: 'Opening Balance',
      amount: num(openingForm.amount),
      date: openingForm.date || undefined,
      note: openingForm.note.trim() || 'Opening balance carry-forward',
    })
    toast.success('Opening balance saved')
    Object.assign(openingForm, { amount: 0, date: '', note: '' })
  } catch (e) {
    openingError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    savingOpening.value = false
  }
}

// Heads manager — school-wise custom income/expense heads (separate from fee heads).
const { data: allHeadsData, isLoading: allHeadsLoading } = useLedgerHeads()
const incomeHeads = computed(() => (allHeadsData.value?.data ?? []).filter((h) => h.kind === 'income'))
const expenseHeads = computed(() => (allHeadsData.value?.data ?? []).filter((h) => h.kind === 'expense'))
const headForm = reactive({ kind: 'expense' as 'income' | 'expense', name: '' })
const headFormError = ref('')
const savingHead = ref(false)
const { mutateAsync: createHead } = useCreateLedgerHead()
const { mutateAsync: deleteHead } = useDeleteLedgerHead()

async function saveHead(): Promise<void> {
  headFormError.value = ''
  const name = headForm.name.trim()
  if (!name) {
    headFormError.value = 'Head name is required.'
    return
  }
  savingHead.value = true
  try {
    await createHead({ name, kind: headForm.kind })
    toast.success('Head saved')
    headForm.name = ''
  } catch (e) {
    headFormError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    savingHead.value = false
  }
}
async function removeHead(id: number, name: string): Promise<void> {
  confirm.value = { open: true, kind: 'head', id, message: `Delete head "${name}"?` }
}
const confirm = ref({
  open: false,
  kind: 'entry' as 'entry' | 'head',
  id: '' as string | number,
  message: '',
})
const deleting = ref(false)
const { mutateAsync: removeEntry } = useDeleteLedgerEntry()
function askRemove(id: string, head: string): void {
  confirm.value = {
    open: true,
    kind: 'entry',
    id,
    message: `Delete "${head}" entry? Auto-posted entries cannot be deleted here.`,
  }
}
async function doRemove(): Promise<void> {
  deleting.value = true
  try {
    if (confirm.value.kind === 'head') {
      await deleteHead(Number(confirm.value.id))
      toast.success('Head deleted')
    } else {
      await removeEntry(String(confirm.value.id))
      toast.success('Entry deleted')
    }
    confirm.value.open = false
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-lg);
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}
.add-entry-link {
  text-decoration: none;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}
.tab {
  height: 36px;
  padding: 0 var(--spacing-md);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
}
.tab--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-primary-contrast);
}
.muted {
  color: var(--color-text-muted);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
@media (max-width: 900px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin: 0 0 4px;
}
.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: 0;
}
.stat-value--in {
  color: var(--color-success, green);
}
.stat-value--out {
  color: var(--color-danger);
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
.num-in {
  color: var(--color-success, green);
  font-weight: var(--font-weight-semibold);
}
.num-out {
  color: var(--color-danger);
  font-weight: var(--font-weight-semibold);
}
.auto-tag {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 0 8px;
}
.row-actions-cell {
  text-align: right;
  white-space: nowrap;
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
.link-btn--danger {
  color: var(--color-danger);
}
.totals-row td {
  border-top: 2px solid var(--color-border);
  background: var(--color-background);
}
.head-hint {
  font-size: var(--font-size-sm);
  margin: 0 0 var(--spacing-md);
}
.head-form {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-sm);
}
.head-form .app-input__control {
  flex: 1;
  min-width: 200px;
}
.head-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}
@media (max-width: 900px) {
  .head-cols {
    grid-template-columns: 1fr;
  }
}
.head-col-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 var(--spacing-xs);
}
.head-col-title--in {
  color: var(--color-success, green);
}
.head-col-title--out {
  color: var(--color-danger);
}
.head-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.head-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
</style>
