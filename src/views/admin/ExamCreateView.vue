<template>
  <div class="page">
    <div class="page__head">
      <div>
        <button class="link-btn" type="button" @click="goBack">← Exams</button>
        <h1 class="page__title">New Exam</h1>
      </div>
    </div>

    <AppCard>
      <form class="form-grid" @submit.prevent="save">
        <label class="span">Exam name<input v-model="form.name" class="app-input__control" placeholder="e.g. Half-Yearly Exam" required /></label>
        <label>Date<input v-model="form.examDate" type="date" class="app-input__control" required /></label>
        <label>Class
          <select v-model="form.classId" class="app-input__control" required>
            <option value="">Select your class</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
        </label>
        <label v-if="form.classId">Section
          <select v-model="form.sectionId" class="app-input__control">
            <option :value="null">All</option>
            <option v-for="s in formSections" :key="s.id" :value="s.id">{{ s.label }}</option>
          </select>
        </label>
        <label v-if="selectedClass?.hasDepartments">Department
          <select v-model="form.departmentId" class="app-input__control">
            <option :value="null">All departments</option>
            <option v-for="d in formDepartments" :key="d.id" :value="d.id">{{ d.label }}</option>
          </select>
        </label>
        <div v-if="form.departmentId" class="switch-row">
          <button class="switch" :class="{ 'switch--on': form.includeCommon }" type="button" role="switch" :aria-checked="form.includeCommon" aria-label="Include common subjects" @click="form.includeCommon = !form.includeCommon">
            <span class="switch__knob" />
          </button>
          <span>Include common subjects</span>
        </div>
        <template v-if="teacherMode && form.classId">
          <div class="span subj-head"><strong>Subjects (auto)</strong></div>
          <p class="muted span">
            Teacher entry is on: you create only the exam shell — each subject's teacher fills its
            category, marks bars and student marks from the teacher panel. An exam with subjects
            still waiting cannot be published.
          </p>
          <p v-if="classSubjects.length === 0" class="muted span">No subjects set for this class — add them from Academics first.</p>
          <div v-for="s in classSubjects" :key="s.id" class="span owner-row">
            <span class="owner-row__name">{{ s.label }}</span>
            <span v-if="ownerOf(s.id)" class="chip chip--ok">{{ ownerOf(s.id) }}</span>
          </div>
        </template>
        <template v-else>
        <div v-if="form.classId" class="span subj-head">
          <strong>Subjects</strong>
          <button class="link-btn" type="button" @click="addSubjectRow">+ Add subject</button>
        </div>
        <p v-if="!form.classId" class="muted span">Select a class first to see subjects.</p>
        <p v-if="form.classId && classSubjects.length === 0" class="muted span">No subjects set for this class — add them from Academics, or write your own with + Add subject.</p>
        <template v-if="form.classId" v-for="[group, rows] in groupedSubjects" :key="group">
          <p v-if="groupedSubjects.length > 1" class="span group-head">{{ group }} ({{ rows.length }})</p>
          <div v-for="s in rows" :key="s.name" class="span subj-row">
            <input v-model="s.name" class="app-input__control" placeholder="Subject name" />
            <button class="link-btn link-btn--danger" type="button" @click="removeRow(s)">×</button>
            <div class="span split-grid">
              <label>Category
                <select v-model="s.mode" class="app-input__control">
                  <option value="cq">Only CQ</option>
                  <option value="mcq">Only MCQ</option>
                  <option value="both">CQ+MCQ</option>
                </select>
              </label>
              <template v-if="s.mode === 'cq'">
                <label>CQ full<input v-model.number="s.cqFull" type="number" min="0" class="app-input__control" /></label>
                <label>CQ pass<input v-model.number="s.cqPass" type="number" min="0" class="app-input__control" /></label>
              </template>
              <template v-else-if="s.mode === 'mcq'">
                <label>MCQ full<input v-model.number="s.mcqFull" type="number" min="0" class="app-input__control" /></label>
                <label>MCQ pass<input v-model.number="s.mcqPass" type="number" min="0" class="app-input__control" /></label>
              </template>
              <template v-else>
                <label>CQ full<input v-model.number="s.cqFull" type="number" min="0" class="app-input__control" /></label>
                <label v-if="s.passRule === 'separate'">CQ pass<input v-model.number="s.cqPass" type="number" min="0" class="app-input__control" /></label>
                <label>MCQ full<input v-model.number="s.mcqFull" type="number" min="0" class="app-input__control" /></label>
                <label v-if="s.passRule === 'separate'">MCQ pass<input v-model.number="s.mcqPass" type="number" min="0" class="app-input__control" /></label>
                <label v-if="s.passRule !== 'separate'">Total pass<input v-model.number="s.passMarks" type="number" min="0" class="app-input__control" /></label>
                <label>Pass rule
                  <select v-model="s.passRule" class="app-input__control">
                    <option value="separate">Separate (CQ + MCQ pass separately)</option>
                    <option value="combine">Combine (total decides pass)</option>
                  </select>
                </label>
              </template>
            </div>
          </div>
        </template>
        </template>
        <p v-if="formError" class="error span">{{ formError }}</p>
        <div class="form-actions">
          <AppButton variant="ghost" type="button" @click="goBack">Cancel</AppButton>
          <AppButton type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Create' }}</AppButton>
        </div>
      </form>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import { useClasses, useClassSubjectTeachers, useCreateExam, useDepartments, useSections, useSubjects } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { useSchoolStore } from '@/stores/school'
import type { ExamSubjectInput } from '@/types/models'

interface SubjectRow {
  name: string
  /** Group heading: "Common", department label, or "Additional". */
  group: string
  fullMarks: number
  passMarks: number
  /** Per-subject category — one exam can mix CQ-only, MCQ-only and CQ+MCQ subjects. */
  mode: 'cq' | 'mcq' | 'both'
  cqFull: number
  cqPass: number
  mcqFull: number
  mcqPass: number
  passRule: 'separate' | 'combine'
}

const router = useRouter()
const toast = useToast()
const school = useSchoolStore()
/** Teacher-entry mode: admin makes the shell, each subject's teacher fills it. */
const teacherMode = computed(() => school.teacherExamEntry)

const today = (): string => new Date().toISOString().slice(0, 10)
const blankSubject = (): SubjectRow => ({
  name: '', group: 'Additional', fullMarks: 100, passMarks: 33,
  mode: 'both',
  cqFull: 70, cqPass: 23, mcqFull: 30, mcqPass: 10, passRule: 'separate',
})
const form = reactive({
  name: '',
  examDate: today(),
  classId: '',
  sectionId: null as string | null,
  departmentId: null as string | null,
  includeCommon: true,
  subjects: [blankSubject()] as SubjectRow[],
})
function addSubjectRow(): void {
  form.subjects.push(blankSubject())
}
// Row Full always follows the fields the row's own category uses — the backend
// rejects a hand-typed Full that disagrees with CQ+MCQ, so Full syncs whenever
// a part (or the category) changes.
// This also keeps the Total line below dynamic with the inputs.
watch(
  () => form.subjects.map((s) => [s.mode, s.cqFull, s.mcqFull]),
  () => {
    for (const s of form.subjects) {
      if (s.mode === 'both') s.fullMarks = (Number(s.cqFull) || 0) + (Number(s.mcqFull) || 0)
      else if (s.mode === 'cq') s.fullMarks = Number(s.cqFull) || 0
      else s.fullMarks = Number(s.mcqFull) || 0
    }
  },
  { deep: true },
)

const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])
const selectedClass = computed(() => classes.value.find((c) => c.id === form.classId))
watch(() => form.classId, () => {
  form.sectionId = null
  form.departmentId = null
  form.includeCommon = true
})
const { data: formSectionData } = useSections(() => form.classId || undefined)
const formSections = computed(() => formSectionData.value?.data ?? [])
// Selecting a class defaults Section to A (first one if there is no A).
watch(formSections, (list) => {
  if (!form.classId || form.sectionId || list.length === 0) return
  form.sectionId = list.find((s) => s.label.trim().toLowerCase() === 'a')?.id ?? list[0]?.id ?? null
})
const { data: formDeptData } = useDepartments(() => form.classId || undefined)
const formDepartments = computed(() => formDeptData.value?.data ?? [])
const { data: classSubjectData } = useSubjects(() => form.classId || undefined)
const classSubjects = computed(() => {
  const list = (classSubjectData.value?.data ?? []).filter((s) => s.category === 'subject')
  let scoped = list
  if (form.departmentId) {
    scoped = form.includeCommon
      ? list.filter((s) => !s.departmentId || s.departmentId === form.departmentId)
      : list.filter((s) => s.departmentId === form.departmentId)
  }
  const seen = new Set<string>()
  return scoped.filter((s) => {
    const key = s.label.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

function rowFromLabel(label: string, group: string): SubjectRow {
  const row = blankSubject()
  row.name = label
  row.group = group
  return row
}
// Teacher-entry preview: who owns each class subject right now. Match by the
// subject row id (not the label) — a class can hold same-label rows in
// different departments (e.g. Arts Science vs Commerce Science), each with
// its own teacher, and only the row that will be created matters here.
const { data: classTeacherData } = useClassSubjectTeachers(() => form.classId || undefined)
const classTeacherRows = computed(() => classTeacherData.value?.data ?? [])
const ownerBySubjectId = computed(() => {
  const map = new Map<string, string>()
  for (const r of classTeacherRows.value) {
    if (r.subjectId && r.teacherName && !map.has(r.subjectId)) map.set(r.subjectId, r.teacherName)
  }
  return map
})
function ownerOf(subjectId: string): string {
  return ownerBySubjectId.value.get(subjectId) ?? ''
}
// Changing class auto-fills that class's subjects as rows (default CQ+MCQ).
// Per-row Category can be switched to Only CQ / Only MCQ as needed —
// no typing needed, extras with + Add subject or drop with ×.
watch(classSubjects, (list) => {
  if (!form.classId) {
    form.subjects = []
    return
  }
  form.subjects = list.map((s) => rowFromLabel(s.label, s.departmentId ? (s.department || 'Department') : 'Common'))
})
function removeRow(row: SubjectRow): void {
  const i = form.subjects.indexOf(row)
  if (i >= 0) form.subjects.splice(i, 1)
}
// Grouped with headings: Common first, then departments in order, Additional last.
const groupedSubjects = computed(() => {
  const order = new Map<string, number>()
  order.set('Common', 0)
  formDepartments.value.forEach((d, i) => order.set(d.label, i + 1))
  const groups = new Map<string, SubjectRow[]>()
  for (const s of form.subjects) {
    const g = s.group || 'Common'
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g)?.push(s)
  }
  return [...groups.entries()].sort(
    ([a], [b]) => (order.get(a) ?? 999) - (order.get(b) ?? 999),
  )
})

const formError = ref('')
const saving = ref(false)
const { mutateAsync: createExam } = useCreateExam()

function goBack(): void {
  router.push('/admin/exams')
}

async function save(): Promise<void> {
  formError.value = ''
  if (!form.classId) {
    formError.value = 'Select a class first.'
    return
  }
  const subjects: ExamSubjectInput[] = []
  if (!teacherMode.value) {
    for (const r of form.subjects) {
      const name = r.name.trim()
      if (!name) continue
      const full = Number(r.fullMarks) || 0
      const pass = Number(r.passMarks) || 0
      if (r.mode === 'cq') {
        subjects.push({
          name, fullMarks: full, passMarks: pass,
          cqFull: full, cqPass: Math.min(Number(r.cqPass) || 0, full),
          mcqFull: 0, mcqPass: 0, passRule: 'separate',
        })
      } else if (r.mode === 'mcq') {
        subjects.push({
          name, fullMarks: full, passMarks: pass,
          cqFull: 0, cqPass: 0,
          mcqFull: full, mcqPass: Math.min(Number(r.mcqPass) || 0, full),
          passRule: 'separate',
        })
      } else {
        const combined = r.passRule !== 'separate'
        subjects.push({
          name, fullMarks: full, passMarks: pass,
          cqFull: Number(r.cqFull) || 0,
          cqPass: combined ? 0 : Number(r.cqPass) || 0,
          mcqFull: Number(r.mcqFull) || 0,
          mcqPass: combined ? 0 : Number(r.mcqPass) || 0,
          passRule: r.passRule,
        })
      }
    }
    if (!subjects.length) {
      formError.value = 'Add at least one subject.'
      return
    }
  }
  saving.value = true
  try {
    const base = {
      name: form.name.trim(),
      examDate: form.examDate,
      classId: form.classId,
      sectionId: form.sectionId,
      departmentId: form.departmentId,
    }
    if (teacherMode.value) {
      // Shell only — the backend seeds the class's subjects as pending rows.
      await createExam({ ...base, includeCommon: form.includeCommon })
      toast.success('Exam created — teachers will fill their subjects')
    } else {
      await createExam({ ...base, subjects })
      toast.success('Exam created')
    }
    router.push('/admin/exams')
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
}
.form-grid label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.switch-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  align-self: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
}
.switch {
  position: relative;
  width: 40px;
  height: 22px;
  flex: none;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface-alt);
  padding: 0;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}
.switch--on {
  background: var(--color-primary);
  border-color: var(--color-primary);
}
.switch__knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  background: #fff;
  box-shadow: var(--shadow-sm);
  transition: left var(--transition-fast);
}
.switch--on .switch__knob {
  left: 20px;
}
.span {
  grid-column: 1 / -1;
}
.form-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}
.subj-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.group-head {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: var(--spacing-sm) 0 0;
}
.subj-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--spacing-xs);
  align-items: center;
  padding: var(--spacing-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.split-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--spacing-xs);
}
.split-grid label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-xs);
}
.link-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  line-height: inherit;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
}
.link-btn--danger {
  color: var(--color-danger);
}
.owner-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}
.owner-row__name {
  font-weight: var(--font-weight-medium);
}
.chip {
  flex: none;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
}
.chip--ok {
  background: color-mix(in srgb, var(--color-success, #16a34a) 15%, transparent);
  color: var(--color-success, #16a34a);
}
.chip--warn {
  background: color-mix(in srgb, var(--color-warning, #d97706) 15%, transparent);
  color: var(--color-warning, #d97706);
}
</style>
