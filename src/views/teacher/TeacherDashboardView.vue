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
import { useClasses, useLeaves, useMyTeacher, useRoutines } from '@/composables/useQueries'
import { useSchoolStore } from '@/stores/school'
import type { WeekDay } from '@/types/models'
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

const { data: leavesData, isLoading: leavesLoading } = useLeaves(() => school.hasModule('payroll'))
const pendingLeaves = computed(
  () => (leavesData.value?.data ?? []).filter((l) => l.teacherId === teacherId.value && l.status === 'pending').length,
)

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
