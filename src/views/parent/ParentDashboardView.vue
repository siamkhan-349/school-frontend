<template>
  <div class="page">
    <h1 class="page__title">Parent Dashboard</h1>
    <div class="stat-grid">
      <AppCard title="My Children">
        <strong class="stat">{{ children.length }}</strong>
      </AppCard>
      <AppCard title="Total Due (৳)">
        <strong class="stat">{{ totalDue }}</strong>
      </AppCard>
      <AppCard title="Published Results">
        <strong class="stat">{{ publishedCount }}</strong>
      </AppCard>
      <AppCard title="Upcoming Notices">
        <strong class="stat">{{ upcomingEvents }}</strong>
      </AppCard>
    </div>
    <AppCard title="Children">
      <ul class="list">
        <li v-for="c in children" :key="c.id" class="list__row">
          <span class="child-cell">
            <StudentAvatar :photo-url="c.photoUrl" :name="c.name" :gender="c.gender" :size="32" />
            <RouterLink :to="`/parent/children/${c.id}`" class="link">
              {{ c.name }} (Roll {{ c.roll }})
            </RouterLink>
          </span>
          <span class="muted">Due ৳{{ c.dueAmount }}</span>
        </li>
      </ul>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/common/AppCard.vue'
import StudentAvatar from '@/components/common/StudentAvatar.vue'
import { useEvents, useParentPublishedResults, useStudents } from '@/composables/useQueries'

const { data: studentData } = useStudents({ perPage: 500 })
const children = computed(() => studentData.value?.data.items ?? [])
const totalDue = computed(() => children.value.reduce((sum, s) => sum + s.dueAmount, 0))

const { data: resultCount } = useParentPublishedResults()
const publishedCount = computed(() => resultCount.value?.count ?? 0)

const { data: eventData } = useEvents()
const upcomingEvents = computed(
  () => (eventData.value?.data ?? []).filter((e) => e.status === 'published').length,
)
</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-lg);
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
.stat {
  font-size: var(--font-size-2xl);
}
.list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.list__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.child-cell {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.link {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}
.muted {
  color: var(--color-text-muted);
}
</style>
