<template>
  <div class="page">
    <h1 class="page__title">Class Routine</h1>
    <AppCard>
      <FilterPanel>
        <select v-model="childId" class="app-input__control">
          <option v-for="c in children" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </FilterPanel>
      <div v-if="routinesLoading" class="sk-stack">
        <AppSkeleton variant="card" />
        <AppSkeleton variant="card" />
        <AppSkeleton variant="card" />
      </div>
      <template v-else>
        <div v-for="day in WEEK_DAYS" :key="day" class="day-block">
          <h3 class="day-block__title">{{ day }}</h3>
          <ul class="periods">
            <li v-for="r in byDay(day)" :key="r.id" class="period">
              <strong>{{ r.startTime }}–{{ r.endTime }}</strong>
              <span class="muted"> · {{ r.subjectLabel }} · {{ r.teacherName }} · Room {{ r.room }}</span>
            </li>
          </ul>
          <p v-if="byDay(day).length === 0" class="muted">—</p>
        </div>
      </template>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import { useRoutines, useStudents } from '@/composables/useQueries'
import { WEEK_DAYS, type Routine, type WeekDay } from '@/types/models'

const { data: studentData } = useStudents({ perPage: 500 })
const children = computed(() => studentData.value?.data.items ?? [])
const childId = ref('')
watch(children, (list) => {
  if (!childId.value && list.length > 0) childId.value = list[0]?.id ?? ''
}, { immediate: true })

const child = computed(() => children.value.find((c) => c.id === childId.value))
const { data, isLoading: routinesLoading } = useRoutines(
  () => child.value?.classId,
  () => (child.value?.sectionId ?? null) as string | null | undefined,
  'class',
)
const routines = computed(() => {
  const rows = data.value?.data ?? []
  return rows.filter(
    (r) =>
      r.classId === child.value?.classId &&
      (child.value?.sectionId == null || (r.sectionId ?? null) === (child.value?.sectionId ?? null)),
  )
})
const byDay = (day: WeekDay): Routine[] => routines.value.filter((r) => r.day === day)
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
  font-size: var(--font-size-sm);
}
</style>
