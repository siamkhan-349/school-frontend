<template>
  <span
    class="app-spinner"
    :class="`app-spinner--${size}`"
    :style="delay > 0 ? { animationDelay: `${delay}ms` } : undefined"
    role="status"
    :aria-label="label"
  >
    <span class="app-spinner__ring" aria-hidden="true" />
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Visual size: sm = inside buttons/rows, md = card body, lg = full-page. */
    size?: 'sm' | 'md' | 'lg'
    /** Accessible name announced by screen readers. */
    label?: string
    /** ms to wait before becoming visible (avoids flicker on fast loads). */
    delay?: number
  }>(),
  { size: 'md', label: 'Loading', delay: 0 },
)
</script>

<style scoped>
.app-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  color: var(--color-primary);
  animation: app-spinner-enter 0.15s ease-out both;
}
.app-spinner__ring {
  display: block;
  border-radius: 50%;
  /* Half-arc ring: works on any background via currentColor. */
  border-style: solid;
  border-color: transparent;
  border-top-color: currentColor;
  border-right-color: currentColor;
  animation: app-spinner-spin 0.7s linear infinite;
}
.app-spinner--sm .app-spinner__ring {
  width: 14px;
  height: 14px;
  border-width: 2px;
}
.app-spinner--md .app-spinner__ring {
  width: 22px;
  height: 22px;
  border-width: 2.5px;
}
.app-spinner--lg .app-spinner__ring {
  width: 36px;
  height: 36px;
  border-width: 3px;
}
@keyframes app-spinner-enter {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes app-spinner-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .app-spinner {
    animation: none;
  }
  .app-spinner__ring {
    animation: none;
    border-top-color: currentColor;
    border-right-color: transparent;
    opacity: 0.7;
  }
}
</style>
