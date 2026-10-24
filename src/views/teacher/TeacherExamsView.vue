<template>
  <div class="page">
    <div class="page__head">
      <h1 class="page__title">Exam Marks</h1>
      <AppButton v-if="selectedId" variant="ghost" @click="selectedId = ''">← All exams</AppButton>
    </div>

    <AppCard v-if="!school.teacherExamAccess">
      <p class="muted">
        Teacher exam entry is off for this institute. The school admin fills exam subjects and marks.
      </p>
    </AppCard>

    <template v-else-if="!selectedId">
      <AppSkeleton v-if="listLoading" variant="table" :rows="8" :cols="7" />
      <p v-else-if="listErrorMessage" class="error">{{ listErrorMessage }}</p>
      <p v-else-if="exams.length === 0" class="muted">
        No exams with your subjects yet. The admin creates exams and assigns teachers from the exam page.
      </p>
      <AppCard v-else>
        <div class="table-scroll">
          <table class="table">
            <thead>
              <tr><th>Exam</th><th>Date</th><th>Class</th><th>My Subjects</th><th>To do</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="e in exams" :key="e.id">
                <td class="strong">{{ e.name }}</td>
                <td>{{ e.examDate }}</td>
                <td>{{ classLabel(e.classId) }}</td>
                <td>
                  <span
                    v-for="s in e.subjects"
                    :key="s.id"
                    class="chip"
                    :class="isConfigured(s) ? 'chip--ok' : 'chip--warn'"
                  >{{ s.name }}</span>
                </td>
                <td>
                  <span v-if="workById.get(e.id)" class="chip chip--warn">{{ todoLabel(e.id) }}</span>
                  <span v-else class="muted">—</span>
                </td>
                <td><span class="pill" :class="`pill--${e.status}`">{{ e.status }}</span></td>
                <td><button class="link-btn" type="button" @click="openExam(e.id)">Open</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>
    </template>

    <template v-else>
      <div v-if="detailLoading" class="sk-stack">
        <AppSkeleton variant="lines" :lines="2" />
        <AppSkeleton variant="card" />
        <AppSkeleton variant="card" />
      </div>
      <p v-else-if="!exam" class="error">Exam not found.</p>
      <template v-else>
        <div class="meta-row">
          <span class="meta"><span class="meta__key">Date</span>{{ exam.examDate }}</span>
          <span class="meta"><span class="meta__key">Class</span>{{ classLabel(exam.classId) }}</span>
          <span class="pill" :class="`pill--${exam.status}`">{{ exam.status }}</span>
        </div>
        <p v-if="locked" class="muted locked-note">
          Published &amp; locked — ask the admin to unpublish if a mark needs fixing.
        </p>

        <div class="sub-tabs">
          <button
            v-for="t in exam.subjects"
            :key="t.id"
            class="sub-tab"
            :class="{ 'sub-tab--active': activeSubjectId === t.id }"
            type="button"
            @click="activeSubjectId = t.id"
          >{{ t.name }}<span v-if="!isConfigured(t)" class="dot"></span></button>
        </div>

        <div v-if="activeSubject" class="grid">
          <AppCard title="Subject Setup">
            <div class="setup-head">
              <span class="strong">{{ activeSubject.name }}</span>
              <span class="chip" :class="isConfigured(activeSubject) ? 'chip--ok' : 'chip--warn'">
                {{ isConfigured(activeSubject) ? setupSummary(activeSubject) : 'Not filled yet' }}
              </span>
            </div>
            <form v-if="showCfgForm" class="form" @submit.prevent="saveCfg">
              <label>Category
                <select v-model="cfg.mode" class="app-input__control">
                  <option value="cq">Only CQ</option>
                  <option value="mcq">Only MCQ</option>
                  <option value="both">CQ+MCQ</option>
                </select>
              </label>
              <div v-if="cfg.mode === 'cq'" class="form-row">
                <label>CQ full<input v-model.number="cfg.cqFull" type="number" min="0" class="app-input__control" /></label>
                <label>CQ pass<input v-model.number="cfg.cqPass" type="number" min="0" class="app-input__control" /></label>
              </div>
              <div v-else-if="cfg.mode === 'mcq'" class="form-row">
                <label>MCQ full<input v-model.number="cfg.mcqFull" type="number" min="0" class="app-input__control" /></label>
                <label>MCQ pass<input v-model.number="cfg.mcqPass" type="number" min="0" class="app-input__control" /></label>
              </div>
              <template v-else>
                <div class="form-row">
                  <label>CQ full<input v-model.number="cfg.cqFull" type="number" min="0" class="app-input__control" /></label>
                  <label v-if="cfg.passRule === 'separate'">CQ pass<input v-model.number="cfg.cqPass" type="number" min="0" class="app-input__control" /></label>
                </div>
                <div class="form-row">
                  <label>MCQ full<input v-model.number="cfg.mcqFull" type="number" min="0" class="app-input__control" /></label>
                  <label v-if="cfg.passRule === 'separate'">MCQ pass<input v-model.number="cfg.mcqPass" type="number" min="0" class="app-input__control" /></label>
                </div>
                <label>Pass rule
                  <select v-model="cfg.passRule" class="app-input__control">
                    <option value="separate">Separate (pass each part)</option>
                    <option value="combine">Combine (total decides)</option>
                  </select>
                </label>
              </template>
              <label v-if="cfg.mode === 'both' && cfg.passRule === 'combine'">Pass marks<input v-model.number="cfg.passMarks" type="number" min="0" class="app-input__control" /></label>
              <p class="muted">Full marks: {{ cfgFull }} (sum of the parts in use)</p>
              <p v-if="cfgError" class="error">{{ cfgError }}</p>
              <div class="form-actions">
                <AppButton v-if="isConfigured(activeSubject)" variant="ghost" type="button" :disabled="savingCfg" @click="editing = false">Cancel</AppButton>
                <AppButton type="submit" :loading="savingCfg">Save Setup</AppButton>
              </div>
            </form>
            <div v-else class="setup-done">
              <p v-if="canConfig" class="muted">Marks bars are set. Student marks entry is on the right.</p>
              <p v-else-if="isConfigured(activeSubject)" class="muted">
                The admin sets up the subject bars in this mode — enter the students' marks on the right.
              </p>
              <p v-else class="muted">
                The admin has not set up this subject yet. Marks entry opens once the setup is done.
              </p>
              <AppButton v-if="canConfig" variant="ghost" :disabled="locked" @click="editing = true">Edit Setup</AppButton>
            </div>
          </AppCard>

          <AppCard title="Student Marks">
            <p v-if="!isConfigured(activeSubject)" class="muted">
              {{ canConfig
                ? "Fill the subject setup first — then enter the students' marks here."
                : 'The admin has not set up this subject yet. Marks entry opens once the setup is done.' }}
            </p>
            <template v-else>
              <div class="table-scroll">
                <table class="table marks-table">
                  <thead>
                    <tr>
                      <th class="col-roll">Roll</th>
                      <th>Student</th>
                      <th v-if="mode === 'both'">CQ · /{{ activeSubject.cqFull }}</th>
                      <th v-if="mode === 'both'">MCQ · /{{ activeSubject.mcqFull }}</th>
                      <th v-else-if="mode === 'cq'">CQ · /{{ activeSubject.cqFull }}</th>
                      <th v-else-if="mode === 'mcq'">MCQ · /{{ activeSubject.mcqFull }}</th>
                      <th v-else>Marks · /{{ activeSubject.fullMarks }}</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Absent</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in rows" :key="r.studentId">
                      <td class="col-roll">{{ r.roll ?? '—' }}</td>
                      <td class="col-name">{{ r.studentName }}</td>
                      <td v-if="mode === 'both'">
                        <input v-model.number="r.cq" type="number" inputmode="decimal" placeholder="0" :min="0" :max="activeSubject.cqFull" :disabled="locked || r.absent || savingMarks" class="app-input__control mini" />
                      </td>
                      <td v-if="mode === 'both'">
                        <input v-model.number="r.mcq" type="number" inputmode="decimal" placeholder="0" :min="0" :max="activeSubject.mcqFull" :disabled="locked || r.absent || savingMarks" class="app-input__control mini" />
                      </td>
                      <td v-else-if="mode === 'cq'">
                        <input v-model.number="r.cq" type="number" inputmode="decimal" placeholder="0" :min="0" :max="activeSubject.cqFull" :disabled="locked || r.absent || savingMarks" class="app-input__control mini" />
                      </td>
                      <td v-else-if="mode === 'mcq'">
                        <input v-model.number="r.mcq" type="number" inputmode="decimal" placeholder="0" :min="0" :max="activeSubject.mcqFull" :disabled="locked || r.absent || savingMarks" class="app-input__control mini" />
                      </td>
                      <td v-else>
                        <input v-model.number="r.total" type="number" inputmode="decimal" placeholder="0" :min="0" :max="activeSubject.fullMarks" :disabled="locked || r.absent || savingMarks" class="app-input__control mini" />
                      </td>
                      <td class="col-total"><strong>{{ rowTotal(r) }}</strong></td>
                      <td class="col-status">
                        <span class="chip" :class="r.absent ? 'chip--muted' : passed(r) ? 'chip--ok' : 'chip--warn'">
                          {{ r.absent ? 'Absent' : passed(r) ? 'Pass' : 'Fail' }}
                        </span>
                      </td>
                      <td class="col-status">
                        <input v-model="r.absent" type="checkbox" :disabled="locked || savingMarks" class="absent-check" />
                      </td>
                    </tr>
                    <tr v-if="rows.length === 0">
                      <td colspan="6" class="muted">No students in this class/section.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="marks-actions">
                <span class="muted">{{ rows.length }} students</span>
                <AppButton :disabled="locked || rows.length === 0" :loading="savingMarks" @click="saveMarksForSubject">
                  Save Marks
                </AppButton>
              </div>
            </template>
          </AppCard>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import {
  useClasses,
  useSaveTeacherMarks,
  useSaveTeacherSubject,
  useTeacherExam,
  useTeacherExamSummary,
  useTeacherExams,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { useSchoolStore } from '@/stores/school'
import type { ExamSubject, SubjectConfigInput, TeacherExamMarkInput, TeacherExamWorkItem } from '@/types/models'

const toast = useToast()
const school = useSchoolStore()

// ----- own exams list -----
const { data: listData, isLoading: listLoading, error: listErrorObj } = useTeacherExams(() => school.teacherExamAccess)
const exams = computed(() => listData.value?.data ?? [])
const listErrorMessage = computed(() => (listErrorObj.value instanceof Error ? listErrorObj.value.message : ''))

const { data: classData } = useClasses()
const classLabel = (id: string): string => classData.value?.data.find((c) => c.id === id)?.label ?? id

// Pending-work counts per exam — same source as the sidebar badge. The chips
// above already flag unconfigured subject rows; this adds the marks side so
// the teacher can see what actually blocks a publish.
const { data: summaryData } = useTeacherExamSummary(() => school.teacherExamAccess)
const workById = computed(() => {
  const map = new Map<string, TeacherExamWorkItem>()
  for (const item of summaryData.value?.data.items ?? []) map.set(item.examId, item)
  return map
})
function todoLabel(examId: string): string {
  const item = workById.value.get(examId)
  if (!item) return '—'
  const parts: string[] = []
  if (item.setupSubjects > 0) parts.push(`${item.setupSubjects} setup`)
  if (item.marksSubjects > 0) parts.push(`${item.marksSubjects} marks`)
  return parts.join(' · ')
}

// ----- one exam: own subjects + marks -----
const selectedId = ref('')
const activeSubjectId = ref('')
function openExam(id: string): void {
  selectedId.value = id
  activeSubjectId.value = ''
}

const { data: detailData, isLoading: detailLoading } = useTeacherExam(selectedId)
const exam = computed(() => detailData.value?.data)
const locked = computed(() => exam.value?.status === 'published')
// Shell mode keeps the subject bars with the teacher; marks-only mode keeps
// them admin-owned (the panel shows the summary read-only).
const canConfig = computed(() => exam.value?.canConfig ?? false)
const activeSubject = computed(() => exam.value?.subjects.find((s) => s.id === activeSubjectId.value) ?? null)

watch(
  exam,
  (e) => {
    if (!e) return
    if (!e.subjects.some((s) => s.id === activeSubjectId.value)) {
      activeSubjectId.value = e.subjects[0]?.id ?? ''
    }
  },
  { immediate: true },
)

type CellMode = 'single' | 'cq' | 'mcq' | 'both'
function cellMode(s: ExamSubject): CellMode {
  const cq = Number(s.cqFull) || 0
  const mcq = Number(s.mcqFull) || 0
  if (cq > 0 && mcq > 0) return 'both'
  if (cq > 0) return 'cq'
  if (mcq > 0) return 'mcq'
  return 'single'
}
function isConfigured(s: ExamSubject): boolean {
  return s.configured ?? (Number(s.fullMarks) || 0) > 0
}
function setupSummary(s: ExamSubject): string {
  const m = cellMode(s)
  if (m === 'both') return `CQ ${s.cqFull} + MCQ ${s.mcqFull}`
  if (m === 'cq') return `CQ · Full ${s.fullMarks}`
  if (m === 'mcq') return `MCQ · Full ${s.fullMarks}`
  return `Full ${s.fullMarks}`
}
const mode = computed<CellMode>(() => (activeSubject.value ? cellMode(activeSubject.value) : 'single'))

// ----- subject setup form -----
const editing = ref(false)
const cfgError = ref('')
const cfg = reactive({
  mode: 'both' as 'cq' | 'mcq' | 'both',
  cqFull: 70,
  cqPass: 23,
  mcqFull: 30,
  mcqPass: 10,
  passMarks: 33,
  passRule: 'separate' as 'separate' | 'combine',
})
const cfgFull = computed(() => {
  if (cfg.mode === 'both') return (Number(cfg.cqFull) || 0) + (Number(cfg.mcqFull) || 0)
  if (cfg.mode === 'cq') return Number(cfg.cqFull) || 0
  return Number(cfg.mcqFull) || 0
})
function syncCfg(s: ExamSubject | null): void {
  if (!s) return
  const m = cellMode(s)
  cfg.mode = m === 'single' ? 'both' : m
  cfg.cqFull = Number(s.cqFull) || 70
  cfg.cqPass = Number(s.cqPass) || 23
  cfg.mcqFull = Number(s.mcqFull) || 30
  cfg.mcqPass = Number(s.mcqPass) || 10
  cfg.passMarks = Number(s.passMarks) || 33
  cfg.passRule = s.passRule === 'combine' ? 'combine' : 'separate'
}
watch(
  activeSubject,
  (s) => {
    syncCfg(s)
    editing.value = false
    cfgError.value = ''
  },
  { immediate: true },
)
const showCfgForm = computed(
  () =>
    canConfig.value &&
    Boolean(activeSubject.value) &&
    (!isConfigured(activeSubject.value as ExamSubject) || editing.value),
)

const { mutateAsync: saveSubject, isPending: savingCfg } = useSaveTeacherSubject()
function buildCfgPayload(): SubjectConfigInput | null {
  const full = cfgFull.value
  if (full <= 0) {
    cfgError.value = 'Full marks must be above 0.'
    return null
  }
  if (cfg.mode === 'cq') {
    // Only CQ: the CQ pass is the subject's pass mark — no second number.
    const cqPass = Math.min(Number(cfg.cqPass) || 0, full)
    return {
      fullMarks: full, passMarks: cqPass,
      cqFull: full, cqPass,
      mcqFull: 0, mcqPass: 0, passRule: 'separate',
    }
  }
  if (cfg.mode === 'mcq') {
    // Only MCQ: the MCQ pass is the subject's pass mark — no second number.
    const mcqPass = Math.min(Number(cfg.mcqPass) || 0, full)
    return {
      fullMarks: full, passMarks: mcqPass,
      cqFull: 0, cqPass: 0,
      mcqFull: full, mcqPass,
      passRule: 'separate',
    }
  }
  const combined = cfg.passRule === 'combine'
  const cqPass = Number(cfg.cqPass) || 0
  const mcqPass = Number(cfg.mcqPass) || 0
  return {
    fullMarks: full,
    // Combine has one total bar; separate passes on each part alone.
    passMarks: combined ? Number(cfg.passMarks) || 0 : cqPass + mcqPass,
    cqFull: Number(cfg.cqFull) || 0,
    cqPass: combined ? 0 : cqPass,
    mcqFull: Number(cfg.mcqFull) || 0,
    mcqPass: combined ? 0 : mcqPass,
    passRule: cfg.passRule,
  }
}
async function saveCfg(): Promise<void> {
  const s = activeSubject.value
  const e = exam.value
  if (!s || !e) return
  cfgError.value = ''
  const payload = buildCfgPayload()
  if (!payload) return
  try {
    await saveSubject({ examId: e.id, subjectId: s.id, input: payload })
    editing.value = false
    toast.success(`${s.name} setup saved`)
  } catch (err) {
    cfgError.value = err instanceof Error ? err.message : 'Save failed'
  }
}

// ----- student marks -----
interface TeacherRow {
  studentId: string
  studentName: string
  roll?: number | null
  cq: number
  mcq: number
  total: number
  absent: boolean
}
const rows = reactive<TeacherRow[]>([])
watch(
  [exam, activeSubjectId],
  () => {
    rows.length = 0
    const e = exam.value
    const sid = activeSubjectId.value
    if (!e || !sid) return
    for (const st of e.students ?? []) {
      const m = st.marks[sid]
      rows.push({
        studentId: st.studentId,
        studentName: st.studentName,
        roll: st.roll ?? null,
        cq: m?.cq ?? 0,
        mcq: m?.mcq ?? 0,
        total: m?.total ?? 0,
        absent: m?.absent ?? false,
      })
    }
  },
  { immediate: true },
)

function rowTotal(r: TeacherRow): number {
  if (r.absent) return 0
  if (mode.value === 'both') return (Number(r.cq) || 0) + (Number(r.mcq) || 0)
  if (mode.value === 'cq') return Number(r.cq) || 0
  if (mode.value === 'mcq') return Number(r.mcq) || 0
  return Number(r.total) || 0
}
// Same rule as the backend subject_pass.
function passed(r: TeacherRow): boolean {
  const s = activeSubject.value
  if (!s || r.absent) return false
  const total = rowTotal(r)
  if (mode.value === 'single') return total >= (Number(s.passMarks) || 0)
  const cqOk = (Number(s.cqFull) || 0) <= 0 || (Number(r.cq) || 0) >= (Number(s.cqPass) || 0)
  const mcqOk = (Number(s.mcqFull) || 0) <= 0 || (Number(r.mcq) || 0) >= (Number(s.mcqPass) || 0)
  if (s.passRule === 'combine') return total >= (Number(s.passMarks) || 0)
  return Boolean(cqOk && mcqOk)
}

const { mutateAsync: saveMarks, isPending: savingMarks } = useSaveTeacherMarks()
async function saveMarksForSubject(): Promise<void> {
  const s = activeSubject.value
  const e = exam.value
  if (!s || !e) return
  const marks: TeacherExamMarkInput[] = rows.map((r) => {
    const pack: TeacherExamMarkInput = { studentId: r.studentId, absent: r.absent }
    if (mode.value === 'both') {
      pack.cq = Number(r.cq) || 0
      pack.mcq = Number(r.mcq) || 0
    } else if (mode.value === 'cq') {
      pack.cq = Number(r.cq) || 0
    } else if (mode.value === 'mcq') {
      pack.mcq = Number(r.mcq) || 0
    } else {
      pack.total = Number(r.total) || 0
    }
    return pack
  })
  try {
    await saveMarks({ examId: e.id, subjectId: s.id, marks })
    toast.success(`${s.name} marks saved`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Save failed')
  }
}
</script>

<style scoped>
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: 0;
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
}
.strong {
  font-weight: var(--font-weight-semibold);
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
.col-roll {
  width: 48px;
  color: var(--color-text-muted);
}
.col-name {
  font-weight: var(--font-weight-medium);
}
.col-total {
  text-align: right;
}
.col-status {
  text-align: center;
}
.mini {
  max-width: 84px;
}
.absent-check {
  width: 24px;
  height: 24px;
  accent-color: var(--color-danger);
  cursor: pointer;
}
.pill {
  display: inline-block;
  padding: 1px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: capitalize;
}
.pill--draft {
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}
.pill--active {
  background: var(--color-warning-light);
  color: var(--color-warning);
}
.pill--published {
  background: var(--color-success-light);
  color: var(--color-success);
}
.chip {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
}
.chip + .chip {
  margin-left: var(--spacing-xs);
}
.chip--ok {
  background: var(--color-success-light);
  color: var(--color-success);
}
.chip--warn {
  background: var(--color-danger-light);
  color: var(--color-danger);
}
.chip--muted {
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}
.link-btn {
  border: 0;
  background: none;
  padding: 0;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-xs);
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
.locked-note {
  margin-bottom: var(--spacing-md);
}
.sub-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin: var(--spacing-md) 0;
}
.sub-tab {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-full);
  padding: 4px var(--spacing-md);
  font-size: var(--font-size-xs);
  cursor: pointer;
}
.sub-tab--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-primary-contrast);
  font-weight: var(--font-weight-semibold);
}
.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-danger);
  margin-left: 6px;
  vertical-align: middle;
}
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: var(--spacing-md);
  align-items: start;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
.setup-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  flex-wrap: wrap;
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.form label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}
.setup-done {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-sm);
}
.marks-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  flex-wrap: wrap;
}
</style>
