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
        <label>Exam category
          <select v-model="form.category" class="app-input__control">
            <option value="cq">Only CQ</option>
            <option value="mcq">Only MCQ</option>
            <option value="both">CQ+MCQ</option>
          </select>
        </label>
        <label v-if="selectedClass?.hasDepartments">Department
          <select v-model="form.departmentId" class="app-input__control">
            <option :value="null">All departments</option>
            <option v-for="d in formDepartments" :key="d.id" :value="d.id">{{ d.label }}</option>
          </select>
        </label>
        <div v-if="form.departmentId" class="switch-row">
          <button class="switch" :class="{ 'switch--on': form.includeCommon }" type="button" role="switch" :aria-checked="form.includeCommon" aria-label="Common subjects soho" @click="form.includeCommon = !form.includeCommon">
            <span class="switch__knob" />
          </button>
          <span>Common subjects soho</span>
        </div>
        <div v-if="form.classId" class="span subj-head">
          <strong>Subjects</strong>
          <button class="link-btn" type="button" @click="addSubjectRow">+ Add subject</button>
        </div>
        <p v-if="!form.classId" class="muted span">Subject dekhte age class select koro.</p>
        <p v-if="form.classId && classSubjects.length === 0" class="muted span">Ei class e kono subject set kora nai — Academics theke add koro, ba + Add subject diye hate likho.</p>
        <template v-if="form.classId" v-for="[group, rows] in groupedSubjects" :key="group">
          <p v-if="groupedSubjects.length > 1" class="span group-head">{{ group }} ({{ rows.length }})</p>
          <div v-for="s in rows" :key="s.name" class="span subj-row">
            <input v-model="s.name" class="app-input__control" placeholder="Subject name" />
            <button class="link-btn link-btn--danger" type="button" @click="removeRow(s)">×</button>
          <div v-if="form.category === 'cq'" class="span split-grid">
            <label>CQ full<input v-model.number="s.cqFull" type="number" min="0" class="app-input__control" /></label>
            <label>CQ pass<input v-model.number="s.cqPass" type="number" min="0" class="app-input__control" /></label>
          </div>
          <div v-else-if="form.category === 'mcq'" class="span split-grid">
            <label>MCQ full<input v-model.number="s.mcqFull" type="number" min="0" class="app-input__control" /></label>
            <label>MCQ pass<input v-model.number="s.mcqPass" type="number" min="0" class="app-input__control" /></label>
          </div>
          <div v-else class="span split-grid">
            <label>CQ full<input v-model.number="s.cqFull" type="number" min="0" class="app-input__control" /></label>
            <label v-if="s.passRule === 'separate'">CQ pass<input v-model.number="s.cqPass" type="number" min="0" class="app-input__control" /></label>
            <label>MCQ full<input v-model.number="s.mcqFull" type="number" min="0" class="app-input__control" /></label>
            <label v-if="s.passRule === 'separate'">MCQ pass<input v-model.number="s.mcqPass" type="number" min="0" class="app-input__control" /></label>
            <label v-if="s.passRule !== 'separate'">Total pass<input v-model.number="s.passMarks" type="number" min="0" class="app-input__control" /></label>
            <label>Pass rule
              <select v-model="s.passRule" class="app-input__control">
                <option value="separate">Separate (CQ+MCQ alada pass)</option>
                <option value="combine">Combine (mot ei pass)</option>
              </select>
            </label>
          </div>
          </div>
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
import { useClasses, useCreateExam, useDepartments, useSections, useSubjects } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import type { ExamSubjectInput } from '@/types/models'

interface SubjectRow {
  name: string
  /** Group heading: "Common", department label, or "Additional". */
  group: string
  fullMarks: number
  passMarks: number
  cqFull: number
  cqPass: number
  mcqFull: number
  mcqPass: number
  passRule: 'separate' | 'combine'
}

const router = useRouter()
const toast = useToast()

const today = (): string => new Date().toISOString().slice(0, 10)
const blankSubject = (): SubjectRow => ({
  name: '', group: 'Additional', fullMarks: 100, passMarks: 33,
  cqFull: 70, cqPass: 23, mcqFull: 30, mcqPass: 10, passRule: 'separate',
})
const form = reactive({
  name: '',
  examDate: today(),
  classId: '',
  sectionId: null as string | null,
  departmentId: null as string | null,
  includeCommon: true,
  category: 'both' as 'cq' | 'mcq' | 'both',
  subjects: [blankSubject()] as SubjectRow[],
})
function addSubjectRow(): void {
  form.subjects.push(blankSubject())
}
// Row Full sob somoy split input er jogfol — hate likha Full ar CQ+MCQ er
// jog mil na hole backend reject kore, tai split bodlalei Full sync hoy.
// Ete nicher Total line o input onujayi dynamic dekhay.
watch(
  () => form.subjects.map((s) => [s.cqFull, s.mcqFull]),
  () => {
    for (const s of form.subjects) {
      if (form.category === 'both') s.fullMarks = (Number(s.cqFull) || 0) + (Number(s.mcqFull) || 0)
      else if (form.category === 'cq') s.fullMarks = Number(s.cqFull) || 0
      else s.fullMarks = Number(s.mcqFull) || 0
    }
  },
  { deep: true },
)
watch(
  () => form.category,
  (cat) => {
    for (const s of form.subjects) {
      if (cat === 'both') {
        s.cqFull = s.cqFull || Math.round((Number(s.fullMarks) || 0) * 0.7)
        s.mcqFull = s.mcqFull || (Number(s.fullMarks) || 0) - s.cqFull
      }
      else if (cat === 'cq') s.cqFull = s.cqFull || Number(s.fullMarks) || 0
      else s.mcqFull = s.mcqFull || Number(s.fullMarks) || 0
    }
  },
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
// Class select korlei Section e by default A bosbe (A na thakle prothomta).
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
  if (form.category === 'cq') {
    row.cqFull = 100
    row.cqPass = 33
  } else if (form.category === 'mcq') {
    row.mcqFull = 100
    row.mcqPass = 33
  }
  return row
}
// Class bodlale oi class er subject gula auto row hoye asbe — exam
// category onujayi default vag niye. Hate lekhar dorkar nai, chaile
// + Add subject diye extra add ba × diye sorano jabe.
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
// Heading soho group: Common age, tarpor department order e, Additional sese.
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
    formError.value = 'Age class select koro.'
    return
  }
  const subjects: ExamSubjectInput[] = []
  for (const r of form.subjects) {
    const name = r.name.trim()
    if (!name) continue
    const full = Number(r.fullMarks) || 0
    const pass = Number(r.passMarks) || 0
    if (form.category === 'cq') {      subjects.push({
        name, fullMarks: full, passMarks: pass,
        cqFull: full, cqPass: Math.min(Number(r.cqPass) || 0, full),
        mcqFull: 0, mcqPass: 0, passRule: 'separate',
      })
    } else if (form.category === 'mcq') {
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
  saving.value = true
  try {
    await createExam({
      name: form.name.trim(),
      examDate: form.examDate,
      classId: form.classId,
      sectionId: form.sectionId,
      departmentId: form.departmentId,
      subjects,
    })
    toast.success('Exam created')
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
</style>
