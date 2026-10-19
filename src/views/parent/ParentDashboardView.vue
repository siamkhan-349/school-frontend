<template>
  <div class="page">
    <h1 class="page__title">Parent Dashboard</h1>
    <div class="stat-grid">
      <AppCard title="My Children">
        <AppSkeleton v-if="childrenLoading" variant="text" width="56px" />
        <strong v-else class="stat">{{ children.length }}</strong>
      </AppCard>
      <AppCard v-if="school.hasModule('payment')" title="Total Due (৳)">
        <AppSkeleton v-if="childrenLoading" variant="text" width="72px" />
        <strong v-else class="stat">{{ totalDue }}</strong>
      </AppCard>
      <AppCard v-if="school.hasModule('exam_result')" title="Published Results">
        <AppSkeleton v-if="resultsLoading" variant="text" width="56px" />
        <strong v-else class="stat">{{ publishedCount }}</strong>
      </AppCard>
      <AppCard v-if="school.hasModule('notice')" title="Upcoming Notices">
        <AppSkeleton v-if="eventsLoading" variant="text" width="56px" />
        <strong v-else class="stat">{{ upcomingEvents }}</strong>
      </AppCard>
    </div>
    <AppCard title="Children">
      <AppSkeleton v-if="childrenLoading" variant="list" :rows="3" />
      <ul v-else class="list">
        <li v-for="c in children" :key="c.id" class="list__row">
          <span class="child-cell">
            <StudentAvatar :photo-url="c.photoUrl" :name="c.name" :gender="c.gender" :size="32" />
            <RouterLink :to="`/parent/children/${c.id}`" class="link">
              {{ c.name }} (Roll {{ c.roll }})
            </RouterLink>
          </span>
          <span v-if="school.hasModule('payment')" class="muted">Due ৳{{ c.dueAmount }}</span>
        </li>
      </ul>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import StudentAvatar from '@/components/common/StudentAvatar.vue'
import { useEvents, useParentPublishedResults, useStudents } from '@/composables/useQueries'
import { useSchoolStore } from '@/stores/school'

const school = useSchoolStore()
const { data: studentData, isLoading: childrenLoading } = useStudents({ perPage: 500 })
const children = computed(() => studentData.value?.data.items ?? [])
const totalDue = computed(() => children.value.reduce((sum, s) => sum + s.dueAmount, 0))

const { data: resultCount, isLoading: resultsLoading } = useParentPublishedResults(() => school.hasModule('exam_result'))
const publishedCount = computed(() => resultCount.value?.count ?? 0)

const { data: eventData, isLoading: eventsLoading } = useEvents(() => school.hasModule('notice'))
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
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.child-cell {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
  overflow-wrap: anywhere;
}
.link {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}
.muted {
  color: var(--color-text-muted);
}
</style>
