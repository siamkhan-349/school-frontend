<template>
  <div class="page">
    <div class="page__head">
      <div>
        <button class="link-btn" type="button" @click="goBack">← Routine</button>
        <h1 class="page__title">{{ isEdit ? 'Edit' : 'Add' }} {{ mode === 'class' ? 'Period' : 'Exam' }}</h1>
        <p class="page__hint">
          <span v-if="mode === 'class'">Same period can repeat on several weekdays.</span>
          <span v-else>One row per subject — the date fixes the weekday automatically.</span>
        </p>
      </div>
    </div>

    <div v-if="loadingEdit" class="sk-stack">
      <AppSkeleton variant="card" />
    </div>
    <AppCard v-else>
      <form class="form-grid" @submit.prevent="save">
        <label>Class
          <select v-model="form.classId" class="app-input__control" required>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
        </label>
        <label>Section
          <select v-model="form.sectionId" class="app-input__control">
            <option :value="null">Whole class</option>
            <option v-for="s in formSections" :key="s.id" :value="s.id">{{ s.label }}</option>
          </select>
        </label>
        <template v-if="mode === 'exam'">
          <label>Exam name
            <input v-model="form.title" class="app-input__control" placeholder="e.g. Half-Yearly Exam" required />
          </label>
          <div class="field-note">
            <p class="muted">
              {{ examCombined
                ? 'Combined sittings are on — a row can hold several subjects.'
                : 'Every subject gets its own row (date, time, room, invigilators).' }}
            </p>
          </div>
        </template>
        <template v-else>
          <label>Room
            <input v-model="form.room" class="app-input__control" placeholder="R-101" required />
          </label>
          <label>Subject
            <select v-model="form.subjectId" class="app-input__control">
              <option :value="null">Custom</option>
              <option v-for="s in formSubjects" :key="s.id" :value="s.id">{{ subjectOptionLine(s) }}</option>
            </select>
          </label>
          <label>Subject name
            <input v-model="form.subjectLabel" class="app-input__control" required />
          </label>
          <label v-if="school.hasModule('staff')">Teacher
            <select v-model="form.teacherId" class="app-input__control">
              <option :value="null">Assign later</option>
              <optgroup v-if="suggestedTeachers.length" label="Assigned to this subject ✓">
                <option v-for="t in suggestedTeachers" :key="t.id" :value="t.id">{{ t.name }}</option>
              </optgroup>
              <optgroup label="All teachers">
                <option v-for="t in otherTeachers" :key="t.id" :value="t.id">{{ t.name }}</option>
              </optgroup>
            </select>
          </label>
          <label v-else>Teacher name
            <input v-model="form.teacherName" class="app-input__control" maxlength="255" placeholder="e.g. Abdul Malek" />
          </label>
          <p v-if="school.hasModule('staff') && teacherMismatch" class="muted">Note: {{ teacherMismatch }} is not assigned to {{ form.subjectLabel || 'this subject' }} (Teacher Subjects page) — a substitute still works.</p>
          <p v-else-if="school.hasModule('staff') && !classMappingsLoading && subjectHasNoTeacher" class="muted">No teacher is assigned to this subject yet (Teacher Subjects page) — assign there and the teacher fills in here automatically.</p>
          <p v-else-if="!school.hasModule('staff')" class="muted">Teachers &amp; Staff is off — type the name here; the timetable shows it as free text (no clash checks).</p>
        </template>

        <template v-if="mode === 'exam'">
          <AppCard class="span-2" :title="isEdit ? 'Sitting' : 'Sittings — one row per subject'">
            <p class="muted">Exam times are free — they may run outside class hours.</p>
            <div v-for="(row, i) in examRows" :key="i" class="exam-row">
              <label>Date
                <input v-model="row.date" type="date" class="app-input__control" required />
              </label>
              <label>Start
                <input v-model="row.startTime" type="time" class="app-input__control" required />
              </label>
              <label>End
                <input v-model="row.endTime" type="time" class="app-input__control" required />
              </label>
              <div class="field-block">
                <span class="field-label">Subject{{ examCombined ? 's' : '' }}</span>
                <template v-if="examCombined">
                  <div class="subject-add">
                    <select v-model="row.subjectPick" class="app-input__control">
                      <option value="">Pick subject…</option>
                      <option v-for="s in formSubjects" :key="s.id" :value="s.id">{{ subjectOptionLabel(s) }}</option>
                    </select>
                    <button type="button" class="link-btn" @click="addPickedSubject(row)">+ Add</button>
                  </div>
                  <input v-model="row.customLabel" class="app-input__control" placeholder="+ custom subject, Enter to add" @keydown.enter.prevent="addCustomSubject(row)" />
                  <div v-if="row.subjects.length" class="picked">
                    <span v-for="n in row.subjects" :key="n" class="chip">{{ n }} <button type="button" @click="dropRowSubject(row, n)">×</button></span>
                  </div>
                </template>
                <template v-else>
                  <select v-model="row.subjectPick" class="app-input__control">
                    <option value="">Pick subject…</option>
                    <option v-for="s in formSubjects" :key="s.id" :value="s.id">{{ subjectOptionLabel(s) }}</option>
                    <option value="__custom">Custom subject…</option>
                  </select>
                  <input v-if="row.subjectPick === '__custom'" v-model="row.customLabel" class="app-input__control" placeholder="Subject name" />
                </template>
              </div>
              <label>Room
                <input v-model="row.room" class="app-input__control" placeholder="Exam Hall" />
              </label>
              <div v-if="school.hasModule('staff')" class="field-block">
                <span class="field-label">Invigilators</span>
                <details class="teacher-pick">
                  <summary>{{ row.teacherIds.length ? `${row.teacherIds.length} selected` : 'None selected' }}</summary>
                  <div class="teacher-pick__list">
                    <AppSkeleton v-if="teachersLoading" variant="lines" :lines="4" />
                    <template v-else>
                      <label v-for="t in teachers" :key="t.id" class="check">
                        <input v-model="row.teacherIds" type="checkbox" :value="t.id" /> {{ t.name }}
                      </label>
                    </template>
                  </div>
                </details>
              </div>
              <p v-else class="muted">Invigilators need the Teachers &amp; Staff module.</p>
              <div class="exam-row__meta">
                <span class="muted">{{ rowWeekday(row.date) }}</span>
                <button v-if="!isEdit && examRows.length > 1" type="button" class="link-btn link-btn--danger" @click="removeExamRow(i)">Remove</button>
              </div>
            </div>
            <button v-if="!isEdit" type="button" class="link-btn" @click="addExamRow">+ Add another subject</button>
          </AppCard>
        </template>

        <template v-else>
          <AppCard v-if="!isEdit" title="Days (same period repeats)" class="span-2">
            <div class="check-grid">
              <label v-for="d in WEEK_DAYS" :key="d" class="check" :class="{ 'check--off': isOffDay(d) }">
                <input v-model="form.days" type="checkbox" :value="d" :disabled="isOffDay(d)" /> {{ dayLabel(d) }}
                <span v-if="isOffDay(d)" class="off-badge">Off</span>
              </label>
            </div>
            <div class="day-quick">
              <button type="button" class="link-btn" @click="form.days = WEEK_DAYS.filter((d) => !isOffDay(d))">Select all</button>
              <button type="button" class="link-btn" @click="form.days = []">Clear</button>
            </div>
          </AppCard>
          <label v-if="isEdit">Day
            <select v-model="form.day" class="app-input__control">
              <option v-for="d in WEEK_DAYS" :key="d" :value="d">{{ dayLabel(d) }}</option>
            </select>
          </label>
          <label>Start
            <input v-model="form.startTime" type="time" class="app-input__control" :min="classTimeMin" :max="classTimeMax" required />
          </label>
          <label>End
            <input v-model="form.endTime" type="time" class="app-input__control" :min="classTimeMin" :max="classTimeMax" required />
          </label>
          <p v-if="classTimeMin || classTimeMax" class="muted">{{ timeSource }} time: {{ timeHintStart }} – {{ timeHintEnd }} (class periods must fall inside; exams can be at any time).</p>
        </template>

        <p v-if="formError" class="error span-2">{{ formError }}</p>
        <div class="form-actions">
          <AppButton variant="ghost" type="button" @click="goBack">Cancel</AppButton>
          <AppButton type="submit" :loading="saving">{{ isEdit ? 'Update' : 'Save' }}</AppButton>
        </div>
      </form>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import {
  useClasses,
  useClassSubjectTeachers,
  useCreateRoutine,
  useDepartments,
  useRoutine,
  useSections,
  useSettings,
  useSubjects,
  useSubjectTeachers,
  useTeachers,
  useUpdateRoutine,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { useSchoolStore } from '@/stores/school'
import { WEEK_DAYS, type Subject, type WeekDay } from '@/types/models'

const DAY_LABELS: Record<WeekDay, string> = {
  Sat: 'Saturday', Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday',
  Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday',
}
const dayLabel = (d: WeekDay): string => DAY_LABELS[d] ?? d

const route = useRoute()
const router = useRouter()
const toast = useToast()
const school = useSchoolStore()
const editId = computed(() => String(route.params.id || ''))
const isEdit = computed(() => !!editId.value)
const mode = computed<'class' | 'exam'>(() => (route.query.type === 'exam' ? 'exam' : 'class'))
/** Super-admin switch: on = several subjects may share one sitting. */
const examCombined = computed(() => school.examCombinedSitting)

function goBack(): void {
  router.push({ path: '/admin/routine', query: { type: mode.value } })
}

const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])

const form = reactive({
  classId: '',
  sectionId: null as string | null,
  subjectId: null as string | null,
  subjectLabel: '',
  teacherId: null as string | null,
  teacherName: '',
  teacherIds: [] as string[],
  room: '',
  title: '',
  day: 'Sun' as WeekDay,
  days: ['Sun' as WeekDay] as WeekDay[],
  startTime: '09:00',
  endTime: '09:45',
})
watch(classes, (rows) => {
  if (!form.classId && rows.length > 0) form.classId = rows[0]?.id ?? ''
}, { immediate: true })

const { data: formSectionData } = useSections(() => form.classId || undefined)
const formSections = computed(() => formSectionData.value?.data ?? [])
watch(() => form.classId, () => {
  form.sectionId = null
})
const { data: formSubjectData } = useSubjects(() => form.classId || undefined)
const formSubjects = computed(() => formSubjectData.value?.data ?? [])
const { data: formDeptData } = useDepartments(() => form.classId || undefined)
function subjectOptionLabel(s: Subject): string {
  if (!s.departmentId) return s.label
  const dept = formDeptData.value?.data.find((d) => d.id === s.departmentId)
  return dept ? `${s.label} (${dept.label})` : s.label
}

const { data: teacherData, isLoading: teachersLoading } = useTeachers({ perPage: 500 }, () => school.hasModule('staff'))
const teachers = computed(() => teacherData.value?.data.items ?? [])

// Teacher-subject suggestion (class mode only).
const { data: classMappingData, isLoading: classMappingsLoading } = useClassSubjectTeachers(() => (mode.value === 'class' && school.hasModule('staff') ? form.classId : null))
const classMappings = computed(() => classMappingData.value?.data ?? [])
function teachersOfSubject(subjectId: string | null): { id: string; name: string }[] {
  if (!subjectId) return []
  const ids = classMappings.value.filter((m) => m.subjectId === subjectId).map((m) => m.teacherId)
  return teachers.value.filter((t) => ids.includes(t.id))
}
/** No teacher assigned to the picked subject yet (hint under the teacher pick). */
const subjectHasNoTeacher = computed(() =>
  school.hasModule('staff') && mode.value === 'class' && !!form.subjectId && teachersOfSubject(form.subjectId).length === 0,
)
function subjectOptionLine(s: Subject): string {
  const names = teachersOfSubject(s.id).map((t) => t.name)
  const base = subjectOptionLabel(s)
  if (!names.length) return base
  return names.length > 2 ? `${base} — ${names.slice(0, 2).join(', ')} +${names.length - 2}` : `${base} — ${names.join(', ')}`
}
const { data: subjectTeacherData } = useSubjectTeachers(() => (mode.value === 'class' && school.hasModule('staff') ? form.subjectId : null))
const suggestedTeachers = computed(() => {
  const ids = new Set((subjectTeacherData.value?.data ?? []).map((m) => m.teacherId))
  return teachers.value.filter((t) => ids.has(t.id))
})
const otherTeachers = computed(() => {
  const ids = new Set(suggestedTeachers.value.map((t) => t.id))
  return teachers.value.filter((t) => !ids.has(t.id))
})
const teacherMismatch = computed(() => {
  if (!form.teacherId || suggestedTeachers.value.length === 0) return ''
  if (suggestedTeachers.value.some((t) => t.id === form.teacherId)) return ''
  return teachers.value.find((t) => t.id === form.teacherId)?.name ?? ''
})

let justOpened = false
watch(
  () => form.subjectId,
  (id) => {
    const sub = formSubjects.value.find((s) => s.id === id)
    if (sub) form.subjectLabel = sub.label
    if (justOpened) {
      justOpened = false
      return
    }
    if (mode.value === 'class' && id) {
      const first = teachersOfSubject(id)[0]
      if (first) form.teacherId = first.id
    }
  },
)

// School hours + weekly holidays. A picked class's own hours win over the
// school-wide ones; each side falls back independently.
const { data: settingsData } = useSettings()
const schoolStart = computed(() => settingsData.value?.data.schoolStartTime || '')
const schoolEnd = computed(() => settingsData.value?.data.schoolEndTime || '')
const pickedClass = computed(() => classes.value.find((c) => c.id === form.classId))
const classStart = computed(() => pickedClass.value?.startTime || '')
const classEnd = computed(() => pickedClass.value?.endTime || '')
const classTimeMin = computed(() => (mode.value === 'class' ? (classStart.value || schoolStart.value) || undefined : undefined))
const classTimeMax = computed(() => (mode.value === 'class' ? (classEnd.value || schoolEnd.value) || undefined : undefined))
const timeSource = computed(() => (classStart.value || classEnd.value ? pickedClass.value?.label ?? 'Class' : 'School'))
const timeHintStart = computed(() => classTimeMin.value || '…')
const timeHintEnd = computed(() => classTimeMax.value || '…')
const offDays = computed<WeekDay[]>(() => {
  const raw = settingsData.value?.data.weeklyHolidays ?? []
  return (WEEK_DAYS as string[]).filter((d) => raw.map((x) => String(x).slice(0, 3)).includes(d)) as WeekDay[]
})
const isOffDay = (day: WeekDay): boolean => offDays.value.includes(day)

// ---------- exam builder rows ----------
interface ExamRow {
  date: string
  startTime: string
  endTime: string
  /** Subject select value: '' none, a subject public id, or '__custom'. */
  subjectPick: string
  customLabel: string
  /** Combined-sitting mode: the subject chips of this row. */
  subjects: string[]
  room: string
  teacherIds: string[]
}

function blankExamRow(): ExamRow {
  return {
    date: '', startTime: '09:00', endTime: '09:45',
    subjectPick: '', customLabel: '', subjects: [],
    room: '', teacherIds: [],
  }
}

const examRows = ref<ExamRow[]>([blankExamRow()])

function addExamRow(): void {
  // Copying the previous row's date/room/invigilators keeps entering a full
  // subject-wise routine fast: usually only time and subject change.
  const last = examRows.value[examRows.value.length - 1]
  const row = blankExamRow()
  if (last) {
    row.date = last.date
    row.room = last.room
    row.teacherIds = [...last.teacherIds]
  }
  examRows.value.push(row)
}
function removeExamRow(index: number): void {
  examRows.value.splice(index, 1)
}
function labelForPick(pick: string): string {
  if (!pick || pick === '__custom') return ''
  return formSubjects.value.find((s) => s.id === pick)?.label ?? ''
}
function addPickedSubject(row: ExamRow): void {
  const label = labelForPick(row.subjectPick)
  if (label && !row.subjects.some((n) => n.toLowerCase() === label.toLowerCase())) {
    row.subjects.push(label)
  }
  row.subjectPick = ''
}
function addCustomSubject(row: ExamRow): void {
  const name = row.customLabel.trim()
  if (name && !row.subjects.some((n) => n.toLowerCase() === name.toLowerCase())) {
    row.subjects.push(name)
  }
  row.customLabel = ''
}
function dropRowSubject(row: ExamRow, name: string): void {
  row.subjects = row.subjects.filter((n) => n !== name)
}
function rowSubjectLabels(row: ExamRow): string[] {
  if (examCombined.value) return row.subjects
  if (row.subjectPick === '__custom') return row.customLabel.trim() ? [row.customLabel.trim()] : []
  const label = labelForPick(row.subjectPick)
  return label ? [label] : []
}
const WEEKDAY_SHORT: WeekDay[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
function rowWeekday(date: string): string {
  if (!date) return 'Weekday follows the date.'
  const d = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return 'Weekday follows the date.'
  const wd = WEEKDAY_SHORT[d.getUTCDay()]
  return wd ? `Weekday: ${dayLabel(wd)}` : 'Weekday follows the date.'
}

// Edit: fill from server row.
const { data: editData, isLoading: loadingEdit } = useRoutine(editId)
watch(editData, (res) => {
  const r = res?.data
  if (!r || !isEdit.value) return
  justOpened = true
  const labels = r.subjects?.length ? [...r.subjects] : (r.subjectLabel ? [r.subjectLabel] : [])
  Object.assign(form, {
    classId: r.classId, sectionId: r.sectionId,
    subjectId: r.subjectId, subjectLabel: r.subjectLabel,
    teacherId: r.teacherId, teacherName: r.teacherName ?? '',
    teacherIds: r.teacherIds?.length ? [...r.teacherIds] : (r.teacherId ? [r.teacherId] : []),
    room: r.room, title: r.title, day: r.day, days: [r.day],
    startTime: toTimeInput(r.startTime), endTime: toTimeInput(r.endTime),
  })
  if (mode.value === 'exam') {
    const hasOption = formSubjects.value.some((s) => s.id === r.subjectId)
    examRows.value = [{
      date: r.date || '',
      startTime: toTimeInput(r.startTime),
      endTime: toTimeInput(r.endTime),
      subjectPick: r.subjectId ? (hasOption || !labels.length ? r.subjectId : '__custom') : '__custom',
      customLabel: r.subjectId && (hasOption || !labels.length) ? '' : (labels[0] ?? ''),
      subjects: labels,
      room: r.room,
      teacherIds: r.teacherIds?.length ? [...r.teacherIds] : (r.teacherId ? [r.teacherId] : []),
    }]
  }
}, { immediate: true })
function toTimeInput(v: string): string {
  const m = /(\d{1,2}):(\d{2})\s*([AP]M)/i.exec(v || '')
  if (!m) return (v || '').slice(0, 5)
  let h = Number(m[1]) % 12
  if (/pm/i.test(m[3] ?? '')) h += 12
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

const formError = ref('')
const saving = ref(false)
const { mutateAsync: createRoutine } = useCreateRoutine()
const { mutateAsync: updateRoutine } = useUpdateRoutine()

async function saveClass(): Promise<void> {
  if (form.endTime <= form.startTime) {
    formError.value = 'End time must be after start time.'
    return
  }
  if (classTimeMin.value && form.startTime < classTimeMin.value) {
    formError.value = `${timeSource.value} starts ${classTimeMin.value}: period cannot begin before that.`
    return
  }
  if (classTimeMax.value && form.endTime > classTimeMax.value) {
    formError.value = `${timeSource.value} ends ${classTimeMax.value}: period cannot run past that.`
    return
  }
  if (!isEdit.value && form.days.length === 0) {
    formError.value = 'Pick at least one day.'
    return
  }
  if (!form.subjectLabel.trim()) {
    formError.value = 'Subject is required.'
    return
  }
  saving.value = true
  try {
    const teacher = teachers.value.find((t) => t.id === form.teacherId)
    const payload = {
      classId: form.classId,
      sectionId: form.sectionId,
      subjectId: form.subjectId,
      subjectLabel: form.subjectLabel.trim(),
      teacherId: form.teacherId,
      teacherName: teacher ? teacher.name : form.teacherName.trim(),
      room: form.room.trim(),
      title: '',
      day: form.day,
      days: !isEdit.value ? form.days : undefined,
      startTime: form.startTime,
      endTime: form.endTime,
      routineType: 'class',
    } as const
    if (isEdit.value) {
      await updateRoutine({ id: editId.value, input: { ...payload } })
      toast.success('Routine updated')
    } else {
      const res = await createRoutine({ ...payload })
      const n = Array.isArray((res as unknown as { data: unknown }).data) ? ((res as unknown as { data: unknown[] }).data.length) : 1
      toast.success(n > 1 ? `${n} periods added` : 'Period added')
    }
    goBack()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

async function saveExam(): Promise<void> {
  if (!form.title.trim()) {
    formError.value = 'Exam name is required.'
    return
  }
  if (examRows.value.length === 0) {
    formError.value = 'Add at least one exam row.'
    return
  }
  for (const [index, row] of examRows.value.entries()) {
    const prefix = examRows.value.length > 1 ? `Row ${index + 1}: ` : ''
    if (!row.date) {
      formError.value = `${prefix}date is required.`
      return
    }
    if (!row.startTime || !row.endTime) {
      formError.value = `${prefix}start and end time are required.`
      return
    }
    if (row.endTime <= row.startTime) {
      formError.value = `${prefix}end time must be after start time.`
      return
    }
    if (rowSubjectLabels(row).length === 0) {
      formError.value = `${prefix}pick a subject.`
      return
    }
  }
  saving.value = true
  try {
    if (isEdit.value) {
      const row = examRows.value[0]
      if (!row) return
      const labels = rowSubjectLabels(row)
      await updateRoutine({
        id: editId.value,
        input: {
          classId: form.classId,
          sectionId: form.sectionId,
          subjectId: row.subjectPick && row.subjectPick !== '__custom' ? row.subjectPick : null,
          subjectLabel: labels[0] ?? '',
          subjects: labels,
          teacherId: row.teacherIds[0] ?? null,
          teacherIds: row.teacherIds,
          teacherName: teachers.value.find((t) => t.id === row.teacherIds[0])?.name ?? '',
          room: row.room.trim(),
          title: form.title.trim(),
          date: row.date,
          startTime: row.startTime,
          endTime: row.endTime,
          routineType: 'exam',
        },
      })
      toast.success('Routine updated')
    } else {
      const first = examRows.value[0]
      if (!first) return
      const res = await createRoutine({
        classId: form.classId,
        sectionId: form.sectionId,
        subjectId: null,
        subjectLabel: '',
        teacherId: null,
        teacherName: '',
        room: '',
        title: form.title.trim(),
        startTime: first.startTime,
        endTime: first.endTime,
        routineType: 'exam',
        entries: examRows.value.map((row) => ({
          date: row.date,
          startTime: row.startTime,
          endTime: row.endTime,
          subjects: rowSubjectLabels(row),
          room: row.room.trim(),
          teacherIds: row.teacherIds,
        })),
      })
      const n = Array.isArray((res as unknown as { data: unknown }).data) ? ((res as unknown as { data: unknown[] }).data.length) : 1
      toast.success(n > 1 ? `${n} exam sittings added` : 'Exam added')
    }
    goBack()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

function save(): void {
  formError.value = ''
  if (mode.value === 'class') {
    void saveClass()
  } else {
    void saveExam()
  }
}
</script>

<style scoped>
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-lg);
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: var(--spacing-xs) 0;
}
.page__hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin: 0;
}
.link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.link-btn--danger {
  color: var(--color-danger);
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
  gap: var(--spacing-md);
}
.form-grid label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.field-note {
  align-self: end;
}
.field-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.field-label {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.check-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
}
.check {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.check--off {
  opacity: 0.55;
}
.off-badge {
  display: inline-block;
  padding: 0 var(--spacing-xs);
  border-radius: var(--radius-full);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
.picked {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-xs);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  font-size: var(--font-size-xs);
}
.chip button {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font-size: var(--font-size-sm);
  line-height: 1;
  min-width: 28px;
  min-height: 28px;
}
.day-quick {
  display: flex;
  gap: var(--spacing-md);
}
.form-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}
.span-2 {
  grid-column: 1 / -1;
}
.exam-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-sm);
  align-items: start;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-sm);
}
.exam-row label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.exam-row__meta {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  align-items: flex-start;
  justify-content: flex-end;
  min-height: 100%;
}
.subject-add {
  display: flex;
  gap: var(--spacing-xs);
  align-items: center;
}
.subject-add select {
  flex: 1;
}
.teacher-pick summary {
  cursor: pointer;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
}
.teacher-pick__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--spacing-xs);
  margin-top: var(--spacing-xs);
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  max-height: 190px;
  overflow: auto;
}
</style>
