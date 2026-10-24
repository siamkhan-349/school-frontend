<template>
  <div class="page">
    <div class="top-links">
      <RouterLink :to="`/admin/exams/${examId}`" class="back">‹ Back to marks entry</RouterLink>
      <RouterLink to="/admin/exams" class="back">‹ All exams</RouterLink>
      <RouterLink :to="`/admin/exams/${examId}/card`" class="back back--accent">Result Card ⎙</RouterLink>
    </div>
    <div v-if="examLoading" class="sk-stack">
      <AppSkeleton variant="card" />
      <AppSkeleton variant="card" />
    </div>
    <p v-else-if="!exam" class="error">Exam not found.</p>
    <template v-else>
      <div class="page__head">
        <div>
          <h1 class="page__title">{{ exam.name }} — Merit List</h1>
          <div class="meta-row">
            <span class="meta"><span class="meta__key">Date</span>{{ exam.examDate }}</span>
            <span class="meta"><span class="meta__key">Class</span>{{ classLabel(exam.classId) }}</span>
            <span class="meta"><span class="meta__key">Pass</span>{{ summary.passed }}/{{ summary.students }} · {{ summary.passRate }}%</span>
            <span class="chip chip--status">{{ exam.status }}</span>
          </div>
        </div>
        <div class="head-actions">
          <AppButton variant="ghost" :disabled="meritRows.length === 0" :loading="sendingResult" @click="askResultSms">
            Send Result SMS
          </AppButton>
        </div>
      </div>

      <AppCard title="Merit List">
        <AppSkeleton v-if="resultsLoading" variant="table" :rows="8" :cols="8" />
        <template v-else>
          <div class="table-scroll">
            <table class="table">
              <thead>
                <tr>
                  <th class="col-rank">Rank</th>
                  <th>Roll</th>
                  <th>Student</th>
                  <th class="col-num">Total</th>
                  <th>Grade</th>
                  <th>Status</th>
                  <th>Failed In</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in meritRows" :key="row.studentId" :class="{ 'row--fail': !row.passed }">
                  <td class="col-rank">
                    <span class="merit__rank">{{ row.rank }}</span>
                  </td>
                  <td>{{ row.roll ?? '—' }}</td>
                  <td>{{ row.studentName }}</td>
                  <td class="col-num">
                    <strong>{{ row.total }}</strong>
                  </td>
                  <td><span class="chip">{{ row.grade }}</span></td>
                  <td>
                    <span class="pass-pill" :class="row.passed ? 'pass-pill--pass' : 'pass-pill--fail'">{{
                      row.passed ? 'Pass' : 'Fail'
                    }}</span>
                  </td>
                  <td class="fail-subs">
                    <span v-if="row.passed" class="muted">—</span>
                    <span v-else class="fail-chips">
                      <span v-for="s in failedSubjects(row)" :key="s.subjectId" class="fail-chip" :title="`${s.name}: CQ ${s.cq}, MCQ ${s.mcq}, Total ${s.total}/${s.full}`">
                        {{ s.name }}{{ failReason(row, s.subjectId) }}
                      </span>
                    </span>
                  </td>
                  <td>
                    <RouterLink :to="`/admin/exams/${examId}/report/${row.studentId}`" class="link-btn">
                      Report
                    </RouterLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="meritRows.length === 0" class="muted">Save marks to build the merit list.</p>
        </template>
      </AppCard>
    </template>

    <AppConfirmDialog
      :open="confirm.open"
      :message="confirm.message"
      :busy="sendingResult"
      @cancel="confirm.open = false"
      @confirm="doResultSms"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import { useClasses, useExam, useExamResults, useSendBulkSms, useSmsTemplates } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { buildResultVariables } from '@/utils/resultSms'
import type { ExamResultRow } from '@/services'
import type { ExamSubject } from '@/types/models'

const toast = useToast()

const route = useRoute()
const examId = computed(() => String(route.params.id ?? ''))

const { data: examData, isLoading: examLoading } = useExam(examId)
const exam = computed(() => examData.value?.data)

const { data: classData } = useClasses()
const classLabel = (id: string): string => classData.value?.data.find((c) => c.id === id)?.label ?? id

const { data: resultsData, isLoading: resultsLoading } = useExamResults(examId)
const meritRows = computed(() => resultsData.value?.data.rows ?? [])
const fullMarks = computed(() => resultsData.value?.data.fullMarks ?? 0)
const summary = computed(
  () => resultsData.value?.data.summary ?? { students: 0, passed: 0, failed: 0, passRate: 0 },
)

// Subjects failed/absent — shown in the merit list with the reason
// (e.g. "ICT (MCQ 5<10)" means 5 out of a 10-mark MCQ bar)
function failedSubjects(row: ExamResultRow): ExamResultRow['subjects'] {
  return (row.subjects ?? []).filter((s) => !s.passed)
}
function failReason(row: ExamResultRow, subjectId: string): string {
  const c = row.subjects.find((s) => s.subjectId === subjectId)
  if (!c) return ''
  if (c.absent) return ' (Abs)'
  const bar: ExamSubject | undefined = exam.value?.subjects.find((s) => s.id === subjectId)
  if (!bar) return ''
  const reasons: string[] = []
  const cqFull = Number(bar.cqFull) || 0
  const mcqFull = Number(bar.mcqFull) || 0
  if (cqFull + mcqFull <= 0 || bar.passRule === 'combine') {
    // Single bar / combined: the total decides.
    if ((Number(c.total) || 0) < (Number(bar.passMarks) || 0)) {
      reasons.push(`Total ${c.total}<${bar.passMarks}`)
    }
  } else {
    // Separate: each part must pass on its own (no extra total bar).
    if (cqFull > 0 && (Number(c.cq) || 0) < (Number(bar.cqPass) || 0)) {
      reasons.push(`CQ ${c.cq}<${bar.cqPass}`)
    }
    if (mcqFull > 0 && (Number(c.mcq) || 0) < (Number(bar.mcqPass) || 0)) {
      reasons.push(`MCQ ${c.mcq}<${bar.mcqPass}`)
    }
  }
  return reasons.length > 0 ? ` (${reasons.join(', ')})` : ''
}

// Result SMS: each guardian gets their own child's result (coaching exam-mode pattern).
// The backend renders a separate message per recipient from their variables + keeps the exam link.
const { data: tplData } = useSmsTemplates()
const resultTemplate = computed(() => (tplData.value?.data ?? []).find((t) => t.type === 'result'))
const { mutateAsync: sendBulk, isPending: sendingResult } = useSendBulkSms()
const confirm = ref({ open: false, message: '' })
function askResultSms(): void {
  if (!resultTemplate.value) {
    toast.error('Create a result template on the SMS page first.')
    return
  }
  confirm.value = {
    open: true,
    message: `Send result SMS to ${meritRows.value.length} guardians with the "${resultTemplate.value.name}" template?`,
  }
}
async function doResultSms(): Promise<void> {
  if (!resultTemplate.value) return
  try {
    const res = await sendBulk({
      templateId: resultTemplate.value.id,
      examId: examId.value,
      recipients: meritRows.value.map((row) => ({
        recipientId: row.studentId,
        recipientType: 'guardian',
        variables: buildResultVariables(row, fullMarks.value),
      })),
    })
    confirm.value.open = false
    const failed = res.data.failed ?? []
    toast.success(
      res.data.sent > 0 ? `${res.data.sent} result SMS sent` : 'No recipients found',
    )
    if (failed.length > 0) toast.error(`${failed.length} failed (no phone)`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}
</script>

<style scoped>
.back {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
}
.top-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}
.back--accent {
  font-weight: var(--font-weight-semibold);
}
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
  margin: var(--spacing-sm) 0 var(--spacing-lg);
  flex-wrap: wrap;
}
.head-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}
.meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-xs);
}
.meta {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 2px var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  font-size: var(--font-size-xs);
}
.meta__key {
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 10px;
}
.chip {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  font-size: var(--font-size-xs);
  text-transform: capitalize;
}
.chip--status {
  margin-left: var(--spacing-xs);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
}
.table-scroll {
  display: block;
  overflow-x: auto;
  max-width: 100%;
  -webkit-overflow-scrolling: touch;
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
  vertical-align: middle;
}
.col-rank {
  width: 60px;
}
.col-num {
  text-align: right;
}
.merit__rank {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  display: inline-grid;
  place-items: center;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-xs);
}
.row--fail {
  opacity: 0.65;
}
.pass-pill {
  display: inline-block;
  padding: 1px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.pass-pill--pass {
  background: var(--color-success-light);
  color: var(--color-success);
}
.pass-pill--fail {
  background: var(--color-danger-light);
  color: var(--color-danger);
}
.link-btn {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
}
.fail-subs {
  max-width: 260px;
}
.fail-chips {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
}
.fail-chip {
  display: inline-block;
  padding: 1px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--color-danger-light);
  color: var(--color-danger);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}
@media (max-width: 640px) {
  .page__title {
    font-size: var(--font-size-xl);
    overflow-wrap: anywhere;
  }
}
</style>
