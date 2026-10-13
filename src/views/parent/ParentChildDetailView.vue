<template>
  <div class="page">
    <RouterLink to="/parent/children" class="back">‹ Back to children</RouterLink>
    <p v-if="studentLoading" class="muted">Loading…</p>
    <p v-else-if="!student" class="error">Student not found.</p>
    <template v-else>
      <div class="title-row">
        <StudentAvatar :photo-url="student.photoUrl" :name="student.name" :gender="student.gender" :size="48" />
        <h1 class="page__title">{{ student.name }}</h1>
      </div>
      <div class="grid">
        <AppCard title="Profile">
          <dl class="kv">
            <div><dt>Roll</dt><dd>{{ student.roll }}</dd></div>
            <div><dt>Class</dt><dd>{{ classLabel }}</dd></div>
            <div><dt>Total</dt><dd>৳{{ student.totalAmount }}</dd></div>
            <div><dt>Paid</dt><dd>৳{{ student.paidAmount }}</dd></div>
            <div><dt>Due</dt><dd>৳{{ student.dueAmount }}</dd></div>
          </dl>
        </AppCard>
        <AppCard title="Published Results">
          <p v-if="resultsLoading" class="muted">Loading…</p>
          <table v-else class="table">
            <thead>
              <tr><th>Exam</th><th>Marks</th><th>Grade</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in results" :key="r.examId">
                <td>{{ r.examName }}</td>
                <td>{{ r.marksObtained }}/{{ r.fullMarks }}</td>
                <td><span class="chip">{{ r.grade }}</span></td>
              </tr>
              <tr v-if="results.length === 0">
                <td colspan="3" class="muted">No published results yet.</td>
              </tr>
            </tbody>
          </table>
        </AppCard>
      </div>
      <AppCard title="Payment History">
        <table class="table">
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
      </AppCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppCard from '@/components/common/AppCard.vue'
import StudentAvatar from '@/components/common/StudentAvatar.vue'
import {
  useClasses,
  useParentResults,
  useStudent,
  useStudentPayments,
} from '@/composables/useQueries'

const route = useRoute()
const id = computed(() => String(route.params.id ?? ''))

const { data: studentData, isLoading: studentLoading } = useStudent(id)
const student = computed(() => studentData.value?.data)
const { data: classData } = useClasses()
const classLabel = computed(
  () => classData.value?.data.find((c) => c.id === student.value?.classId)?.label ?? '',
)
const { data: resultsData, isLoading: resultsLoading } = useParentResults(id)
const results = computed(() => resultsData.value?.data ?? [])
const { data: payData } = useStudentPayments(id)
const payments = computed(() => payData.value?.data ?? [])
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
.title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}
.title-row .page__title {
  margin: 0;
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
.chip {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  font-size: var(--font-size-xs);
}
</style>
