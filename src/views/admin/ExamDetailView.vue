<template>
  <div class="page">
    <RouterLink to="/admin/exams" class="back">‹ Back to exams</RouterLink>
    <p v-if="examLoading" class="muted">Loading…</p>
    <p v-else-if="!exam" class="error">Exam not found.</p>
    <template v-else>
      <div class="page__head">
        <div>
          <h1 class="page__title">{{ exam.name }}</h1>
          <p class="muted">{{ exam.examDate }} · {{ classLabel(exam.classId) }} · Full {{ exam.fullMarks }} · Pass {{ exam.passMarks }} · <span class="chip">{{ exam.status }}</span></p>
        </div>
        <div class="head-actions">
          <AppButton
            v-if="exam.status !== 'published'"
            variant="ghost"
            :disabled="publishing"
            @click="publish('published')"
          >
            Publish
          </AppButton>
          <AppButton v-else variant="ghost" :disabled="publishing" @click="publish('active')">
            Unpublish
          </AppButton>
          <AppButton :disabled="saving" @click="saveAll">{{ saving ? 'Saving…' : 'Save Marks' }}</AppButton>
        </div>
      </div>

      <div class="grid">
        <AppCard title="Marks Entry">
          <p v-if="entriesLoading" class="muted">Loading students…</p>
          <table v-else class="table">
            <thead>
              <tr><th>#</th><th>Student</th><th>Marks (/{{ exam.fullMarks }})</th><th>Grade</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in editable" :key="row.studentId">
                <td>{{ i + 1 }}</td>
                <td>{{ row.studentName }}</td>
                <td>
                  <input
                    v-model.number="row.marksObtained"
                    type="number"
                    :min="0"
                    :max="exam.fullMarks"
                    class="app-input__control marks-input"
                  />
                </td>
                <td><span class="chip">{{ gradeOf(row.marksObtained) }}</span></td>
                <td>
                  <RouterLink :to="`/admin/exams/${examId}/report/${row.studentId}`" class="link-btn">
                    Report
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </AppCard>

        <AppCard title="Merit List">
          <ol class="merit">
            <li v-for="(row, i) in merit" :key="row.studentId" class="merit__row">
              <span class="merit__rank">{{ i + 1 }}</span>
              <span>{{ row.studentName }}</span>
              <strong>{{ row.marksObtained }}</strong>
            </li>
          </ol>
          <p v-if="merit.length === 0" class="muted">Save marks to build the merit list.</p>
        </AppCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import {
  useClasses,
  useExam,
  useExamStatus,
  useResultEntries,
  useSaveResultEntries,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { gradeFromMarks } from '@/utils/grading'
import type { ExamStatus } from '@/types/models'

const toast = useToast()
const route = useRoute()
const examId = computed(() => String(route.params.id ?? ''))

const { data: examData, isLoading: examLoading } = useExam(examId)
const exam = computed(() => examData.value?.data)

const { data: classData } = useClasses()
const classLabel = (id: string): string => classData.value?.data.find((c) => c.id === id)?.label ?? id

const { data: entriesData, isLoading: entriesLoading } = useResultEntries(examId)
const editable = reactive<{ studentId: string; studentName: string; marksObtained: number }[]>([])
watch(
  entriesData,
  (res) => {
    editable.length = 0
    for (const r of res?.data ?? []) {
      editable.push({ studentId: r.studentId, studentName: r.studentName, marksObtained: r.marksObtained })
    }
  },
  { immediate: true },
)

const gradeOf = (marks: number): string => gradeFromMarks(marks, exam.value?.fullMarks ?? 100)

const merit = computed(() =>
  [...editable]
    .filter((r) => r.marksObtained > 0)
    .sort((a, b) => b.marksObtained - a.marksObtained)
    .slice(0, 10),
)

const { mutateAsync: saveEntries, isPending: saving } = useSaveResultEntries()
async function saveAll(): Promise<void> {
  try {
    await saveEntries({
      examId: examId.value,
      entries: editable.map((r) => ({ studentId: r.studentId, marksObtained: r.marksObtained })),
    })
    toast.success('Marks saved')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}

const { mutateAsync: changeStatus, isPending: publishing } = useExamStatus()
async function publish(status: ExamStatus): Promise<void> {
  try {
    await changeStatus({ id: examId.value, status })
    toast.success(status === 'published' ? 'Result published' : 'Unpublished')
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
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
  margin: var(--spacing-sm) 0 var(--spacing-lg);
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}
.head-actions {
  display: flex;
  gap: var(--spacing-sm);
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
  grid-template-columns: 2fr 1fr;
  gap: var(--spacing-md);
  align-items: start;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
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
.marks-input {
  max-width: 110px;
}
.chip {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  font-size: var(--font-size-xs);
  text-transform: capitalize;
}
.link-btn {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
}
.merit {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}
.merit__row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.merit__rank {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  display: grid;
  place-items: center;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-xs);
}
</style>
