<template>
  <div class="plain">
    <h1>{{ code }}</h1>
    <p>{{ message }}</p>
    <RouterLink to="/">Back to dashboard</RouterLink>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ code?: string; message?: string }>(), {
  code: '404',
  message: 'Page not found.',
})
</script>

<style scoped>
.plain {
  min-height: 60vh;
  display: grid;
  place-content: center;
  text-align: center;
  gap: var(--spacing-sm);
}
</style>
