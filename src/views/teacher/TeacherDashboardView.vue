<template>
  <div class="page">
    <h1 class="page__title">Dashboard</h1>
    <div v-if="meLoading" class="sk-stack">
      <AppSkeleton variant="card" />
      <AppSkeleton variant="card" />
      <AppSkeleton variant="card" />
    </div>
    <p v-else-if="!teacher" class="error">
      No teacher/staff profile is linked to this login. Ask the admin to link one from Users.
    </p>
    <template v-else>
      <p class="muted">Welcome, {{ teacher.name }} ({{ teacher.designation || teacher.kind || 'Staff' }})</p>
      <div class="stat-grid">
        <AppCard v-if="school.hasModule('routine')"><p class="stat-label">Today's Classes</p><AppSkeleton v-if="routinesLoading" variant="text" width="40px" /><p v-else class="stat-value">{{ todayRoutines.length }}</p></AppCard>
        <AppCard v-if="school.hasModule('routine')"><p class="stat-label">This Week</p><AppSkeleton v-if="routinesLoading" variant="text" width="40px" /><p v-else class="stat-value">{{ myRoutines.length }}</p></AppCard>
        <AppCard v-if="school.hasModule('payroll')"><p class="stat-label">Pending Leaves</p><AppSkeleton v-if="leavesLoading" variant="text" width="40px" /><p v-else class="stat-value">{{ pendingLeaves }}</p></AppCard>
      </div>
      <AppCard v-if="school.teacherExamAccess" class="action-card" title="Action Needed">
        <AppSkeleton v-if="examSummaryLoading" variant="lines" :lines="2" />
        <p v-else-if="examPending === 0" class="muted">All caught up — no exam work pending.</p>
        <template v-else>
          <ul class="action-list">
            <li v-if="examSummary.setupSubjects > 0" class="action-row">
              <div>
                <strong>{{ examSummary.setupSubjects }} subject setup{{ examSummary.setupSubjects === 1 ? '' : 's' }} pending</strong>
                <p class="muted">{{ setupNames }}</p>
              </div>
              <span class="action-tag action-tag--setup">Setup</span>
            </li>
            <li v-if="examSummary.marksSubjects > 0" class="action-row">
              <div>
                <strong>{{ examSummary.marksSubjects }} subject{{ examSummary.marksSubjects === 1 ? '' : 's' }} need marks</strong>
                <p class="muted">{{ examSummary.marksExams }} exam{{ examSummary.marksExams === 1 ? '' : 's' }} waiting</p>
              </div>
              <span class="action-tag action-tag--marks">Marks</span>
            </li>
          </ul>
          <RouterLink to="/teacher/exams" class="link-btn">Open Exam Marks →</RouterLink>
        </template>
      </AppCard>
      <AppCard v-if="school.hasModule('routine')" title="Today's Schedule">
        <ul v-if="todayRoutines.length > 0" class="list">
          <li v-for="r in todayRoutines" :key="r.id" class="list__row">
            <div>
              <strong>{{ r.subjectLabel || r.title }}</strong>
              <p class="muted">{{ r.startTime }}–{{ r.endTime }} · {{ classNameOf(r.classId) }}{{ r.room ? ` · Room ${r.room}` : '' }}</p>
            </div>
          </li>
        </ul>
        <AppSkeleton v-else-if="routinesLoading" variant="list" :rows="3" />
        <p v-else class="muted">No classes today.</p>
        <RouterLink to="/teacher/schedule" class="link-btn">Full schedule →</RouterLink>
      </AppCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import { useClasses, useLeaves, useMyTeacher, useRoutines, useTeacherExamSummary } from '@/composables/useQueries'
import { useSchoolStore } from '@/stores/school'
import type { TeacherExamSummary, WeekDay } from '@/types/models'
const school = useSchoolStore()
const { data: meData, isLoading: meLoading } = useMyTeacher()
const teacher = computed(() => meData.value?.data)
const teacherId = computed(() => teacher.value?.id ?? '')

const { data: routineData, isLoading: routinesLoading } = useRoutines(undefined, undefined, undefined, () => school.hasModule('routine'))
const myRoutines = computed(() =>
  (routineData.value?.data ?? []).filter(
    (r) => r.status === 'active' && teacherId.value && (r.teacherIds ?? []).includes(teacherId.value),
  ),
)
const JS_DAY: WeekDay[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const todayName = computed<WeekDay>(() => JS_DAY[new Date().getDay()] ?? 'Sat')
const todayRoutines = computed(() =>
  myRoutines.value
    .filter((r) => r.day === todayName.value)
    .sort((a, b) => a.startTime.localeCompare(b.startTime)),
)

const { data: leavesData, isLoading: leavesLoading } = useLeaves({}, () => school.hasModule('payroll'))
const pendingLeaves = computed(
  () => (leavesData.value?.data ?? []).filter((l) => l.teacherId === teacherId.value && l.status === 'pending').length,
)

// Exam work queue: counts come from the backend's business state (subject
// rows with no numbers yet, students with no saved mark), so they clear on
// their own — no read/unread bookkeeping to get out of sync.
const EMPTY_SUMMARY: TeacherExamSummary = {
  setupSubjects: 0, setupExams: 0, marksSubjects: 0, marksExams: 0, pending: 0, items: [],
}
const { data: examSummaryData, isLoading: examSummaryLoading } = useTeacherExamSummary(
  () => school.teacherExamAccess,
)
const examSummary = computed<TeacherExamSummary>(() => examSummaryData.value?.data ?? EMPTY_SUMMARY)
const examPending = computed(() => examSummary.value.pending)
const setupNames = computed(() => {
  const names = [...new Set(examSummary.value.items.flatMap((i) => i.setupSubjectNames))]
  if (names.length <= 6) return names.join(', ')
  return `${names.slice(0, 6).join(', ')} +${names.length - 6} more`
})

const { data: classData } = useClasses()
const classNameOf = (classId: string): string =>
  classData.value?.data.find((c) => c.id === classId)?.label ?? classId
</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-xs);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--spacing-md);
  margin: var(--spacing-md) 0;
}
@media (max-width: 640px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }
}
.stat-label {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin: 0 0 4px;
}
.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: 0;
}
.action-list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.action-card {
  margin-bottom: var(--spacing-md);
}
.action-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.action-row:last-child {
  border-bottom: 0;
}
.action-row strong {
  font-weight: var(--font-weight-semibold);
}
.action-tag {
  flex-shrink: 0;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.action-tag--setup {
  background: var(--color-danger-light);
  color: var(--color-danger);
}
.action-tag--marks {
  background: var(--color-warning-light);
  color: var(--color-warning);
}
.list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--spacing-sm);
  display: flex;
  flex-direction: column;
}
.list__row {
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.link-btn {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
}
</style>
