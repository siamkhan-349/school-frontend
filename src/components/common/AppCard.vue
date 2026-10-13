<template>
  <section class="app-card">
    <header v-if="title" class="app-card__head">
      <h3 class="app-card__title">{{ title }}</h3>
    </header>
    <div class="app-card__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<style scoped>
.app-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
.app-card__head {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}
.app-card__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.app-card__body {
  padding: var(--spacing-lg);
}
</style>
