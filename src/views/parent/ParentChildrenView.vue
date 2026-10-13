<template>
  <div class="page">
    <h1 class="page__title">My Children</h1>
    <AppCard>
      <p v-if="isLoading" class="muted">Loading…</p>
      <table v-else class="table">
        <thead>
          <tr><th>Name</th><th>Roll</th><th>Class</th><th>Due (৳)</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="c in children" :key="c.id">
            <td>
              <span class="child-cell">
                <StudentAvatar :photo-url="c.photoUrl" :name="c.name" :gender="c.gender" :size="32" />
                {{ c.name }}
              </span>
            </td>
            <td>{{ c.roll }}</td>
            <td>{{ classLabel(c.classId) }}</td>
            <td>{{ c.dueAmount }}</td>
            <td class="row-actions">
              <RouterLink :to="`/parent/children/${c.id}`" class="link-btn">View</RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/common/AppCard.vue'
import StudentAvatar from '@/components/common/StudentAvatar.vue'
import { useClasses, useStudents } from '@/composables/useQueries'

const { data, isLoading } = useStudents({ perPage: 500 })
const children = computed(() => data.value?.data.items ?? [])
const { data: classData } = useClasses()
const classLabel = (id: string): string => classData.value?.data.find((c) => c.id === id)?.label ?? id
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
  vertical-align: middle;
}
.row-actions {
  text-align: right;
}
.child-cell {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.link-btn {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
}
</style>
