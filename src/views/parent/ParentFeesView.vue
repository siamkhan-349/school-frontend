<template>
  <div class="page">
    <h1 class="page__title">Fees</h1>
    <AppCard>
      <FilterPanel>
        <select v-model="childId" class="app-input__control">
          <option v-for="c in children" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </FilterPanel>
      <template v-if="child">
        <dl class="kv">
          <div><dt>Total</dt><dd>৳{{ child.totalAmount }}</dd></div>
          <div><dt>Paid</dt><dd>৳{{ child.paidAmount }}</dd></div>
          <div><dt>Due</dt><dd class="due">৳{{ child.dueAmount }}</dd></div>
        </dl>
        <AppSkeleton v-if="paymentsLoading" variant="table" :rows="4" :cols="4" />
        <table v-else class="table">
          <thead>
            <tr><th>Receipt</th><th>Type</th><th>Paid (৳)</th><th>Date</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in payments" :key="p.id">
              <td>{{ p.receiptNumber }}</td>
              <td>{{ p.feeName || p.feeType }}</td>
              <td>{{ p.paid }}</td>
              <td>{{ p.paymentDate }}</td>
            </tr>
            <tr v-if="payments.length === 0">
              <td colspan="4" class="muted">No payments yet.</td>
            </tr>
          </tbody>
        </table>
      </template>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import { useStudentPayments, useStudents } from '@/composables/useQueries'

const { data: studentData } = useStudents({ perPage: 500 })
const children = computed(() => studentData.value?.data.items ?? [])
const childId = ref('')
watch(children, (list) => {
  if (!childId.value && list.length > 0) childId.value = list[0]?.id ?? ''
}, { immediate: true })

const child = computed(() => children.value.find((c) => c.id === childId.value))
const { data: payData, isLoading: paymentsLoading } = useStudentPayments(() => childId.value)
const payments = computed(() => payData.value?.data ?? [])
</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-lg);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.kv {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-md);
}
.kv div {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--spacing-xs);
}
.kv dt {
  color: var(--color-text-muted);
}
.due {
  font-weight: var(--font-weight-bold);
  color: var(--color-warning);
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
@media (max-width: 640px) {
  .table th,
  .table td {
    padding: var(--spacing-xs) var(--spacing-sm);
  }
}
</style>
