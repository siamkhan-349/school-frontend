<template>
  <div class="page">
    <h1 class="page__title">My Salary</h1>
    <p v-if="meLoading" class="muted">Loading…</p>
    <p v-else-if="!teacher" class="error">
      No teacher/staff profile is linked to this login. Ask the admin to link one from Users.
    </p>
    <template v-else>
      <div class="stat-grid">
        <AppCard><p class="stat-label">Total Received</p><p class="stat-value">৳{{ totalPaid }}</p></AppCard>
        <AppCard><p class="stat-label">Pending</p><p class="stat-value">৳{{ totalPending }}</p></AppCard>
        <AppCard><p class="stat-label">Last Payment</p><p class="stat-value">{{ lastPayment }}</p></AppCard>
      </div>
      <AppCard title="Salary History">
        <div class="table-scroll">
          <table class="table">
            <thead>
              <tr><th>Month</th><th>Basic</th><th>Allowance</th><th>Deduction</th><th>Net</th><th>Status</th><th>Paid on</th></tr>
            </thead>
            <tbody>
              <tr v-for="s in mySalaries" :key="s.id">
                <td>{{ s.month }}/{{ s.year }}</td>
                <td>৳{{ s.basic }}</td>
                <td>৳{{ s.allowance }}</td>
                <td>৳{{ s.deduction }}</td>
                <td><strong>৳{{ s.net }}</strong></td>
                <td>
                  <span class="pill" :class="`pill--${s.status}`">{{ s.status }}</span>
                </td>
                <td>{{ s.paymentDate || '—' }}</td>
              </tr>
              <tr v-if="mySalaries.length === 0">
                <td colspan="7" class="muted">No salary records yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/common/AppCard.vue'
import { useMyTeacher, useSalaries } from '@/composables/useQueries'

const { data: meData, isLoading: meLoading } = useMyTeacher()
const teacher = computed(() => meData.value?.data)
const teacherId = computed(() => teacher.value?.id ?? '')

const { data: salariesData } = useSalaries()
const mySalaries = computed(() =>
  (salariesData.value?.data ?? []).filter((s) => s.teacherId === teacherId.value),
)
const paid = computed(() => mySalaries.value.filter((s) => s.status === 'paid'))
const totalPaid = computed(() => paid.value.reduce((sum, s) => sum + (Number(s.net) || 0), 0))
const totalPending = computed(() =>
  mySalaries.value
    .filter((s) => s.status !== 'paid')
    .reduce((sum, s) => sum + (Number(s.net) || 0), 0),
)
const lastPayment = computed(() => {
  const dates = paid.value.map((s) => s.paymentDate || '').filter(Boolean).sort()
  return dates.length > 0 ? dates[dates.length - 1] : '—'
})
</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-xs);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
  margin: var(--spacing-md) 0;
}
@media (max-width: 640px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }
}
.stat-label {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin: 0 0 4px;
}
.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: 0;
}
.table-scroll {
  overflow-x: auto;
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
  white-space: nowrap;
}
.pill {
  display: inline-block;
  padding: 1px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: capitalize;
}
.pill--paid {
  background: var(--color-success-light);
  color: var(--color-success);
}
.pill--pending,
.pill--approved {
  background: var(--color-warning-light);
  color: var(--color-warning);
}
</style>
