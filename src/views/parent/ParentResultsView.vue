<template>
  <div class="page">
    <h1 class="page__title">Results</h1>
    <AppCard>
      <FilterPanel>
        <select v-model="childId" class="app-input__control">
          <option v-for="c in children" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </FilterPanel>
      <p v-if="isLoading" class="muted">Loading…</p>
      <table v-else class="table">
        <thead>
          <tr><th>Exam</th><th>Date</th><th>Marks</th><th>Grade</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in results" :key="r.examId">
            <td>{{ r.examName }}</td>
            <td>{{ r.examDate }}</td>
            <td>{{ r.marksObtained }}/{{ r.fullMarks }}</td>
            <td><span class="chip">{{ r.grade }}</span></td>
            <td>{{ r.marksObtained >= r.passMarks ? 'Passed' : 'Failed' }}</td>
          </tr>
          <tr v-if="results.length === 0">
            <td colspan="5" class="muted">No published results for this child yet.</td>
          </tr>
        </tbody>
      </table>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppCard from '@/components/common/AppCard.vue'
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
</style>
