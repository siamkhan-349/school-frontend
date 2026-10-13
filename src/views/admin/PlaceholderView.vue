<template>
  <div class="page">
    <h1 class="page__title">{{ title }}</h1>
    <AppCard>
      <p class="page__muted">This module UI lands in the next phase. Mock API is already wired.</p>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-lg);
}
.page__muted {
  color: var(--color-text-muted);
}
</style>
