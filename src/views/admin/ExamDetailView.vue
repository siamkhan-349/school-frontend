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
            :title="pendingSubjects.length ? `Waiting on: ${pendingSubjects.map((s) => s.name).join(', ')}` : 'Publish this result'"
            @click="openPublish"
          >
            Publish
          </AppButton>
          <AppButton v-else variant="ghost" :disabled="publishing" @click="publish('active')">
            Unpublish
          </AppButton>
          <RouterLink :to="`/admin/exams/${examId}/merit`">
            <AppButton variant="ghost">Merit List</AppButton>
          </RouterLink>
          <AppButton variant="ghost" :disabled="saving || exam.status === 'published'" @click="autoFill" title="Fill empty cells with realistic demo marks — then click Save Marks">Auto Fill</AppButton>
          <AppButton :disabled="saving || exam.status === 'published'" @click="saveAll">{{ saving ? 'Saving…' : 'Save Marks' }}</AppButton>
        </div>
      </div>

      <AppCard v-if="setupVisible" title="Subject Setup" class="setup-card">
        <div class="setup-head">
          <span class="muted">{{ configuredCount }} of {{ exam.subjects.length }} subjects configured</span>
          <span v-if="pendingSubjects.length" class="chip chip--warn">{{ pendingSubjects.length }} waiting</span>
          <span v-else class="chip chip--ok">All set</span>
        </div>
        <p v-if="pendingSubjects.length" class="muted setup-note">
          Publishing is blocked while a subject is still waiting. Assign its teacher, or fill the
          subject yourself with Fill.
        </p>
        <div class="table-scroll">
          <table class="table setup-table">
            <thead>
              <tr><th>Subject</th><th>Teacher</th><th>Config</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="s in exam.subjects" :key="s.id">
                <td class="setup-name">{{ s.name }}</td>
                <td>
                  <span v-if="s.teacherName">{{ s.teacherName }}<span v-if="(s.teacherCount ?? 0) > 1" class="muted"> +{{ (s.teacherCount ?? 1) - 1 }}</span></span>
                  <span v-else class="chip chip--warn">No teacher</span>
                </td>
                <td>
                  <span v-if="subjectConfigured(s)" class="chip chip--ok">{{ setupSummary(s) }}</span>
                  <span v-else class="chip chip--warn">Pending</span>
                </td>
                <td class="setup-actions">
                  <button
                    class="link-btn"
                    type="button"
                    :disabled="locked || !s.subjectId"
                    :title="!s.subjectId ? 'Not linked to an Academics subject' : 'Assign a teacher to this subject'"
                    @click="openAssign(s)"
                  >Assign</button>
                  <button class="link-btn" type="button" :disabled="locked" @click="openFill(s)">Fill</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <div>
        <AppCard title="Marks Entry">
          <p v-if="entriesLoading" class="muted">Loading students…</p>
          <div v-else>
          <div class="marks-toolbar">
            <input v-model="search" type="search" placeholder="Search student…" class="app-input__control search" />
          </div>
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
                <th class="col-rank" title="Roll number">Roll</th>
                <th class="col-student">Student</th>
                <!-- Single subject: CQ/MCQ as separate columns -->
                <template v-if="singleSubject">
                  <th v-if="singleSubjectHasCq" class="col-part">CQ · /{{ singleSubject.cqFull }}</th>
                  <th v-if="singleSubjectHasMcq" class="col-part">MCQ · /{{ singleSubject.mcqFull }}</th>
                  <th v-if="singleSubjectIsSingle" class="col-part">Marks · /{{ singleSubject.fullMarks }}</th>
                  <th class="col-status">Status</th>
                  <th class="col-status">Absent</th>
                </template>
                <template v-else>
                  <th v-for="s in visibleSubjects" :key="s.id" class="col-sub">
                    <span class="sub-name">{{ s.name }}</span>
                    <span class="sub-info">{{ subjectInfo(s) }}</span>
                  </th>
                </template>
                <th class="col-total" :title="singleSubject ? `${singleSubject.name} total` : 'Grand total across all subjects'">{{ singleSubject ? 'Sub Total' : 'G. Total' }}</th><th class="col-action"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in pagedRows" :key="row.studentId">
                <td class="col-rank">{{ row.roll ?? '—' }}</td>
                <td class="col-student">{{ row.studentName }}</td>
                <!-- Single subject: each part in its own column -->
                <template v-if="singleSubject">
                  <td v-if="singleSubjectHasCq" class="col-part">
                    <input v-model.number="singleCell(row).cq" type="number" inputmode="decimal" placeholder="0" :min="0" :max="singleSubject.cqFull" :disabled="locked || singleCell(row).absent" class="app-input__control mini mark-input" />
                  </td>
                  <td v-if="singleSubjectHasMcq" class="col-part">
                    <input v-model.number="singleCell(row).mcq" type="number" inputmode="decimal" placeholder="0" :min="0" :max="singleSubject.mcqFull" :disabled="locked || singleCell(row).absent" class="app-input__control mini mark-input" />
                  </td>
                  <td v-if="singleSubjectIsSingle" class="col-part">
                    <input v-model.number="singleCell(row).total" type="number" inputmode="decimal" placeholder="0" :min="0" :max="singleSubject.fullMarks" :disabled="locked || singleCell(row).absent" class="app-input__control mini mark-input" />
                  </td>
                  <td class="col-status">
                    <span class="pass-pill" :class="singleCell(row).absent ? 'pass-pill--absent' : cellPassed(singleCell(row)) ? 'pass-pill--pass' : 'pass-pill--fail'">{{ singleCell(row).absent ? 'Absent' : cellPassed(singleCell(row)) ? 'Pass' : 'Fail' }}</span>
                  </td>
                  <td class="col-status">
                    <input v-model="singleCell(row).absent" type="checkbox" :disabled="locked" class="absent-check" />
                  </td>
                </template>
                <template v-else>
                <td v-for="cell in visibleCells(row)" :key="cell.subjectId" class="col-sub">
                  <div class="cell-entry">
                    <template v-if="cell.mode === 'both'">
                      <label class="mark-field"><span class="mark-field__label">CQ · /{{ cell.cqFull }}</span><input v-model.number="cell.cq" type="number" inputmode="decimal" placeholder="0" :min="0" :max="cell.cqFull" :disabled="locked || cell.absent" class="app-input__control mini mark-input" /></label>
                      <label class="mark-field"><span class="mark-field__label">MCQ · /{{ cell.mcqFull }}</span><input v-model.number="cell.mcq" type="number" inputmode="decimal" placeholder="0" :min="0" :max="cell.mcqFull" :disabled="locked || cell.absent" class="app-input__control mini mark-input" /></label>
                    </template>
                    <label v-else-if="cell.mode === 'cq'" class="mark-field"><span class="mark-field__label">CQ · /{{ cell.cqFull }}</span><input v-model.number="cell.cq" type="number" inputmode="decimal" placeholder="0" :min="0" :max="cell.cqFull" :disabled="locked || cell.absent" class="app-input__control mini mark-input" /></label>
                    <label v-else-if="cell.mode === 'mcq'" class="mark-field"><span class="mark-field__label">MCQ · /{{ cell.mcqFull }}</span><input v-model.number="cell.mcq" type="number" inputmode="decimal" placeholder="0" :min="0" :max="cell.mcqFull" :disabled="locked || cell.absent" class="app-input__control mini mark-input" /></label>
                    <label v-else class="mark-field"><span class="mark-field__label">Marks · /{{ cell.full }}</span><input v-model.number="cell.total" type="number" inputmode="decimal" placeholder="0" :min="0" :max="cell.full" :disabled="locked || cell.absent" class="app-input__control mini mark-input" /></label>
                    <span class="pass-pill" :class="cell.absent ? 'pass-pill--absent' : cellPassed(cell) ? 'pass-pill--pass' : 'pass-pill--fail'">{{ cell.absent ? 'Absent' : cellPassed(cell) ? 'Pass' : 'Fail' }}</span>
                    <label class="absent"><input v-model="cell.absent" type="checkbox" :disabled="locked" /> Abs</label>
                  </div>
                </td>
                </template>
                <td class="col-total"><strong>{{ displayTotal(row) }}</strong></td>
                <td class="col-action">
                  <RouterLink :to="`/admin/exams/${examId}/report/${row.studentId}`" class="link-btn">
                    Report
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
          <AppPagination v-model:page="page" v-model:per-page="perPage" :total="filteredRows.length" />
          </div>
        </AppCard>
      </div>
    </template>
    <Teleport to="body">
      <div v-if="fillAsk" class="dialog-backdrop" @click.self="fillAsk = false">
        <div class="dialog" role="dialog" aria-modal="true">
          <h3 class="dialog__title">Fill subject — {{ fillSubject?.name }}</h3>
          <p class="muted">Admin fallback for a subject with no teacher (or a teacher who has not filled it). Still editable until the exam is published.</p>
          <div class="fill-grid">
            <label>Category
              <select v-model="fillForm.mode" class="app-input__control">
                <option value="cq">Only CQ</option>
                <option value="mcq">Only MCQ</option>
                <option value="both">CQ+MCQ</option>
              </select>
            </label>
            <template v-if="fillForm.mode === 'cq'">
              <label>CQ full<input v-model.number="fillForm.cqFull" type="number" min="0" class="app-input__control" /></label>
              <label>CQ pass<input v-model.number="fillForm.cqPass" type="number" min="0" class="app-input__control" /></label>
            </template>
            <template v-else-if="fillForm.mode === 'mcq'">
              <label>MCQ full<input v-model.number="fillForm.mcqFull" type="number" min="0" class="app-input__control" /></label>
              <label>MCQ pass<input v-model.number="fillForm.mcqPass" type="number" min="0" class="app-input__control" /></label>
            </template>
            <template v-else>
              <label>CQ full<input v-model.number="fillForm.cqFull" type="number" min="0" class="app-input__control" /></label>
              <label v-if="fillForm.passRule === 'separate'">CQ pass<input v-model.number="fillForm.cqPass" type="number" min="0" class="app-input__control" /></label>
              <label>MCQ full<input v-model.number="fillForm.mcqFull" type="number" min="0" class="app-input__control" /></label>
              <label v-if="fillForm.passRule === 'separate'">MCQ pass<input v-model.number="fillForm.mcqPass" type="number" min="0" class="app-input__control" /></label>
              <label>Pass rule
                <select v-model="fillForm.passRule" class="app-input__control">
                  <option value="separate">Separate (CQ + MCQ pass separately)</option>
                  <option value="combine">Combine (total decides pass)</option>
                </select>
              </label>
            </template>
            <label>Pass marks<input v-model.number="fillForm.passMarks" type="number" min="0" class="app-input__control" /></label>
            <p class="muted span">Full marks will be {{ fillFull }} (sum of the parts in use).</p>
          </div>
          <p v-if="fillError" class="error">{{ fillError }}</p>
          <div class="dialog__actions">
            <AppButton variant="ghost" :disabled="fillSaving" @click="fillAsk = false">Cancel</AppButton>
            <AppButton :disabled="fillSaving" @click="saveFill">{{ fillSaving ? 'Saving…' : 'Save' }}</AppButton>
          </div>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div v-if="assignAsk" class="dialog-backdrop" @click.self="assignAsk = false">
        <div class="dialog" role="dialog" aria-modal="true">
          <h3 class="dialog__title">Assign teacher — {{ assignSubject?.name }}</h3>
          <p class="muted">The assigned teacher fills this subject and its student marks from the teacher panel.</p>
          <label>Teacher
            <select v-model="assignTeacherId" class="app-input__control">
              <option value="">Select a teacher</option>
              <option v-for="t in teacherChoices" :key="t.id" :value="t.id">{{ t.name }}{{ t.designation ? ` — ${t.designation}` : '' }}</option>
            </select>
          </label>
          <p v-if="assignSubject?.teacherName && assignTeacherId !== assignSubject?.teacherId" class="muted">
            {{ assignSubject.name }} already has {{ assignSubject.teacherName }} — remove that assignment
            from Teachers first to replace.
          </p>
          <p v-if="assignError" class="error">{{ assignError }}</p>
          <div class="dialog__actions">
            <AppButton variant="ghost" :disabled="assignSaving" @click="assignAsk = false">Cancel</AppButton>
            <AppButton :disabled="assignSaving || !assignTeacherId" @click="saveAssign">{{ assignSaving ? 'Assigning…' : 'Assign' }}</AppButton>
          </div>
        </div>
      </div>
    </Teleport>
    <PublishExamDialog
      v-if="exam"
      :open="pubAsk"
      :exam-name="exam.name"
      :busy="publishing || smsBusy"
      @cancel="pubAsk = false"
      @publish-only="doPublish(false)"
      @publish-sms="doPublish(true)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useRoute } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import PublishExamDialog from '@/components/common/PublishExamDialog.vue'
import { usePagedList } from '@/composables/usePagedList'
import {
  useClasses,
  useDepartments,
  useExam,
  useExamStatus,
  usePatchExamSubject,
  useResultEntries,
  useSaveResultEntries,
  useSections,
  useTeachers,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { sendResultSmsForExam } from '@/composables/useResultSms'
import { teacherSubjectService } from '@/services'
import { useSchoolStore } from '@/stores/school'
import type { ExamStatus, ExamSubject, SubjectConfigInput } from '@/types/models'

const toast = useToast()
const route = useRoute()
const examId = computed(() => String(route.params.id ?? ''))

const { data: examData, isLoading: examLoading } = useExam(examId)
const exam = computed(() => examData.value?.data)
const locked = computed(() => exam.value?.status === 'published')

// Teacher-entry modes: show who owns each subject + setup progress on the
// exam card (shell mode and marks-only mode both keep the names visible).
const school = useSchoolStore()

function subjectConfigured(s: ExamSubject): boolean {
  return s.configured ?? (Number(s.fullMarks) || 0) > 0
}
const pendingSubjects = computed(() => (exam.value?.subjects ?? []).filter((s) => !subjectConfigured(s)))
const configuredCount = computed(() => (exam.value?.subjects ?? []).filter(subjectConfigured).length)
const setupVisible = computed(
  () => Boolean(exam.value) && (school.examEntryMode !== 'admin' || pendingSubjects.value.length > 0),
)
function setupSummary(s: ExamSubject): string {
  const mode = cellMode(s)
  if (mode === 'both') return `CQ ${s.cqFull} + MCQ ${s.mcqFull}`
  if (mode === 'cq') return `CQ · Full ${s.fullMarks}`
  if (mode === 'mcq') return `MCQ · Full ${s.fullMarks}`
  return `Full ${s.fullMarks}`
}

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
  roll?: number | null
  cells: Cell[]
}

// Marks table search + pagination (same AppPagination + usePagedList as other pages)
const search = ref('')
const { page, perPage } = usePagedList(20)
// Subject-wise entry: one tab per subject (first one by default),
// or All for the full table + x-scroll.
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
// Single subject view: CQ/MCQ shown as separate columns
const singleSubject = computed<ExamSubject | null>(() => {
  const subs = visibleSubjects.value
  return subs.length === 1 ? (subs[0] ?? null) : null
})
const singleSubjectHasCq = computed(() => singleSubject.value != null && (Number(singleSubject.value.cqFull) || 0) > 0)
const singleSubjectHasMcq = computed(() => singleSubject.value != null && (Number(singleSubject.value.mcqFull) || 0) > 0)
const singleSubjectIsSingle = computed(() => singleSubject.value != null && !singleSubjectHasCq.value && !singleSubjectHasMcq.value)
function singleCell(row: Row): Cell {
  const found = row.cells.find((c) => c.subjectId === singleSubject.value?.id)
  if (!found) throw new Error('Subject cell not found')
  return found
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
        roll: r.roll ?? null,
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

// Pagination computeds after `editable` — defining them earlier throws a TDZ ReferenceError
const filteredRows = computed<Row[]>(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return [...editable]
  return editable.filter(
    (r) => r.studentName.toLowerCase().includes(q) || String(r.roll ?? '').includes(q),
  )
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / perPage.value)))
const pagedRows = computed<Row[]>(() => {
  const p = Math.min(page.value, totalPages.value)
  const start = (p - 1) * perPage.value
  return filteredRows.value.slice(start, start + perPage.value)
})
watch(search, () => { page.value = 1 })
watch(totalPages, (t) => { if (page.value > t) page.value = t })

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
// In single-subject view Total means that subject's total; in All view it is the grand total
function displayTotal(row: Row): number {
  if (singleSubject.value) return cellTotal(singleCell(row))
  return rowTotal(row)
}
// Same rule as backend subject_pass — live per the exam's bars.
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

// Publish dialog: with SMS or publish only
const pubAsk = ref(false)
const smsBusy = ref(false)
// Teacher-entry guard client-side: the backend blocks it too, but the toast
// tells the admin exactly which subjects are missing.
function openPublish(): void {
  if (pendingSubjects.value.length) {
    toast.error(`Waiting on subject setup: ${pendingSubjects.value.map((s) => s.name).join(', ')}`)
    return
  }
  pubAsk.value = true
}
async function doPublish(withSms: boolean): Promise<void> {
  smsBusy.value = true
  try {
    await changeStatus({ id: examId.value, status: 'published' })
    pubAsk.value = false
    if (!withSms) {
      toast.success('Result published — parents can now see it')
      return
    }
    try {
      const report = await sendResultSmsForExam(examId.value)
      const failed = report.failed.length
      toast.success(
        report.sent > 0
          ? `Published + ${report.sent} result SMS sent${failed > 0 ? ` · ${failed} failed (no phone)` : ''}`
          : 'Published, but no SMS went out (no phone numbers)',
      )
      if (failed > 0) toast.error(`${failed} guardians have no phone number`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Published, but the SMS failed to send')
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  } finally {
    smsBusy.value = false
  }
}

// Demo: fills empty cells with realistic random marks — then click Save Marks to save.
// Cells that already have marks are never overwritten. Absence is per-student now
// (at most 1 fully-absent student) — per-cell random absence is removed, otherwise
// with 14 subjects almost everyone would fail 1-2 subjects.
function autoFill(): void {
  if (locked.value) return
  const rand = (full: number): number => {
    if (full <= 0) return 0
    const pct = 0.45 + Math.random() * 0.5 // 45%–95%
    return Math.max(0, Math.min(full, Math.round(full * pct)))
  }
  // Of the students with fully empty cells, one will be marked fully absent
  const emptyRows = editable.filter((row) =>
    row.cells.every(
      (c) => !c.absent && (Number(c.cq) || 0) === 0 && (Number(c.mcq) || 0) === 0 && (Number(c.total) || 0) === 0,
    ),
  )
  const absentRowId = emptyRows.length > 0 && Math.random() < 0.3 ? emptyRows[Math.floor(Math.random() * emptyRows.length)]?.studentId : undefined
  let filled = 0
  for (const row of editable) {
    const fullAbsent = row.studentId === absentRowId
    for (const c of row.cells) {
      const empty =
        !c.absent &&
        (Number(c.cq) || 0) === 0 &&
        (Number(c.mcq) || 0) === 0 &&
        (Number(c.total) || 0) === 0
      if (!empty) continue
      if (fullAbsent) {
        c.absent = true
        filled += 1
        continue
      }
      // Sometimes a low score (fail case) for realism — 10% of cells get 10%–35%
      const weak = Math.random() < 0.1
      const pick = (full: number): number => {
        if (full <= 0) return 0
        if (weak) return Math.max(0, Math.min(full, Math.round(full * (0.1 + Math.random() * 0.25))))
        return rand(full)
      }
      if (c.mode === 'both' || c.mode === 'cq') c.cq = pick(c.cqFull)
      if (c.mode === 'both' || c.mode === 'mcq') c.mcq = pick(c.mcqFull)
      if (c.mode === 'single') c.total = pick(c.full)
      filled += 1
    }
  }
  if (filled === 0) toast.success('All cells already have marks')
  else toast.success(`${filled} cells filled with demo marks — click Save Marks`)
}

// ----- Subject setup: admin fallback fill + teacher assignment -----
const { mutateAsync: patchSubject, isPending: fillSaving } = usePatchExamSubject()
const fillAsk = ref(false)
const fillSubject = ref<ExamSubject | null>(null)
const fillError = ref('')
const fillForm = reactive({
  mode: 'both' as 'cq' | 'mcq' | 'both',
  cqFull: 70,
  cqPass: 23,
  mcqFull: 30,
  mcqPass: 10,
  passMarks: 33,
  passRule: 'separate' as 'separate' | 'combine',
})
const fillFull = computed(() => {
  if (fillForm.mode === 'both') return (Number(fillForm.cqFull) || 0) + (Number(fillForm.mcqFull) || 0)
  if (fillForm.mode === 'cq') return Number(fillForm.cqFull) || 0
  return Number(fillForm.mcqFull) || 0
})
function openFill(s: ExamSubject): void {
  fillSubject.value = s
  const m = cellMode(s)
  fillForm.mode = m === 'single' ? 'both' : m
  fillForm.cqFull = Number(s.cqFull) || 70
  fillForm.cqPass = Number(s.cqPass) || 23
  fillForm.mcqFull = Number(s.mcqFull) || 30
  fillForm.mcqPass = Number(s.mcqPass) || 10
  fillForm.passMarks = Number(s.passMarks) || 33
  fillForm.passRule = s.passRule === 'combine' ? 'combine' : 'separate'
  fillError.value = ''
  fillAsk.value = true
}
async function saveFill(): Promise<void> {
  const s = fillSubject.value
  if (!s) return
  const full = fillFull.value
  if (full <= 0) {
    fillError.value = 'Full marks must be above 0.'
    return
  }
  let payload: SubjectConfigInput
  if (fillForm.mode === 'cq') {
    payload = {
      fullMarks: full, passMarks: Number(fillForm.passMarks) || 0,
      cqFull: full, cqPass: Math.min(Number(fillForm.cqPass) || 0, full),
      mcqFull: 0, mcqPass: 0, passRule: 'separate',
    }
  } else if (fillForm.mode === 'mcq') {
    payload = {
      fullMarks: full, passMarks: Number(fillForm.passMarks) || 0,
      cqFull: 0, cqPass: 0,
      mcqFull: full, mcqPass: Math.min(Number(fillForm.mcqPass) || 0, full),
      passRule: 'separate',
    }
  } else {
    const combined = fillForm.passRule === 'combine'
    payload = {
      fullMarks: full, passMarks: Number(fillForm.passMarks) || 0,
      cqFull: Number(fillForm.cqFull) || 0,
      cqPass: combined ? 0 : Number(fillForm.cqPass) || 0,
      mcqFull: Number(fillForm.mcqFull) || 0,
      mcqPass: combined ? 0 : Number(fillForm.mcqPass) || 0,
      passRule: fillForm.passRule,
    }
  }
  fillError.value = ''
  try {
    await patchSubject({ id: examId.value, subjectId: s.id, input: payload })
    fillAsk.value = false
    toast.success(`${s.name} saved`)
  } catch (e) {
    fillError.value = e instanceof Error ? e.message : 'Save failed'
  }
}

const qc = useQueryClient()
const { data: teacherData } = useTeachers({})
const teacherChoices = computed(() => (teacherData.value?.data.items ?? []).filter((t) => t.kind !== 'staff'))
const assignAsk = ref(false)
const assignSubject = ref<ExamSubject | null>(null)
const assignTeacherId = ref('')
const assignError = ref('')
const assignSaving = ref(false)
function openAssign(s: ExamSubject): void {
  assignSubject.value = s
  assignTeacherId.value = s.teacherId || ''
  assignError.value = ''
  assignAsk.value = true
}
async function saveAssign(): Promise<void> {
  const s = assignSubject.value
  if (!s || !s.subjectId || !assignTeacherId.value) return
  assignSaving.value = true
  assignError.value = ''
  try {
    await teacherSubjectService.assign(assignTeacherId.value, s.subjectId)
    qc.invalidateQueries({ queryKey: ['exam'] })
    assignAsk.value = false
    toast.success(`Teacher assigned to ${s.name}`)
  } catch (e) {
    assignError.value = e instanceof Error ? e.message : 'Assign failed'
  } finally {
    assignSaving.value = false
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
  flex-wrap: wrap;
}
.marks-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  flex-wrap: wrap;
}
.marks-toolbar .search {
  max-width: 240px;
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
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: var(--spacing-md);
  align-items: start;
}
.grid > :deep(*) {
  min-width: 0;
}
.grid :deep(.app-card) {
  min-width: 0;
  overflow: hidden;
}
.grid :deep(.app-card__body) {
  min-width: 0;
  overflow-x: auto;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .page {
    padding: 0 var(--spacing-sm);
    overflow-x: clip;
  }
  .page__head {
    flex-direction: column;
    align-items: stretch;
  }
  .page__title {
    font-size: var(--font-size-xl);
    overflow-wrap: anywhere;
  }
  .head-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
  }
  .head-actions :deep(*) {
    min-width: 0;
  }
  .marks-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .marks-toolbar .search {
    max-width: none;
    width: 100%;
    min-height: 40px;
  }
  .sub-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 4px;
  }
  .sub-tab {
    flex: 0 0 auto;
    min-height: 32px;
  }
  .grid :deep(.app-card__body) {
    padding: var(--spacing-sm);
  }
  .table th,
  .table td {
    padding: var(--spacing-xs) var(--spacing-sm);
  }
  /* Mobile: no sticky columns — full X-scroll, everything scrolls including Roll */
  .col-rank,
  .col-student,
  .col-total,
  .col-action {
    position: static;
    box-shadow: none;
    max-width: none;
  }
  .col-rank {
    min-width: 40px;
    width: 40px;
  }
  .col-student {
    min-width: 120px;
    font-size: var(--font-size-xs);
    white-space: nowrap;
  }
  .col-sub {
    min-width: 160px;
  }
  .mini {
    max-width: none;
    width: 100%;
    min-width: 96px;
    min-height: 44px;
    font-size: 16px; /* iOS zoom prevent */
    padding: 0 var(--spacing-sm);
    border-width: 1.5px;
  }
}
.table-scroll {
  display: block;
  overflow-x: auto;
  overflow-y: visible;
  max-width: 100%;
  -webkit-overflow-scrolling: touch;
  scrollbar-gutter: stable;
}
.table-scroll .table {
  min-width: max-content;
  width: max-content;
  max-width: none;
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
/* Only the Roll column is sticky — everything else scrolls */
.col-rank {
  width: 44px;
  min-width: 44px;
  color: var(--color-text-muted);
  position: sticky;
  left: 0;
  background: var(--color-surface);
  z-index: 2;
  box-shadow: 1px 0 0 var(--color-border);
}
.col-student {
  background: var(--color-surface);
  min-width: 140px;
  max-width: 200px;
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}
.col-sub {
  min-width: 150px;
}
.col-part {
  min-width: 110px;
  text-align: center;
}
.col-part .mark-input {
  margin-inline: auto;
}
.col-status {
  min-width: 80px;
  text-align: center;
  white-space: nowrap;
}
.absent-check {
  width: 20px;
  height: 20px;
  accent-color: var(--color-danger);
  cursor: pointer;
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
  background: var(--color-surface);
}
.col-action {
  background: var(--color-surface);
  min-width: 68px;
  white-space: nowrap;
}
.mini {
  max-width: 76px;
}
.mark-input {
  background: var(--color-surface);
  border-width: 1.5px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}
/* Number spinner off — on mobile the tiny arrows covered the input */
.mark-input::-webkit-outer-spin-button,
.mark-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.mark-input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}
.mark-input:disabled {
  opacity: 0.55;
  background: var(--color-surface-alt);
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
.setup-card {
  margin-bottom: var(--spacing-lg);
}
.setup-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}
.setup-note {
  margin-bottom: var(--spacing-sm);
}
.setup-table td {
  vertical-align: middle;
}
.setup-name {
  font-weight: var(--font-weight-medium);
}
.setup-actions {
  display: flex;
  gap: var(--spacing-sm);
  white-space: nowrap;
}
.setup-actions .link-btn {
  border: 0;
  background: none;
  padding: 0;
  cursor: pointer;
  font-size: var(--font-size-sm);
}
.setup-actions .link-btn:disabled {
  color: var(--color-text-muted);
  cursor: not-allowed;
}
.chip--ok {
  background: var(--color-success-light);
  color: var(--color-success);
}
.chip--warn {
  background: var(--color-danger-light);
  color: var(--color-danger);
}
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(16, 24, 40, 0.45);
  display: grid;
  place-items: center;
  z-index: 60;
  padding: var(--spacing-lg);
}
.dialog {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-lg);
  width: min(460px, 100%);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.dialog__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}
.fill-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm) var(--spacing-md);
}
.fill-grid label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.fill-grid .span {
  grid-column: 1 / -1;
}
</style>
