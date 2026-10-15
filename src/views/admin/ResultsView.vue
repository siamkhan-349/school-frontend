<template>
  <div class="page">
    <h1 class="page__title">Results</h1>
    <AppCard>
      <p v-if="isLoading" class="muted">Loading…</p>
      <table v-else class="table">
        <thead>
          <tr><th>Exam</th><th>Class</th><th>Appeared</th><th>Passed</th><th>Pass %</th><th>Topper</th><th></th></tr>
        </thead>
        <tbody>
          <template v-for="exam in published" :key="exam.id">
            <ResultRow :exam="exam" />
          </template>
          <tr v-if="published.length === 0">
            <td colspan="7" class="muted">No published results yet. Publish an exam to list it here.</td>
          </tr>
        </tbody>
      </table>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppCard from '@/components/common/AppCard.vue'
import { useClasses, useExamResults, useExams } from '@/composables/useQueries'
import { defineComponent, h } from 'vue'

const { data, isLoading } = useExams({ perPage: 500 })
const published = computed(() => (data.value?.data.items ?? []).filter((e) => e.status === 'published'))

const { data: classData } = useClasses()
const classMap = computed(() => Object.fromEntries((classData.value?.data ?? []).map((c) => [c.id, c.label])))

const ResultRow = defineComponent({
  props: { exam: { type: Object as () => { id: string; name: string; classId: string }, required: true } },
  setup(props) {
    const { data: resultsData } = useExamResults(props.exam.id)
    const summary = computed(() => resultsData.value?.data.summary ?? { students: 0, passed: 0, failed: 0, passRate: 0 })
    const topper = computed(() => resultsData.value?.data.rows[0]?.studentName ?? '—')
    return () =>
      h('tr', [
        h('td', props.exam.name),
        h('td', classMap.value[props.exam.classId] ?? props.exam.classId),
        h('td', String(summary.value.students)),
        h('td', String(summary.value.passed)),
        h('td', `${summary.value.passRate}%`),
        h('td', topper.value),
        h('td', { class: 'row-actions' }, [
          h(RouterLink, { to: `/admin/exams/${props.exam.id}`, class: 'link-btn' }, () => 'Open'),
          h(
            RouterLink,
            {
              to: { path: `/admin/exams/${props.exam.id}/card`, query: { from: 'results' } },
              class: 'link-btn',
            },
            () => 'Result Card',
          ),
        ]),
      ])
  },
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
:deep(.row-actions) {
  text-align: right;
  white-space: nowrap;
}
:deep(.row-actions .link-btn + .link-btn) {
  margin-left: var(--spacing-md);
}
:deep(.link-btn) {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
}
</style>
