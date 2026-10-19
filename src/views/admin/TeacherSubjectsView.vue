<template>
  <div class="page">
    <div class="page__head">
      <div>
        <button class="link-btn" type="button" @click="router.back()">← Teachers & Staff</button>
        <h1 class="page__title">Assign Subjects — {{ teacherName || '…' }}</h1>
        <p class="muted">Which teacher teaches which subject — assign here without a routine.</p>
      </div>
    </div>

    <AppCard>
      <div class="assign-grid">
        <label>Class (filter)
          <select v-model="classFilter" class="app-input__control">
            <option value="">All classes</option>
            <option v-for="c in allClasses" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
        </label>
        <label>Subject
          <select v-model="subjectId" class="app-input__control">
            <option value="">Select subject…</option>
            <option
              v-for="s in filteredSubjects"
              :key="s.id"
              :value="s.id"
              :disabled="takenByOther(s.id)"
            >
              {{ s.label }}{{ s.department ? ` (${s.department})` : '' }}{{ ownerName(s.id) ? ` — ${ownerName(s.id)}` : '' }}
            </option>
          </select>
        </label>
        <div class="assign-action">
          <AppButton type="button" :disabled="!subjectId" :loading="assigning" @click="assign">Assign</AppButton>
        </div>
      </div>
      <p class="muted assign-note">A subject with a teacher already assigned cannot be picked — remove that assignment first.</p>
      <p v-if="formError" class="error">{{ formError }}</p>
    </AppCard>

    <AppCard>
      <h3 class="card-title">Assigned subjects ({{ assigned.length }})</h3>
      <div v-if="loading" class="sk-stack">
        <AppSkeleton variant="card" />
        <AppSkeleton variant="card" />
      </div>
      <p v-else-if="!assigned.length" class="muted">No subjects assigned yet.</p>
      <table v-else class="table">
        <thead>
          <tr><th>Subject</th><th>Class</th><th>Department</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="r in assigned" :key="r.id">
            <td>{{ r.subjectLabel }}</td>
            <td>{{ r.classLabel || '—' }}</td>
            <td>{{ r.department || '—' }}</td>
            <td class="row-actions-cell">
              <button class="link-btn link-btn--danger" type="button" :disabled="unassigningId === r.id" @click="unassign(r)">
                <AppSpinner v-if="unassigningId === r.id" size="sm" label="Working" />
                <template v-else>Remove</template>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import { useClasses, useSubjects } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { teacherService, teacherSubjectService } from '@/services'
import type { TeacherSubject } from '@/types/models'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const teacherId = computed(() => String(route.params.id || ''))

const teacherName = ref('')
const assigned = ref<TeacherSubject[]>([])
const owners = ref<TeacherSubject[]>([])
const loading = ref(false)
const assigning = ref(false)
const unassigningId = ref<string | null>(null)
const formError = ref('')
const classFilter = ref('')
const subjectId = ref('')

// One teacher per subject: label each subject option with its current
// teacher and block subjects that already belong to someone else.
const ownerBySubject = computed(() => {
  const map = new Map<string, TeacherSubject>()
  for (const r of owners.value) map.set(r.subjectId, r)
  return map
})
const ownerName = (sid: string): string => ownerBySubject.value.get(sid)?.teacherName ?? ''
const takenByOther = (sid: string): boolean => {
  const owner = ownerBySubject.value.get(sid)
  return Boolean(owner && owner.teacherId !== teacherId.value)
}

const { data: classData } = useClasses()
const allClasses = computed(() =>
  [...(classData.value?.data ?? [])].sort((a, b) => a.label.localeCompare(b.label)),
)
const { data: subjectData } = useSubjects(undefined)
const allSubjects = computed(() => subjectData.value?.data ?? [])
const classLabelOf = (id: string | null): string =>
  allClasses.value.find((c) => c.id === id)?.label ?? ''
const filteredSubjects = computed(() =>
  allSubjects.value.filter((s) => !classFilter.value || s.classId === classFilter.value),
)

async function load(): Promise<void> {
  if (!teacherId.value) return
  loading.value = true
  try {
    const [t, rows, all] = await Promise.all([
      teacherService.get(teacherId.value),
      teacherSubjectService.list(teacherId.value),
      teacherSubjectService.listAll(),
    ])
    teacherName.value = t.data?.name ?? ''
    assigned.value = rows.data ?? []
    owners.value = all.data ?? []
  } catch {
    toast.error('Failed to load data')
  } finally {
    loading.value = false
  }
}

async function assign(): Promise<void> {
  if (!subjectId.value) return
  formError.value = ''
  assigning.value = true
  try {
    await teacherSubjectService.assign(teacherId.value, subjectId.value)
    toast.success('Subject assigned')
    subjectId.value = ''
    await load()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Assign failed'
  } finally {
    assigning.value = false
  }
}

async function unassign(row: TeacherSubject): Promise<void> {
  unassigningId.value = row.id
  try {
    await teacherSubjectService.unassign(row.id)
    toast.success('Subject removed')
    await load()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Remove failed')
  } finally {
    unassigningId.value = null
  }
}

onMounted(() => {
  void load()
})
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
  margin-top: var(--spacing-xs);
}
.muted {
  color: var(--color-text-muted);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.assign-note {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-xs);
}
.assign-grid {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: var(--spacing-sm);
  align-items: end;
}
.assign-grid label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  min-width: 0;
}
.assign-grid .app-input__control {
  min-width: 0;
}
/* Phones: stack subject → teacher → Assign button. */
@media (max-width: 640px) {
  .assign-grid {
    grid-template-columns: 1fr;
  }
}
.card-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-md);
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
.row-actions-cell {
  text-align: right;
  white-space: nowrap;
}
.link-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.link-btn--danger {
  color: var(--color-danger);
}
</style>
