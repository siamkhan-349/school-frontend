<template>
  <div class="report">
    <div class="report__toolbar no-print">
      <RouterLink :to="`/admin/exams/${examId}`" class="back">‹ Back</RouterLink>
      <div class="report__actions">
        <AppButton variant="ghost" @click="downloadPdf">PDF</AppButton>
        <AppButton @click="print">Print Report Card</AppButton>
      </div>
    </div>

    <p v-if="loading" class="muted">Loading…</p>
    <p v-else-if="!exam || !student || !row" class="error">Record not found.</p>
    <div v-else class="sheet">
      <header class="sheet__head">
        <h2>{{ settings?.schoolName ?? 'School' }}</h2>
        <p class="muted">{{ settings?.address ?? '' }} · {{ settings?.phone ?? '' }}</p>
        <h3>Report Card — {{ exam.name }}</h3>
      </header>
      <dl class="kv">
        <div><dt>Student</dt><dd>{{ student.name }}</dd></div>
        <div><dt>Roll</dt><dd>{{ student.roll }}</dd></div>
        <div><dt>Class</dt><dd>{{ classLabel }}</dd></div>
        <div><dt>Exam Date</dt><dd>{{ exam.examDate }}</dd></div>
      </dl>
      <table class="table">
        <thead>
          <tr><th>Subject</th><th>CQ</th><th>MCQ</th><th>Total</th><th>Grade</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr v-for="s in row.subjects" :key="s.subjectId">
            <td>{{ s.name }}</td>
            <td>{{ showCq(s) }}</td>
            <td>{{ showMcq(s) }}</td>
            <td>{{ s.total }}/{{ s.full }}</td>
            <td>{{ s.grade }}</td>
            <td>{{ s.absent ? 'Absent' : s.passed ? 'Pass' : 'Fail' }}</td>
          </tr>
        </tbody>
      </table>
      <dl class="kv">
        <div><dt>Total</dt><dd>{{ row.total }}/{{ fullMarks }}</dd></div>
        <div><dt>Percentage</dt><dd>{{ row.percentage }}%</dd></div>
        <div><dt>Grade</dt><dd>{{ row.grade }}</dd></div>
        <div><dt>Rank</dt><dd>{{ row.rank }}/{{ totalStudents }}</dd></div>
      </dl>
      <p class="muted">Status: {{ row.passed ? 'Passed' : 'Failed' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import { useClasses, useExam, useExamResults, useSettings, useStudent } from '@/composables/useQueries'
import { printWithTitle } from '@/utils/print'
import { reportCardPdf } from '@/utils/pdf'
import type { ExamResultSubjectRow } from '@/services'

const route = useRoute()
const examId = computed(() => String(route.params.id ?? ''))
const studentId = computed(() => String(route.params.studentId ?? ''))

const { data: examData, isLoading: examLoading } = useExam(examId)
const exam = computed(() => examData.value?.data)
const { data: studentData, isLoading: studentLoading } = useStudent(studentId)
const student = computed(() => studentData.value?.data)
const { data: resultsData, isLoading: resultsLoading } = useExamResults(examId)
const { data: classData } = useClasses()
const { data: settingsData } = useSettings()
const settings = computed(() => settingsData.value?.data)

const loading = computed(() => examLoading.value || studentLoading.value || resultsLoading.value)
const classLabel = computed(
  () => classData.value?.data.find((c) => c.id === student.value?.classId)?.label ?? '',
)
const row = computed(() => resultsData.value?.data.rows.find((r) => r.studentId === studentId.value))
const fullMarks = computed(() => resultsData.value?.data.fullMarks ?? 0)
const totalStudents = computed(() => resultsData.value?.data.rows.length ?? 0)

const showCq = (s: ExamResultSubjectRow): string => {
  const sub = exam.value?.subjects.find((x) => x.id === s.subjectId)
  return sub?.hasSplit ? String(s.cq) : '—'
}
const showMcq = (s: ExamResultSubjectRow): string => {
  const sub = exam.value?.subjects.find((x) => x.id === s.subjectId)
  return sub?.hasSplit ? String(s.mcq) : '—'
}

function print(): void {
  const who = student.value?.name ?? ''
  const what = exam.value?.name ?? ''
  printWithTitle([ 'Report Card', who, what ].filter(Boolean).join(' - ') || 'Report Card')
}
function downloadPdf(): void {
  if (!exam.value || !student.value || !row.value) return
  reportCardPdf({
    schoolName: settings.value?.schoolName ?? 'School',
    address: settings.value?.address ?? '',
    phone: settings.value?.phone ?? '',
    examName: exam.value.name,
    studentName: student.value.name,
    roll: String(student.value.roll ?? '—'),
    classLabel: classLabel.value,
    examDate: exam.value.examDate,
    fullMarks: Number(fullMarks.value ?? 0),
    obtained: row.value.total,
    grade: row.value.grade,
    rank: `${row.value.rank}/${totalStudents.value}`,
    status: row.value.passed ? 'Passed' : 'Failed',
    lines: row.value.subjects.map((s) => ({ name: s.name, total: s.total, full: s.full, grade: s.grade })),
  })
}
</script>

<style scoped>
.report {
  max-width: var(--form-max-width);
  margin: 0 auto;
  padding: var(--spacing-lg);
}
.report__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}
.report__actions {
  display: flex;
  gap: var(--spacing-sm);
}
.back {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
}
.sheet {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.sheet__head {
  text-align: center;
}
.kv {
  display: grid;
  grid-template-columns: 1fr 1fr;
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
}
.table th,
.table td {
  text-align: left;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
}
@media print {
  .report__toolbar,
  .no-print,
  .app-shell__sidebar,
  .app-shell__topbar {
    display: none !important;
  }
  .report {
    max-width: none;
    padding: 0;
  }
  .sheet {
    border: none;
    box-shadow: none;
  }
}
</style>
