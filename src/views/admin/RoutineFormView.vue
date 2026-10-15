<template>
  <div class="page">
    <div class="page__head">
      <div>
        <button class="link-btn" type="button" @click="goBack">← Routine</button>
        <h1 class="page__title">{{ isEdit ? 'Edit' : 'Add' }} {{ mode === 'class' ? 'Period' : 'Exam' }}</h1>
        <p class="page__hint">
          <span v-if="mode === 'class'">Same period can repeat on several weekdays.</span>
          <span v-else>One exam sitting — date fixes the weekday.</span>
        </p>
      </div>
    </div>

    <p v-if="loadingEdit" class="muted">Loading…</p>
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
          <label>Date
            <input v-model="form.date" type="date" class="app-input__control" required />
          </label>
          <label>Room
            <input v-model="form.room" class="app-input__control" placeholder="Exam Hall" />
          </label>
          <div class="field-note"><p class="muted">Weekday follows the date automatically.</p></div>
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
          <label>Teacher
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
          <p v-if="teacherMismatch" class="muted">Note: {{ teacherMismatch }} is not assigned to {{ form.subjectLabel || 'this subject' }} (Teacher Subjects page) — a substitute still works.</p>
        </template>
        <template v-if="mode === 'exam'">
          <AppCard title="Subjects (one sitting can cover several)" class="span-2">
            <div class="check-grid">
              <label v-for="s in formSubjects" :key="s.id" class="check">
                <input v-model="form.subjectNames" type="checkbox" :value="s.label" /> {{ subjectOptionLabel(s) }}
              </label>
            </div>
            <input v-model="form.customSubject" class="app-input__control" placeholder="+ custom subject, Enter to add" @keydown.enter.prevent="addCustomSubject" />
            <div class="picked">
              <span v-for="n in form.subjectNames" :key="n" class="chip">{{ n }} <button type="button" @click="dropSubject(n)">×</button></span>
            </div>
          </AppCard>
          <AppCard title="Teachers (invigilators)" class="span-2">
            <div class="check-grid">
              <label v-for="t in teachers" :key="t.id" class="check">
                <input v-model="form.teacherIds" type="checkbox" :value="t.id" /> {{ t.name }}
              </label>
            </div>
          </AppCard>
        </template>
        <template v-if="mode === 'class' && !isEdit">
          <AppCard title="Days (same period repeats)" class="span-2">
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
        </template>
        <label v-if="mode === 'class' && isEdit">Day
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
        <p v-if="mode === 'class' && (schoolStart || schoolEnd)" class="muted">School time: {{ schoolStart || '…' }} – {{ schoolEnd || '…' }} (class periods must fall inside; exams can be at any time).</p>
        <p v-if="formError" class="error">{{ formError }}</p>
        <div class="form-actions">
          <AppButton variant="ghost" type="button" @click="goBack">Cancel</AppButton>
          <AppButton type="submit" :disabled="saving">{{ saving ? 'Saving…' : isEdit ? 'Update' : 'Save' }}</AppButton>
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
import { WEEK_DAYS, type Subject, type WeekDay } from '@/types/models'

const DAY_LABELS: Record<WeekDay, string> = {
  Sat: 'Saturday', Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday',
  Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday',
}
const dayLabel = (d: WeekDay): string => DAY_LABELS[d] ?? d

const route = useRoute()
const router = useRouter()
const toast = useToast()
const editId = computed(() => String(route.params.id || ''))
const isEdit = computed(() => !!editId.value)
const mode = computed<'class' | 'exam'>(() => (route.query.type === 'exam' ? 'exam' : 'class'))

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
  subjectNames: [] as string[],
  customSubject: '',
  teacherId: null as string | null,
  teacherIds: [] as string[],
  room: '',
  title: '',
  date: '',
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

const { data: teacherData } = useTeachers({ perPage: 500 })
const teachers = computed(() => teacherData.value?.data.items ?? [])

// Teacher-subject suggestion.
const { data: classMappingData } = useClassSubjectTeachers(() => (mode.value === 'class' ? form.classId : null))
const classMappings = computed(() => classMappingData.value?.data ?? [])
function teachersOfSubject(subjectId: string | null): { id: string; name: string }[] {
  if (!subjectId) return []
  const ids = classMappings.value.filter((m) => m.subjectId === subjectId).map((m) => m.teacherId)
  return teachers.value.filter((t) => ids.includes(t.id))
}
function subjectOptionLine(s: Subject): string {
  const names = teachersOfSubject(s.id).map((t) => t.name)
  const base = subjectOptionLabel(s)
  if (!names.length) return base
  return names.length > 2 ? `${base} — ${names.slice(0, 2).join(', ')} +${names.length - 2}` : `${base} — ${names.join(', ')}`
}
const { data: subjectTeacherData } = useSubjectTeachers(() => (mode.value === 'class' ? form.subjectId : null))
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

// School hours + weekly holidays.
const { data: settingsData } = useSettings()
const schoolStart = computed(() => settingsData.value?.data.schoolStartTime || '')
const schoolEnd = computed(() => settingsData.value?.data.schoolEndTime || '')
const classTimeMin = computed(() => (mode.value === 'class' ? schoolStart.value || undefined : undefined))
const classTimeMax = computed(() => (mode.value === 'class' ? schoolEnd.value || undefined : undefined))
const offDays = computed<WeekDay[]>(() => {
  const raw = settingsData.value?.data.weeklyHolidays ?? []
  return (WEEK_DAYS as string[]).filter((d) => raw.map((x) => String(x).slice(0, 3)).includes(d)) as WeekDay[]
})
const isOffDay = (day: WeekDay): boolean => offDays.value.includes(day)

// Edit: fill from server row.
const { data: editData, isLoading: loadingEdit } = useRoutine(editId)
watch(editData, (res) => {
  const r = res?.data
  if (!r || !isEdit.value) return
  justOpened = true
  Object.assign(form, {
    classId: r.classId, sectionId: r.sectionId,
    subjectId: r.subjectId, subjectLabel: r.subjectLabel,
    subjectNames: r.subjects?.length ? [...r.subjects] : (r.subjectLabel ? [r.subjectLabel] : []),
    teacherId: r.teacherId, teacherIds: r.teacherIds?.length ? [...r.teacherIds] : (r.teacherId ? [r.teacherId] : []),
    room: r.room, title: r.title, date: r.date, day: r.day, days: [r.day],
    startTime: toTimeInput(r.startTime), endTime: toTimeInput(r.endTime),
  })
}, { immediate: true })
function toTimeInput(v: string): string {
  const m = /(\d{1,2}):(\d{2})\s*([AP]M)/i.exec(v || '')
  if (!m) return (v || '').slice(0, 5)
  let h = Number(m[1]) % 12
  if (/pm/i.test(m[3])) h += 12
  return `${String(h).padStart(2, '0')}:${m[2]}`
}
function addCustomSubject(): void {
  const name = form.customSubject.trim()
  if (name && !form.subjectNames.includes(name)) form.subjectNames.push(name)
  form.customSubject = ''
}
function dropSubject(name: string): void {
  form.subjectNames = form.subjectNames.filter((n) => n !== name)
}

const formError = ref('')
const saving = ref(false)
const { mutateAsync: createRoutine } = useCreateRoutine()
const { mutateAsync: updateRoutine } = useUpdateRoutine()

async function save(): Promise<void> {
  formError.value = ''
  if (form.endTime <= form.startTime) {
    formError.value = 'End time must be after start time.'
    return
  }
  if (mode.value === 'class' && schoolStart.value && form.startTime < schoolStart.value) {
    formError.value = `School starts ${schoolStart.value}: period cannot begin before that.`
    return
  }
  if (mode.value === 'class' && schoolEnd.value && form.endTime > schoolEnd.value) {
    formError.value = `School ends ${schoolEnd.value}: period cannot run past that.`
    return
  }
  if (mode.value === 'class' && !isEdit.value && form.days.length === 0) {
    formError.value = 'Pick at least one day.'
    return
  }
  if (mode.value === 'exam' && !form.title.trim()) {
    formError.value = 'Exam name is required.'
    return
  }
  if (mode.value === 'exam' && form.subjectNames.length === 0) {
    formError.value = 'Pick at least one subject.'
    return
  }
  if (mode.value === 'class' && !form.subjectLabel.trim()) {
    formError.value = 'Subject is required.'
    return
  }
  saving.value = true
  try {
    const teacher = teachers.value.find((t) => t.id === (mode.value === 'exam' ? form.teacherIds[0] : form.teacherId))
    const payload = {
      classId: form.classId,
      sectionId: form.sectionId,
      subjectId: mode.value === 'exam' ? null : form.subjectId,
      subjectLabel: mode.value === 'exam' ? (form.subjectNames[0] ?? '') : form.subjectLabel.trim(),
      subjects: mode.value === 'exam' ? form.subjectNames : undefined,
      teacherId: mode.value === 'exam' ? (form.teacherIds[0] ?? null) : form.teacherId,
      teacherIds: mode.value === 'exam' ? form.teacherIds : undefined,
      teacherName: teacher?.name ?? '',
      room: form.room.trim(),
      title: mode.value === 'exam' ? form.title.trim() : '',
      date: mode.value === 'exam' ? form.date : undefined,
      day: form.day,
      days: mode.value === 'class' && !isEdit.value ? form.days : undefined,
      startTime: form.startTime,
      endTime: form.endTime,
      routineType: mode.value,
    } as const
    if (isEdit.value) {
      await updateRoutine({ id: editId.value, input: { ...payload } })
      toast.success('Routine updated')
    } else {
      const res = await createRoutine({ ...payload })
      const n = Array.isArray((res as unknown as { data: unknown }).data) ? ((res as unknown as { data: unknown[] }).data.length) : 1
      toast.success(n > 1 ? `${n} periods added` : mode.value === 'exam' ? 'Exam added' : 'Period added')
    }
    goBack()
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
</style>
