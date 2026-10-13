<template>
  <div class="page">
    <div class="page__head">
      <h1 class="page__title">Payment History</h1>
      <div class="page__actions">
        <RouterLink to="/admin/fees/collect" class="link-btn">+ Collect</RouterLink>
        <RouterLink to="/admin/payments/bulk" class="link-btn">Bulk import</RouterLink>
      </div>
    </div>
    <AppCard>
      <FilterPanel>
        <input v-model="search" class="app-input__control" placeholder="Search student / receipt…" />
        <input v-model="feeType" class="app-input__control" placeholder="Fee name…" />
        <select v-model="status" class="app-input__control">
          <option value="">All statuses</option>
          <option value="paid">paid</option>
          <option value="partial">partial</option>
          <option value="pending">pending</option>
          <option value="cancelled">cancelled</option>
        </select>
        <input v-model="from" type="date" class="app-input__control" />
        <input v-model="to" type="date" class="app-input__control" />
        <AppButton variant="ghost" type="button" @click="resetFilters">Reset</AppButton>
      </FilterPanel>
      <p v-if="isLoading" class="muted">Loading…</p>
      <table v-else class="table">
        <thead>
          <tr><th>Receipt</th><th>Student</th><th>Fee</th><th><button class="sort-btn" type="button" @click="toggleOrder('amount')">Amount{{ orderArrow('amount') }}</button></th><th>Paid</th><th>Method</th><th><button class="sort-btn" type="button" @click="toggleOrder('payment_date')">Date{{ orderArrow('payment_date') }}</button></th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="p in rows" :key="p.id">
            <td>{{ p.receiptNumber }}</td>
            <td>{{ p.studentName }}</td>
            <td><span :title="typeTitle(p)">{{ typeLabel(p) }}</span></td>
            <td>৳{{ p.amount }}</td>
            <td>৳{{ p.paid }}</td>
            <td>{{ p.paymentMethod || '—' }}</td>
            <td>{{ p.paymentDate }}</td>
            <td class="row-actions">
              <RouterLink :to="`/admin/payments/${p.id}`" class="link-btn">Receipt</RouterLink>
              <button class="link-btn link-btn--danger" type="button" @click="askDelete(p.id, p.receiptNumber)">Delete</button>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="8" class="muted">No payments yet.</td>
          </tr>
        </tbody>
      </table>

      <AppPagination v-model:page="page" v-model:per-page="perPage" :total="total" />
    </AppCard>

    <AppConfirmDialog
      :open="confirm.open"
      :message="confirm.message"
      :busy="deleting"
      @cancel="confirm.open = false"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import { useDeletePayment, usePayments } from '@/composables/useQueries'
import { usePagedList } from '@/composables/usePagedList'
import { useToast } from '@/composables/useToast'
import { receiptTypeLabel, receiptTypeTitle } from '@/utils/paymentLabels'
import type { Payment } from '@/types/models'

const toast = useToast()
const { page, perPage } = usePagedList(15)
const search = ref('')
const feeType = ref('')
const status = ref('')
const from = ref('')
const to = ref('')
const ordering = ref('-payment_date')
watch([search, feeType, status, from, to], () => {
  page.value = 1
})

function toggleOrder(field: 'payment_date' | 'amount'): void {
  ordering.value = ordering.value === field ? `-${field}` : field
  page.value = 1
}

function orderArrow(field: 'payment_date' | 'amount'): string {
  if (ordering.value === field) return ' ▲'
  if (ordering.value === `-${field}`) return ' ▼'
  return ''
}

function resetFilters(): void {
  search.value = ''
  feeType.value = ''
  status.value = ''
  from.value = ''
  to.value = ''
}

function headLabel(name: string): string {
  return name
}
function typeLabel(p: Payment): string {
  return receiptTypeLabel(p, headLabel)
}
function typeTitle(p: Payment): string {
  return receiptTypeTitle(p, headLabel)
}

const params = computed(() => ({
  search: search.value || undefined,
  feeType: feeType.value || undefined,
  status: status.value || undefined,
  from: from.value || undefined,
  to: to.value || undefined,
  ordering: ordering.value || undefined,
  page: page.value,
  perPage: perPage.value,
}))
const { data, isLoading } = usePayments(params)
const rows = computed(() => data.value?.data.items ?? [])
const total = computed(() => data.value?.data.pagination.total ?? 0)

const confirm = ref({ open: false, id: '', message: '' })
const deleting = ref(false)
const { mutateAsync: deletePayment } = useDeletePayment()

function askDelete(id: string, receipt: string): void {
  confirm.value = { open: true, id, message: `Delete payment "${receipt}"? Student due will recalculate.` }
}

async function doDelete(): Promise<void> {
  deleting.value = true
  try {
    await deletePayment(confirm.value.id)
    toast.success('Payment deleted')
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
  align-items: center;
  margin-bottom: var(--spacing-lg);
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}
.page__actions {
  display: flex;
  gap: var(--spacing-md);
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
  white-space: nowrap;
}
.link-btn {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  margin-left: var(--spacing-sm);
}
.link-btn--danger {
  color: var(--color-danger);
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
</style>
