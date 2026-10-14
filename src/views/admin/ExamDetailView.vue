<template>
  <div class="page">
    <RouterLink to="/admin/exams" class="back">‹ Back to exams</RouterLink>
    <p v-if="examLoading" class="muted">Loading…</p>
    <p v-else-if="!exam" class="error">Exam not found.</p>
    <template v-else>
      <div class="page__head">
        <div>
          <h1 class="page__title">{{ exam.name }}</h1>
          <div class="meta-row">
            <span class="meta"><span class="meta__key">Date</span>{{ exam.examDate }}</span>
            <span class="meta"><span class="meta__key">Class</span>{{ classLabel(exam.classId) }}</span>
            <span v-if="exam.sectionId" class="meta"><span class="meta__key">Section</span>{{ sectionLabel(exam.sectionId) }}</span>
            <span v-if="exam.departmentId" class="meta"><span class="meta__key">Department</span>{{ deptLabel(exam.departmentId) }}</span>
            <span class="meta"><span class="meta__key">Subjects</span>{{ exam.subjects.length }}</span>
            <span class="chip chip--status">{{ exam.status }}</span>
          </div>
          <p v-if="exam.status === 'published'" class="muted">Published — unpublish to edit marks.</p>
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
          <AppButton :disabled="saving || exam.status === 'published'" @click="saveAll">{{ saving ? 'Saving…' : 'Save Marks' }}</AppButton>
        </div>
      </div>

      <div class="grid">
        <AppCard title="Marks Entry">
          <p v-if="entriesLoading" class="muted">Loading students…</p>
          <div v-else>
          <div class="sub-tabs">
            <button
              v-for="t in subjectTabs"
              :key="t.id"
              class="sub-tab"
              :class="{ 'sub-tab--active': activeSubject === t.id }"
              type="button"
              @click="activeSubject = t.id"
            >{{ t.label }}</button>
          </div>
          <div class="table-scroll">
          <table class="table">
            <thead>
              <tr>
                <th class="col-rank">#</th>
                <th class="col-student">Student</th>
                <th v-for="s in visibleSubjects" :key="s.id" class="col-sub">
                  <span class="sub-name">{{ s.name }}</span>
                  <span class="sub-info">{{ subjectInfo(s) }}</span>
                </th>
                <th class="col-total">Total</th><th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in editable" :key="row.studentId">
                <td class="col-rank">{{ i + 1 }}</td>
                <td class="col-student">{{ row.studentName }}</td>
                <td v-for="cell in visibleCells(row)" :key="cell.subjectId" class="col-sub">
                  <div class="cell-entry">
                    <template v-if="cell.mode === 'both'">
                      <label class="mark-field"><span class="mark-field__label">CQ · /{{ cell.cqFull }}</span><input v-model.number="cell.cq" type="number" :min="0" :max="cell.cqFull" :disabled="locked || cell.absent" class="app-input__control mini" /></label>
                      <label class="mark-field"><span class="mark-field__label">MCQ · /{{ cell.mcqFull }}</span><input v-model.number="cell.mcq" type="number" :min="0" :max="cell.mcqFull" :disabled="locked || cell.absent" class="app-input__control mini" /></label>
                    </template>
                    <label v-else-if="cell.mode === 'cq'" class="mark-field"><span class="mark-field__label">CQ · /{{ cell.cqFull }}</span><input v-model.number="cell.cq" type="number" :min="0" :max="cell.cqFull" :disabled="locked || cell.absent" class="app-input__control mini" /></label>
                    <label v-else-if="cell.mode === 'mcq'" class="mark-field"><span class="mark-field__label">MCQ · /{{ cell.mcqFull }}</span><input v-model.number="cell.mcq" type="number" :min="0" :max="cell.mcqFull" :disabled="locked || cell.absent" class="app-input__control mini" /></label>
                    <label v-else class="mark-field"><span class="mark-field__label">Marks · /{{ cell.full }}</span><input v-model.number="cell.total" type="number" :min="0" :max="cell.full" :disabled="locked || cell.absent" class="app-input__control mini" /></label>
                    <span class="pass-pill" :class="cell.absent ? 'pass-pill--absent' : cellPassed(cell) ? 'pass-pill--pass' : 'pass-pill--fail'">{{ cell.absent ? 'Absent' : cellPassed(cell) ? 'Pass' : 'Fail' }}</span>
                    <label class="absent"><input v-model="cell.absent" type="checkbox" :disabled="locked" /> Abs</label>
                  </div>
                </td>
                <td class="col-total"><strong>{{ rowTotal(row) }}</strong></td>
                <td>
                  <RouterLink :to="`/admin/exams/${examId}/report/${row.studentId}`" class="link-btn">
                    Report
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
          </div>
        </AppCard>

        <AppCard title="Merit List">
          <p class="muted">Pass {{ summary.passed }}/{{ summary.students }} · {{ summary.passRate }}%</p>
          <ol class="merit">
            <li v-for="row in meritRows" :key="row.studentId" class="merit__row" :class="{ 'merit__row--fail': !row.passed }">
              <span class="merit__rank">{{ row.rank }}</span>
              <span>{{ row.studentName }}</span>
              <strong>{{ row.total }}</strong>
              <span class="chip">{{ row.grade }}</span>
            </li>
          </ol>
          <p v-if="meritRows.length === 0" class="muted">Save marks to build the merit list.</p>
        </AppCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import {
  useClasses,
  useDepartments,
  useExam,
  useExamResults,
  useExamStatus,
  useResultEntries,
  useSaveResultEntries,
  useSections,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import type { ExamStatus, ExamSubject } from '@/types/models'

const toast = useToast()
const route = useRoute()
const examId = computed(() => String(route.params.id ?? ''))

const { data: examData, isLoading: examLoading } = useExam(examId)
const exam = computed(() => examData.value?.data)
const locked = computed(() => exam.value?.status === 'published')

const { data: classData } = useClasses()
const classLabel = (id: string): string => classData.value?.data.find((c) => c.id === id)?.label ?? id
const { data: sectionData } = useSections(() => exam.value?.classId || undefined)
const sectionLabel = (id: string): string => sectionData.value?.data.find((s) => s.id === id)?.label ?? ''
const { data: deptData } = useDepartments(() => exam.value?.classId || undefined)
const deptLabel = (id: string): string => deptData.value?.data.find((d) => d.id === id)?.label ?? ''

type CellMode = 'single' | 'cq' | 'mcq' | 'both'
function cellMode(s: ExamSubject): CellMode {
  const cq = Number(s.cqFull) || 0
  const mcq = Number(s.mcqFull) || 0
  if (cq > 0 && mcq > 0) return 'both'
  if (cq > 0) return 'cq'
  if (mcq > 0) return 'mcq'
  return 'single'
}
function subjectInfo(s: ExamSubject): string {
  const mode = cellMode(s)
  if (mode === 'both') return `CQ ${s.cqFull} + MCQ ${s.mcqFull}${s.passRule === 'separate' ? ' · separate pass' : ' · combined'}`;
  if (mode === 'cq') return `CQ · Full ${s.fullMarks}`
  if (mode === 'mcq') return `MCQ · Full ${s.fullMarks}`
  return `Full ${s.fullMarks}`
}

interface Cell {
  subjectId: string
  mode: CellMode
  cqFull: number
  cqPass: number
  mcqFull: number
  mcqPass: number
  full: number
  pass: number
  passRule: 'separate' | 'combine'
  cq: number
  mcq: number
  total: number
  absent: boolean
}
interface Row {
  studentId: string
  studentName: string
  cells: Cell[]
}

// Subject-wise entry: ekta tab e ekta subject (default prothomta),
// chaile All dekhe full table + x-scroll.
const activeSubject = ref('all')
const subjectTabs = computed(() => [
  { id: 'all', label: `All (${exam.value?.subjects.length ?? 0})` },
  ...(exam.value?.subjects.map((s) => ({ id: s.id, label: s.name })) ?? []),
])
const visibleSubjects = computed(() => {
  const subs = exam.value?.subjects ?? []
  if (activeSubject.value === 'all') return subs
  return subs.filter((s) => s.id === activeSubject.value)
})
watch(examData, (res) => {
  const subs = res?.data?.subjects ?? []
  if (activeSubject.value !== 'all' && !subs.some((s) => s.id === activeSubject.value)) {
    activeSubject.value = subs.length > 0 ? subs[0]?.id ?? 'all' : 'all'
  } else if (activeSubject.value === 'all' && subs.length > 0 && subs.length > 6) {
    activeSubject.value = subs[0]?.id ?? 'all'
  }
}, { immediate: true })
function visibleCells(row: Row): Cell[] {
  if (activeSubject.value === 'all') return row.cells
  return row.cells.filter((c) => c.subjectId === activeSubject.value)
}

const { data: entriesData, isLoading: entriesLoading } = useResultEntries(examId)
const editable = reactive<Row[]>([])
watch(
  [entriesData, examData],
  ([entriesRes, examRes]) => {
    editable.length = 0
    const subs = examRes?.data?.subjects ?? []
    const byId = new Map((entriesRes?.data ?? []).map((r) => [r.studentId, r]))
    // entries endpoint returns the full roster (even unmarked).
    const roster = entriesRes?.data ?? []
    for (const r of roster) {
      const saved = new Map((byId.get(r.studentId)?.subjects ?? []).map((m) => [m.subjectId, m]))
      editable.push({
        studentId: r.studentId,
        studentName: r.studentName,
        cells: subs.map((s) => {
          const m = saved.get(s.id)
          return {
            subjectId: s.id,
            mode: cellMode(s),
            cqFull: s.cqFull,
            cqPass: s.cqPass,
            mcqFull: s.mcqFull,
            mcqPass: s.mcqPass,
            full: s.fullMarks,
            pass: s.passMarks,
            passRule: s.passRule,
            cq: m?.cq ?? 0,
            mcq: m?.mcq ?? 0,
            total: m?.total ?? 0,
            absent: m?.absent ?? false,
          }
        }),
      })
    }
  },
  { immediate: true },
)

function cellTotal(c: Cell): number {
  if (c.absent) return 0
  if (c.mode === 'both') return (Number(c.cq) || 0) + (Number(c.mcq) || 0)
  if (c.mode === 'cq') return Number(c.cq) || 0
  if (c.mode === 'mcq') return Number(c.mcq) || 0
  return Number(c.total) || 0
}
function rowTotal(row: Row): number {
  return row.cells.reduce((s, c) => s + cellTotal(c), 0)
}
// Backend subject_pass er same niyom — exam e set kora bar onujayi live.
function cellPassed(c: Cell): boolean | null {
  if (c.absent) return false
  const total = cellTotal(c)
  if ((Number(c.full) || 0) <= 0) return true
  if (c.mode === 'single') return total >= (Number(c.pass) || 0)
  const cqOk = (Number(c.cqFull) || 0) <= 0 || (Number(c.cq) || 0) >= (Number(c.cqPass) || 0)
  const mcqOk = (Number(c.mcqFull) || 0) <= 0 || (Number(c.mcq) || 0) >= (Number(c.mcqPass) || 0)
  if (c.passRule === 'combine') return total >= (Number(c.pass) || 0)
  return Boolean(cqOk && mcqOk && total >= (Number(c.pass) || 0))
}

// Server-computed merit (ties share rank) + summary.
const { data: resultsData } = useExamResults(examId)
const meritRows = computed(() => resultsData.value?.data.rows ?? [])
const summary = computed(() => resultsData.value?.data.summary ?? { students: 0, passed: 0, failed: 0, passRate: 0 })

const { mutateAsync: saveEntries, isPending: saving } = useSaveResultEntries()
async function saveAll(): Promise<void> {
  try {
    await saveEntries({
      examId: examId.value,
      entries: editable.map((r) => ({
        studentId: r.studentId,
        marks: r.cells.map((c) => ({
          subjectId: c.subjectId,
          cq: c.mode === 'mcq' || c.mode === 'single' ? undefined : Number(c.cq) || 0,
          mcq: c.mode === 'cq' || c.mode === 'single' ? undefined : Number(c.mcq) || 0,
          total: c.mode === 'single' ? Number(c.total) || 0 : undefined,
          absent: c.absent,
        })),
      })),
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
.table-scroll {
  overflow-x: auto;
  max-width: 100%;
  -webkit-overflow-scrolling: touch;
}
.table-scroll .table {
  min-width: max-content;
}
.sub-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}
.sub-tab {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-full);
  padding: 4px var(--spacing-md);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}
.sub-tab--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-primary-contrast);
  font-weight: var(--font-weight-semibold);
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
  vertical-align: top;
}
.col-rank {
  width: 40px;
  color: var(--color-text-muted);
}
.col-student {
  position: sticky;
  left: 0;
  background: var(--color-surface);
  min-width: 140px;
  font-weight: var(--font-weight-medium);
}
.col-sub {
  min-width: 110px;
}
.sub-name {
  display: block;
  font-weight: var(--font-weight-semibold);
}
.sub-info {
  display: block;
  font-weight: var(--font-weight-normal);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-top: 2px;
}
.col-total {
  text-align: right;
  min-width: 70px;
}
.mini {
  max-width: 76px;
}
.cell-entry {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.mark-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mark-field__label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  white-space: nowrap;
}
.absent {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
.pass-pill {
  display: inline-block;
  align-self: flex-start;
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
.pass-pill--absent {
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
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
.merit__row--fail {
  opacity: 0.65;
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
