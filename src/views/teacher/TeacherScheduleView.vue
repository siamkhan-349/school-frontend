<template>
  <div class="page">
    <h1 class="page__title">My Schedule</h1>
    <p v-if="meLoading" class="muted">Loading…</p>
    <p v-else-if="!teacher" class="error">
      No teacher/staff profile is linked to this login. Ask the admin to link one from Users.
    </p>
    <template v-else>
      <div v-for="day in WEEK_DAYS" :key="day" class="day-block">
        <h3 class="day-block__title">{{ day }}</h3>
        <AppCard v-if="byDay(day).length > 0">
          <ul class="list">
            <li v-for="r in byDay(day)" :key="r.id" class="list__row">
              <div>
                <strong>{{ r.subjectLabel || r.title }}</strong>
                <p class="muted">
                  {{ r.startTime }}–{{ r.endTime }} · {{ classNameOf(r.classId) }}{{ r.room ? ` · Room ${r.room}` : '' }}
                </p>
              </div>
            </li>
          </ul>
        </AppCard>
        <p v-else class="muted">No classes.</p>
      </div>
      <p v-if="myRoutines.length === 0" class="muted">No classes assigned yet{{ teacher.kind === 'staff' ? ' (staff role — no teaching load expected)' : '' }}.</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/common/AppCard.vue'
import { useClasses, useMyTeacher, useRoutines } from '@/composables/useQueries'
import { WEEK_DAYS, type Routine, type WeekDay } from '@/types/models'

const { data: meData, isLoading: meLoading } = useMyTeacher()
const teacher = computed(() => meData.value?.data)
const teacherId = computed(() => teacher.value?.id ?? '')

const { data: routineData } = useRoutines()
const myRoutines = computed(() =>
  (routineData.value?.data ?? [])
    .filter((r) => r.status === 'active' && teacherId.value && (r.teacherIds ?? []).includes(teacherId.value))
    .sort((a, b) => a.startTime.localeCompare(b.startTime)),
)
const byDay = (day: WeekDay): Routine[] => myRoutines.value.filter((r) => r.day === day)

const { data: classData } = useClasses()
const classNameOf = (classId: string): string =>
  classData.value?.data.find((c) => c.id === classId)?.label ?? classId
</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-lg);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
}
.day-block {
  margin-bottom: var(--spacing-md);
}
.day-block__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-sm);
}
.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}
.list__row {
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
</style>
