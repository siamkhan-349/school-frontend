<template>
  <div class="page">
    <h1 class="page__title">Notices & Events</h1>
    <AppCard>
      <p v-if="isLoading" class="muted">Loading…</p>
      <ul v-else class="events">
        <li v-for="e in published" :key="e.id" class="event">
          <div>
            <strong>{{ e.title }}</strong>
            <span class="muted"> · {{ e.type }} · {{ e.eventDate }}</span>
            <span v-if="e.location" class="muted"> · {{ e.location }}</span>
            <p class="muted">{{ e.description }}</p>
          </div>
        </li>
      </ul>
      <p v-if="!isLoading && published.length === 0" class="muted">No notices right now.</p>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/common/AppCard.vue'
import { useEvents } from '@/composables/useQueries'

const { data, isLoading } = useEvents()
const published = computed(() =>
  (data.value?.data ?? []).filter(
    (e) => e.status === 'published' && (e.audience === 'all' || e.audience === 'teachers'),
  ),
)
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
.events {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}
.event {
  padding: var(--spacing-md) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
</style>
