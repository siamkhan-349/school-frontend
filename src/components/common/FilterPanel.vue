<template>
  <div class="filters">
    <slot />
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}
.filters :deep(.app-input__control) {
  width: auto;
  min-width: 180px;
}

@media (max-width: 640px) {
  .filters :deep(.app-input__control) {
    width: 100%;
    min-width: 0;
    flex: 1 1 100%;
  }
}
</style>
