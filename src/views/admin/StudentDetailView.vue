<template>
  <div class="page">
    <RouterLink to="/admin/students" class="back">‹ Back to students</RouterLink>
    <p v-if="isLoading" class="muted">Loading…</p>
    <p v-else-if="isError || !student" class="error">Student not found.</p>
    <template v-else>
      <div class="detail-head">
        <span class="detail-head__id">
          <StudentAvatar :photo-url="student.photoUrl" :name="student.name" :gender="student.gender" :size="56" />
          <h1 class="page__title">{{ student.name }}</h1>
        </span>
        <div class="detail-head__links">
          <RouterLink :to="{ path: `/admin/attendance/student/${student.id}`, query: { name: student.name } }" class="edit-link">Attendance history</RouterLink>
          <RouterLink :to="`/admin/students/${student.id}/edit`" class="edit-link">Edit</RouterLink>
        </div>
      </div>
      <div class="grid">
        <AppCard title="Profile">
          <dl class="kv">
            <div><dt>Gender</dt><dd class="gender-text">{{ student.gender || '—' }}</dd></div>
            <div><dt>Roll</dt><dd>{{ student.roll }}</dd></div>
            <div><dt>Card ID</dt><dd>{{ student.cardId || '—' }}</dd></div>
            <div><dt>Class</dt><dd>{{ classLabel(student.classId) }}</dd></div>
            <div v-if="student.departmentId"><dt>Department</dt><dd>{{ deptLabel(student.departmentId) }}</dd></div>
            <div><dt>Phone</dt><dd>{{ student.phone || '—' }}</dd></div>
            <div><dt>Address</dt><dd>{{ student.address || '—' }}</dd></div>
            <div><dt>Date of birth</dt><dd>{{ student.dateOfBirth || '—' }}</dd></div>
            <div><dt>Previous institute</dt><dd>{{ student.instituteName || '—' }}</dd></div>
            <div><dt>Status</dt><dd>{{ student.status }}</dd></div>
          </dl>
        </AppCard>
        <AppCard title="Guardian">
          <dl class="kv">
            <div><dt>Name</dt><dd>{{ student.guardianName || '—' }}</dd></div>
            <div><dt>Phone</dt><dd>{{ student.guardianPhone || '—' }}</dd></div>
            <div><dt>Phone 2</dt><dd>{{ student.guardianPhone2 || '—' }}</dd></div>
          </dl>
        </AppCard>
        <AppCard title="Subjects">
          <div v-if="subjectLabels.length" class="chip-row">
            <span v-for="label in subjectLabels" :key="label" class="chip">{{ label }}</span>
          </div>
          <p v-else class="muted">No subjects recorded.</p>
        </AppCard>
        <AppCard title="Fees">
          <dl class="kv">
            <div><dt>Total</dt><dd>৳{{ student.totalAmount }}</dd></div>
            <div><dt>Paid</dt><dd>৳{{ student.paidAmount }}</dd></div>
            <div><dt>Due</dt><dd class="due">৳{{ student.dueAmount }}</dd></div>
          </dl>
          <div v-if="feeDueRows.length" class="breakdown">
            <div v-for="row in feeDueRows" :key="row.key" class="breakdown__row">
              <span>{{ row.label }}<em v-if="row.dueFor" class="duefor"> · {{ row.dueFor.slice(0, 7) }}</em></span><span>৳{{ row.amount }}</span>
            </div>
          </div>
        </AppCard>
      </div>
      <AppCard title="Payment History">
        <p v-if="payLoading" class="muted">Loading…</p>
        <table v-else class="table">
          <thead>
            <tr><th>Receipt</th><th>Type</th><th>Paid (৳)</th><th>Date</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in payments" :key="p.id">
              <td>{{ p.receiptNumber }}</td>
              <td><span :title="typeTitle(p)">{{ typeLabel(p) }}</span></td>
              <td>{{ p.paid }}</td>
              <td>{{ p.paymentDate }}</td>
            </tr>
            <tr v-if="payments.length === 0">
              <td colspan="4" class="muted">No payments yet.</td>
            </tr>
          </tbody>
        </table>
      </AppCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppCard from '@/components/common/AppCard.vue'
import StudentAvatar from '@/components/common/StudentAvatar.vue'
import { useClasses, useDepartments, useStudent, useStudentPayments } from '@/composables/useQueries'
import { receiptTypeLabel, receiptTypeTitle } from '@/utils/paymentLabels'
import type { Payment } from '@/types/models'

const route = useRoute()
const id = computed(() => String(route.params.id ?? ''))

const { data, isLoading, isError } = useStudent(id)
const student = computed(() => data.value?.data)

const { data: classData } = useClasses()
const classLabel = (classId: string): string =>
  classData.value?.data.find((c) => c.id === classId)?.label ?? classId

const { data: deptData } = useDepartments(() => student.value?.classId || undefined)
const deptLabel = (id: string): string =>
  deptData.value?.data.find((d) => d.id === id)?.label ?? '—'

const { data: payData, isLoading: payLoading } = useStudentPayments(id)
const payments = computed(() => payData.value?.data ?? [])
function typeLabel(p: Payment): string {
  return receiptTypeLabel(p, (t) => t)
}
function typeTitle(p: Payment): string {
  return receiptTypeTitle(p, (t) => t)
}
const subjectLabels = computed(() => Object.keys(student.value?.subjects ?? {}))
const feeDueRows = computed(() => {
  const dues = (student.value?.feeDues ?? []) as { name: string; amount: number; dueFor?: string }[]
  if (dues.length > 0) {
    return dues.map((d) => ({
      key: `${d.name}||${d.dueFor || ''}`,
      label: d.name,
      dueFor: d.dueFor || '',
      amount: Number(d.amount) || 0,
    }))
  }
  return Object.entries(student.value?.feeBreakdown ?? {}).map(([label, amount]) => ({
    key: label,
    label,
    dueFor: '',
    amount: Number(amount) || 0,
  }))
})
</script>

<style scoped>
.back {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: var(--spacing-sm) 0 var(--spacing-lg);
}
.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.detail-head__id {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}
.detail-head__id .page__title {
  margin: 0;
}
.detail-head__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}
.edit-link {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
}
.muted {
  color: var(--color-text-muted);
}
.duefor {
  font-style: normal;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}
.error {
  color: var(--color-danger);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
.kv {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
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
.gender-text {
  text-transform: capitalize;
}
.breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-sm);
}
.breakdown__row {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--spacing-xs);
}
.due {
  font-weight: var(--font-weight-bold);
  color: var(--color-warning);
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
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}
.chip {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  font-size: var(--font-size-xs);
}
</style>
