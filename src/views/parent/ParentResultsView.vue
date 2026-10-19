<template>
  <div class="page">
    <h1 class="page__title">Results</h1>
    <AppCard>
      <FilterPanel>
        <select v-model="childId" class="app-input__control">
          <option v-for="c in children" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </FilterPanel>
      <div v-if="isLoading" class="sk-stack">
        <AppSkeleton variant="card" />
        <AppSkeleton variant="card" />
      </div>
      <div v-else>
        <AppCard v-for="g in grouped" :key="g.examId" class="exam-card">
          <h3 class="exam-card__title">{{ g.examName }} <span class="muted">· {{ g.examDate }}</span></h3>
          <table class="table">
            <thead>
              <tr><th>Subject</th><th>Marks</th><th>Grade</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in g.rows" :key="r.subjectId">
                <td>{{ r.subjectName }}</td>
                <td>{{ r.marksObtained }}/{{ r.fullMarks }}</td>
                <td><span class="chip">{{ r.grade }}</span></td>
                <td>{{ r.absent ? 'Absent' : r.passed ? 'Passed' : 'Failed' }}</td>
              </tr>
            </tbody>
          </table>
        </AppCard>
        <p v-if="grouped.length === 0" class="muted">No published results for this child yet.</p>
      </div>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import { useParentResults, useStudents } from '@/composables/useQueries'

const { data: studentData } = useStudents({ perPage: 500 })
const children = computed(() => studentData.value?.data.items ?? [])
const childId = ref('')
watch(children, (list) => {
  if (!childId.value && list.length > 0) childId.value = list[0]?.id ?? ''
}, { immediate: true })

const { data, isLoading } = useParentResults(() => childId.value)
const results = computed(() => data.value?.data ?? [])
const grouped = computed(() => {
  const map = new Map<string, { examId: string; examName: string; examDate: string; rows: typeof results.value }>()
  for (const r of results.value) {
    let g = map.get(r.examId)
    if (!g) {
      g = { examId: r.examId, examName: r.examName, examDate: r.examDate, rows: [] }
      map.set(r.examId, g)
    }
    g.rows.push(r)
  }
  return [...map.values()]
})
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
.exam-card {
  margin-bottom: var(--spacing-md);
}
.exam-card__title {
  font-size: var(--font-size-base);
  font-weight: 700;
  margin: 0 0 var(--spacing-sm);
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
.chip {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  font-size: var(--font-size-xs);
}
/* Phones: the inner card adds its own padding — flatten it plus the cells
   so the 4-column result table fits without a nested scroll. */
@media (max-width: 640px) {
  .exam-card :deep(.app-card__body) {
    padding: var(--spacing-sm);
  }
  .table th,
  .table td {
    padding: var(--spacing-xs) var(--spacing-sm);
  }
}
</style>
