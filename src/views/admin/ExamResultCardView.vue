<template>
  <div class="print-view">
    <header class="page-header">
      <div>
        <h1 class="page-header__title">Result Card</h1>
        <p class="page-header__subtitle">Full exam result sheet — printable.</p>
      </div>
      <div class="header-actions">
        <RouterLink :to="backTarget" class="back">‹ Back</RouterLink>
        <AppButton @click="handlePrint">Print / Save as PDF</AppButton>
      </div>
    </header>

    <p v-if="loading" class="muted">Loading…</p>
    <p v-else-if="!exam" class="error">Exam not found.</p>

    <AppCard v-else class="report-card">
      <header class="report-card__head">
        <div>
          <h2 class="report-card__school">{{ settings?.schoolName ?? 'School' }}</h2>
          <p class="report-card__report">{{ exam.name }}</p>
        </div>
        <span class="badge" :class="`badge--${exam.status}`">{{ exam.status }}</span>
      </header>

      <div class="report-card__meta">
        <span>Class: {{ classLabel }}</span>
        <span v-if="sectionLabel">Section: {{ sectionLabel }}</span>
        <span>Exam date: {{ exam.examDate }}</span>
        <span>Full marks: {{ fullMarks }}</span>
        <span>Pass: {{ summary.passed }}/{{ summary.students }} ({{ summary.passRate }}%)</span>
      </div>

      <div class="report-card__table">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Roll</th>
              <th scope="col">Student</th>
              <th v-for="s in subjects" :key="s.id" scope="col" class="subject-head">
                {{ s.name }}
                <span class="subject-head__meta">{{ subjectPassLabel(s) }}</span>
              </th>
              <th scope="col">Total</th>
              <th scope="col">Out of</th>
              <th scope="col">%</th>
              <th scope="col">Grade</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.studentId">
              <td>{{ row.rank }}</td>
              <td>{{ row.roll ?? '—' }}</td>
              <td class="name-cell">{{ row.studentName }}</td>
              <td
                v-for="s in subjects"
                :key="s.id"
                class="subject-cell"
                :class="{ 'subject-cell--fail': isFail(row, s.id) }"
              >
                <span class="subject-cell__score">{{ cellText(row, s.id) }}</span>
                <span class="subject-cell__split">{{ cellSplit(row, s.id) }}</span>
              </td>
              <td>{{ row.total }}</td>
              <td>{{ fullMarks }}</td>
              <td>{{ row.percentage }}%</td>
              <td>{{ row.grade }}</td>
              <td>
                <span class="verdict" :class="row.passed ? 'verdict--pass' : 'verdict--fail'">
                  {{ row.passed ? 'Pass' : 'Fail' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="report-card__foot">
        <span>Pass rate: {{ summary.passRate }}%</span>
        <span>Generated on {{ generatedOn }}</span>
      </footer>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import {
  useClasses,
  useExam,
  useExamResults,
  useSections,
  useSettings,
} from '@/composables/useQueries'
import { printWithTitle } from '@/utils/print'
import type { ExamResultRow } from '@/services'
import type { ExamSubject } from '@/types/models'

const route = useRoute()
const examId = computed(() => String(route.params.id ?? ''))
const backTarget = computed(() =>
  String(route.query.from ?? '') === 'results' ? '/admin/results' : `/admin/exams/${examId.value}/merit`,
)

const { data: examData, isLoading: examLoading } = useExam(examId)
const exam = computed(() => examData.value?.data)
const { data: resultsData, isLoading: resultsLoading } = useExamResults(examId)
const { data: classData } = useClasses()
const { data: sectionData } = useSections(() => exam.value?.classId || undefined)
const { data: settingsData } = useSettings()
const settings = computed(() => settingsData.value?.data)

const loading = computed(() => examLoading.value || resultsLoading.value)
const rows = computed(() => resultsData.value?.data.rows ?? [])
const subjects = computed(() => exam.value?.subjects ?? [])
const fullMarks = computed(() => resultsData.value?.data.fullMarks ?? 0)
const summary = computed(
  () => resultsData.value?.data.summary ?? { students: 0, passed: 0, failed: 0, passRate: 0 },
)
const classLabel = computed(
  () => classData.value?.data.find((c) => c.id === exam.value?.classId)?.label ?? '',
)
const sectionLabel = computed(
  () => sectionData.value?.data.find((s) => s.id === exam.value?.sectionId)?.label ?? '',
)
const generatedOn = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date())

const cellOf = (row: ExamResultRow, subjectId: string) =>
  row.subjects.find((s) => s.subjectId === subjectId)

// Exactly the bars set at exam creation — separate shows each of CQ/MCQ/Total
function subjectPassLabel(s: ExamSubject): string {
  const cqFull = Number(s.cqFull) || 0
  const mcqFull = Number(s.mcqFull) || 0
  if (cqFull + mcqFull <= 0) return `Pass ${s.passMarks}/${s.fullMarks}`
  if (s.passRule === 'combine') return `Total ${s.passMarks}/${s.fullMarks}`
  const parts: string[] = []
  if (cqFull > 0) parts.push(`CQ ${s.cqPass}/${cqFull}`)
  if (mcqFull > 0) parts.push(`MCQ ${s.mcqPass}/${mcqFull}`)
  return parts.join(' • ')
}

function cellText(row: ExamResultRow, subjectId: string): string {
  const c = cellOf(row, subjectId)
  if (!c) return '—'
  if (c.absent) return 'Abs'
  return `${c.total}/${c.full}`
}

function cellSplit(row: ExamResultRow, subjectId: string): string {
  const c = cellOf(row, subjectId)
  if (!c || c.absent) return ''
  const parts: string[] = []
  if ((c.cq ?? 0) > 0 || hasSplit(subjectId, 'cq')) parts.push(`CQ ${c.cq}`)
  if ((c.mcq ?? 0) > 0 || hasSplit(subjectId, 'mcq')) parts.push(`MCQ ${c.mcq}`)
  return parts.join(' • ')
}

function hasSplit(subjectId: string, which: 'cq' | 'mcq'): boolean {
  const sub = subjects.value.find((s) => s.id === subjectId)
  if (!sub) return false
  if (which === 'cq') return (Number(sub.cqFull) || 0) > 0
  return (Number(sub.mcqFull) || 0) > 0
}

function isFail(row: ExamResultRow, subjectId: string): boolean {
  const c = cellOf(row, subjectId)
  return Boolean(c && !c.passed)
}

function handlePrint(): void {
  printWithTitle(`Result Card - ${exam.value?.name ?? ''}`.trim() || 'Result Card')
}
</script>

<style scoped>
.print-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-md);
}
.page-header__title {
  font-size: var(--font-size-2xl);
  margin: 0;
}
.page-header__subtitle {
  color: var(--color-text-muted);
  margin: var(--spacing-xs) 0 0;
  font-size: var(--font-size-sm);
}
.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}
.back {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
  white-space: nowrap;
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
}
.report-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}
.report-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 2px solid var(--color-primary);
}
.report-card__school {
  font-size: var(--font-size-2xl);
  margin: 0 0 var(--spacing-xs);
}
.report-card__report {
  font-size: var(--font-size-lg);
  margin: 0;
}
.report-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
.report-card__table {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.data-table th,
.data-table td {
  text-align: left;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}
.data-table thead th {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  background: var(--color-surface-alt);
}
.name-cell {
  font-weight: var(--font-weight-medium);
}
.subject-head {
  white-space: normal;
  min-width: 92px;
}
.subject-head__meta {
  display: block;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-normal);
}
.subject-cell {
  white-space: normal;
  min-width: 92px;
}
.subject-cell__score {
  display: block;
  font-weight: var(--font-weight-medium);
  font-variant-numeric: tabular-nums;
}
.subject-cell__split {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
.subject-cell--fail .subject-cell__score {
  color: var(--color-danger);
}
.verdict {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}
.verdict--pass {
  background: var(--color-success-light);
  color: var(--color-success);
}
.verdict--fail {
  background: var(--color-danger-light);
  color: var(--color-danger);
}
.report-card__foot {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
.badge {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: capitalize;
}
.badge--published {
  background: var(--color-success-light);
  color: var(--color-success);
}
.badge--draft,
.badge--active {
  background: var(--color-warning-light);
  color: var(--color-warning);
}
@page {
  size: A4 landscape;
  margin: 0;
}
@media print {
  .page-header,
  .app-shell__sidebar,
  .app-shell__topbar {
    display: none !important;
  }
  .print-view {
    display: block;
  }
  .report-card {
    box-shadow: none;
    border: none;
    gap: var(--spacing-sm);
    padding: 8mm;
  }
  .report-card__school {
    font-size: 14pt;
  }
  .report-card__table {
    overflow: visible;
  }
  .data-table {
    font-size: 7.5pt;
  }
  .data-table th,
  .data-table td {
    padding: 2px 3px;
    white-space: normal;
  }
  .subject-head,
  .subject-cell {
    min-width: 0;
  }
}
</style>
