<template>
  <div class="page">
    <div class="page__head">
      <h1 class="page__title">Class Routine</h1>
      <AppButton @click="form.open = true">+ Add Period</AppButton>
    </div>

    <AppCard>
      <FilterPanel>
        <select v-model="classId" class="app-input__control">
          <option value="">All classes</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
        </select>
        <select v-model="sectionId" class="app-input__control" :disabled="!classId">
          <option :value="null">All sections</option>
          <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select>
      </FilterPanel>

      <p v-if="isLoading" class="muted">Loading…</p>
      <template v-else>
        <div v-for="day in WEEK_DAYS" :key="day" class="day-block">
          <h3 class="day-block__title">{{ dayLabel(day) }}</h3>
          <p v-if="byDay(day).length === 0" class="muted">No periods.</p>
          <ul class="periods">
            <li v-for="r in byDay(day)" :key="r.id" class="period">
              <div>
                <strong>{{ r.startTime }}–{{ r.endTime }}</strong>
                <span class="muted"> · {{ r.subjectLabel }} · {{ r.teacherName }} · Room {{ r.room }}</span>
                <span class="muted"> · {{ classLabel(r.classId) }}</span>
              </div>
              <button class="link-danger" type="button" @click="remove(r.id)">Remove</button>
            </li>
          </ul>
        </div>
      </template>
    </AppCard>

    <Teleport to="body">
      <div v-if="form.open" class="modal-backdrop" @click.self="form.open = false">
        <div class="modal">
          <h3 class="modal__title">Add Period</h3>
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
            <label>Day
              <select v-model="form.day" class="app-input__control">
                <option v-for="d in WEEK_DAYS" :key="d" :value="d">{{ dayLabel(d) }}</option>
              </select>
            </label>
            <label>Room<input v-model="form.room" class="app-input__control" placeholder="R-101" required /></label>
            <label>Subject
              <select v-model="form.subjectId" class="app-input__control">
                <option :value="null">Custom</option>
                <option v-for="s in formSubjects" :key="s.id" :value="s.id">{{ subjectOptionLabel(s) }}</option>
              </select>
            </label>
            <label>Subject name<input v-model="form.subjectLabel" class="app-input__control" required /></label>
            <label>Teacher
              <select v-model="form.teacherId" class="app-input__control">
                <option :value="null">Select teacher</option>
                <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </label>
            <label>Start<input v-model="form.startTime" type="time" class="app-input__control" required /></label>
            <label>End<input v-model="form.endTime" type="time" class="app-input__control" required /></label>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="form-actions">
              <AppButton variant="ghost" type="button" @click="form.open = false">Cancel</AppButton>
              <AppButton type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</AppButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import {
  useClasses,
  useCreateRoutine,
  useDeleteRoutine,
  useDepartments,
  useRoutines,
  useSections,
  useSubjects,
  useTeachers,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { WEEK_DAYS, type Routine, type Subject, type WeekDay } from '@/types/models'

const DAY_LABELS: Record<WeekDay, string> = {
  Sat: 'Saturday', Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday',
  Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday',
}
const dayLabel = (d: WeekDay): string => DAY_LABELS[d] ?? d

const toast = useToast()
const classId = ref('')
const sectionId = ref<string | null>(null)

const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])
const classLabel = (id: string): string => classes.value.find((c) => c.id === id)?.label ?? id

const { data: sectionData } = useSections(() => classId.value || undefined)
const sections = computed(() => sectionData.value?.data ?? [])
watch(classId, () => {
  sectionId.value = null
})

const { data, isLoading } = useRoutines(
  () => classId.value || undefined,
  () => sectionId.value ?? undefined,
)
const routines = computed(() => {
  const rows = data.value?.data ?? []
  return rows
    .filter((r) => !classId.value || r.classId === classId.value)
    .filter((r) => sectionId.value == null || (r.sectionId ?? null) === sectionId.value)
})
const byDay = (day: WeekDay): Routine[] => routines.value.filter((r) => r.day === day)

const { data: teacherData } = useTeachers({ perPage: 500 })
const teachers = computed(() => teacherData.value?.data.items ?? [])

const form = reactive({
  open: false,
  classId: '',
  sectionId: null as string | null,
  subjectId: null as string | null,
  subjectLabel: '',
  teacherId: null as string | null,
  room: '',
  day: 'Sun' as WeekDay,
  startTime: '09:00',
  endTime: '09:45',
})
watch(classes, (rows) => {
  if (!form.classId && rows.length > 0) form.classId = rows[0]?.id ?? ''
}, { immediate: true })
const { data: formSectionData } = useSections(() => form.classId || undefined)
const formSections = computed(() => formSectionData.value?.data ?? [])
const { data: formSubjectData } = useSubjects(() => form.classId || undefined)
const formSubjects = computed(() => formSubjectData.value?.data ?? [])
const { data: formDeptData } = useDepartments(() => form.classId || undefined)
/** Dept-specific subjects carry their group tag so Science vs Commerce is visible. */
function subjectOptionLabel(s: Subject): string {
  if (!s.departmentId) return s.label
  const dept = formDeptData.value?.data.find((d) => d.id === s.departmentId)
  return dept ? `${s.label} (${dept.label})` : s.label
}
watch(
  () => form.subjectId,
  (id) => {
    const sub = formSubjects.value.find((s) => s.id === id)
    if (sub) form.subjectLabel = sub.label
  },
)

const formError = ref('')
const saving = ref(false)
const { mutateAsync: createRoutine } = useCreateRoutine()
const { mutateAsync: deleteRoutine } = useDeleteRoutine()

async function save(): Promise<void> {
  formError.value = ''
  saving.value = true
  try {
    const teacher = teachers.value.find((t) => t.id === form.teacherId)
    await createRoutine({
      classId: form.classId,
      sectionId: form.sectionId,
      subjectId: form.subjectId,
      subjectLabel: form.subjectLabel.trim(),
      teacherId: form.teacherId,
      teacherName: teacher?.name ?? '',
      room: form.room.trim(),
      day: form.day,
      startTime: form.startTime,
      endTime: form.endTime,
    })
    toast.success('Period added')
    form.open = false
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

async function remove(id: string): Promise<void> {
  try {
    await deleteRoutine(id)
    toast.success('Period removed')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
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
.day-block {
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
}
.day-block__title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-xs);
}
.periods {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.period {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-sm);
}
.link-danger {
  background: none;
  border: none;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(16, 24, 40, 0.45);
  display: grid;
  place-items: center;
  z-index: 60;
  padding: var(--spacing-lg);
}
.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-lg);
  width: min(560px, 100%);
  max-height: 90vh;
  overflow: auto;
}
.modal__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-md);
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
.form-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}
</style>
