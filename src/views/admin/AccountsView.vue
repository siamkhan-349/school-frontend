<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Accounts — School Fund</h1>
        <p class="muted">Money INTO school / OUT of school. Fee collection and salary payment post here automatically.</p>
      </div>
      <AppButton type="button" @click="form.open = true">+ Add Entry</AppButton>
    </div>

    <div class="cards">
      <AppCard><p class="stat-label">Total In</p><p class="stat-value stat-value--in">৳{{ fmt(summary?.totalIn) }}</p></AppCard>
      <AppCard><p class="stat-label">Total Out</p><p class="stat-value stat-value--out">৳{{ fmt(summary?.totalOut) }}</p></AppCard>
      <AppCard><p class="stat-label">Balance</p><p class="stat-value">৳{{ fmt(summary?.balance) }}</p></AppCard>
    </div>

    <AppCard>
      <FilterPanel>
        <select v-model="kindFilter" class="app-input__control">
          <option value="">All</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <input type="date" class="app-input__control" title="From" :value="from" @change="from = ($event.target as HTMLInputElement).value || undefined" />
        <input type="date" class="app-input__control" title="To" :value="to" @change="to = ($event.target as HTMLInputElement).value || undefined" />
        <input v-model="search" class="app-input__control" placeholder="Search head / note…" />
      </FilterPanel>

      <p v-if="isLoading" class="muted">Loading…</p>
      <p v-else-if="isError" class="error">Failed to load ledger.</p>
      <table v-else class="table">
        <thead>
          <tr><th>Date</th><th>Head</th><th>In (৳)</th><th>Out (৳)</th><th>Note</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="e in rows" :key="e.id">
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
          <tr v-if="!rows.length">
            <td colspan="6" class="muted">No entries yet.</td>
          </tr>
        </tbody>
        <tfoot v-if="rows.length">
          <tr class="totals-row">
            <td colspan="2"><strong>Total</strong></td>
            <td><strong>{{ fmt(pageIn) }}</strong></td>
            <td><strong>{{ fmt(pageOut) }}</strong></td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </AppCard>

    <Teleport to="body">
      <div v-if="form.open" class="modal-backdrop" @click.self="form.open = false">
        <div class="modal modal--sm" role="dialog" aria-modal="true">
          <h3 class="modal__title">Add {{ form.kind === 'income' ? 'Income' : 'Expense' }}</h3>
          <form class="form" @submit.prevent="saveEntry">
            <div class="kind-tabs" role="tablist" aria-label="Entry type">
              <button type="button" :class="['kind-tab', { 'kind-tab--active': form.kind === 'income' }]" @click="form.kind = 'income'; form.head = ''">Income</button>
              <button type="button" :class="['kind-tab', { 'kind-tab--active': form.kind === 'expense' }]" @click="form.kind = 'expense'; form.head = ''">Expense</button>
            </div>
            <label>Head
              <select v-model="form.head" class="app-input__control" required>
                <option value="">Select head…</option>
                <option v-for="h in headOptions" :key="h.id" :value="h.name">{{ h.name }}</option>
                <option value="__custom">Other (type below)…</option>
              </select>
            </label>
            <label v-if="form.head === '__custom'">Custom head<input v-model="form.customHead" class="app-input__control" placeholder="Enter head name" required /></label>
            <label>Amount (৳)<input v-model.number="form.amount" type="number" min="0" step="0.01" class="app-input__control" required /></label>
            <label>Date<input v-model="form.date" type="date" class="app-input__control" /></label>
            <label>Note<input v-model="form.note" class="app-input__control" placeholder="Optional note" /></label>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="form-actions">
              <AppButton variant="ghost" type="button" @click="form.open = false">Cancel</AppButton>
              <AppButton type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</AppButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

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
import { computed, reactive, ref } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import { useCreateLedgerEntry, useDeleteLedgerEntry, useLedger, useLedgerHeads, useLedgerSummary } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const num = (v: unknown): number => Number(v) || 0
const fmt = (v: unknown): string => num(v).toLocaleString('en-IN')
const todayStr = (): string => new Date().toISOString().slice(0, 10)

const kindFilter = ref('')
const search = ref('')
const from = ref<string | undefined>(undefined)
const to = ref<string | undefined>(undefined)

const params = computed(() => ({
  kind: kindFilter.value || undefined,
  search: search.value || undefined,
  from: from.value,
  to: to.value,
}))
const { data, isLoading, isError } = useLedger(params)
const rows = computed(() => data.value?.data ?? [])
const pageIn = computed(() => rows.value.filter((e) => e.kind === 'income').reduce((s, e) => s + num(e.amount), 0))
const pageOut = computed(() => rows.value.filter((e) => e.kind === 'expense').reduce((s, e) => s + num(e.amount), 0))

const sumParams = computed(() => ({ from: from.value, to: to.value }))
const { data: sumData } = useLedgerSummary(sumParams)
const summary = computed(() => sumData.value?.data)

const form = reactive({
  open: false,
  kind: 'expense' as 'income' | 'expense',
  head: '', customHead: '', amount: 0, date: todayStr(), note: '',
})
const { data: headData } = useLedgerHeads(() => form.kind)
const headOptions = computed(() => headData.value?.data ?? [])
const formError = ref('')
const saving = ref(false)
const { mutateAsync: createEntry } = useCreateLedgerEntry()

async function saveEntry(): Promise<void> {
  formError.value = ''
  const head = form.head === '__custom' ? form.customHead.trim() : form.head
  if (!head) {
    formError.value = 'Head is required.'
    return
  }
  if (!(num(form.amount) > 0)) {
    formError.value = 'Amount must be greater than 0.'
    return
  }
  saving.value = true
  try {
    await createEntry({
      kind: form.kind,
      head,
      amount: num(form.amount),
      date: form.date || undefined,
      note: form.note.trim() || undefined,
    })
    toast.success(form.kind === 'income' ? 'Income saved' : 'Expense saved')
    Object.assign(form, { open: false, head: '', customHead: '', amount: 0, date: todayStr(), note: '' })
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

const confirm = ref({ open: false, id: '', message: '' })
const deleting = ref(false)
const { mutateAsync: removeEntry } = useDeleteLedgerEntry()
function askRemove(id: string, head: string): void {
  confirm.value = { open: true, id, message: `Delete "${head}" entry? Auto-posted entries cannot be deleted here.` }
}
async function doRemove(): Promise<void> {
  deleting.value = true
  try {
    await removeEntry(confirm.value.id)
    toast.success('Entry deleted')
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
  margin-bottom: var(--spacing-lg);
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
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
  grid-template-columns: repeat(3, 1fr);
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
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(16, 24, 40, 0.45);
  display: grid;
  place-items: center;
  z-index: 60;
  padding: var(--spacing-lg);
}
.modal--sm {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-lg);
  width: min(440px, 100%);
}
.modal__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-md);
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.form label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.kind-tabs {
  display: inline-flex;
  gap: 4px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 4px;
  align-self: flex-start;
}
.kind-tab {
  background: none;
  border: none;
  padding: 6px 14px;
  font: inherit;
  font-size: var(--font-size-sm);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  cursor: pointer;
}
.kind-tab--active {
  background: var(--color-surface);
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
  box-shadow: var(--shadow-sm);
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}
</style>
