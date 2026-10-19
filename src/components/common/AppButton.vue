<template>
  <button
    :class="['app-btn', `app-btn--${variant}`]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    :type="type"
  >
    <AppSpinner v-if="loading" size="sm" label="Working" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import AppSpinner from './AppSpinner.vue'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'ghost' | 'danger'
    disabled?: boolean
    /** Shows an inline spinner and disables the button while an action runs. */
    loading?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', disabled: false, loading: false, type: 'button' },
)
</script>

<!-- Visual styles for .app-btn live in src/assets/main.css (global) so the
     raw shell buttons can use the same classes. -->
