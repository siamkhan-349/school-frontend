<template>
  <RouterView />
  <!-- One global toast host: works on every route (login, live display and
       all panels) and always stacks above dialogs (z-index 100 in main.css). -->
  <div class="app-toasts" role="status" aria-live="polite">
    <div v-for="t in toasts" :key="t.id" class="app-toast" :class="`app-toast--${t.type}`">
      <span class="app-toast__msg">{{ t.message }}</span>
      <button
        class="app-toast__close"
        type="button"
        aria-label="Dismiss notification"
        @click="dismiss(t.id)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>
