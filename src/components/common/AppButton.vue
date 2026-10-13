<template>
  <button :class="['app-btn', `app-btn--${variant}`]" :disabled="disabled" :type="type">
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'ghost' | 'danger'
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', disabled: false, type: 'button' },
)
</script>

<style scoped>
.app-btn {
  height: 40px;
  padding: 0 var(--spacing-md);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  font-weight: var(--font-weight-medium);
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
}
.app-btn--primary {
  background: var(--color-primary);
  color: var(--color-primary-contrast);
}
.app-btn--primary:hover {
  background: var(--color-primary-hover);
}
.app-btn--ghost {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-text);
}
.app-btn--danger {
  background: var(--color-danger);
  color: #fff;
}
.app-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
