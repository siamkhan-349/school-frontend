<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-backdrop" @click.self="$emit('cancel')">
      <div class="dialog" role="alertdialog" aria-modal="true">
        <h3 class="dialog__title">{{ title }}</h3>
        <p class="dialog__message">{{ message }}</p>
        <div class="dialog__actions">
          <AppButton variant="ghost" @click="$emit('cancel')">Cancel</AppButton>
          <AppButton :variant="confirmVariant" :disabled="busy" @click="$emit('confirm')">
            {{ busy ? 'Working…' : confirmText }}
          </AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import AppButton from './AppButton.vue'

withDefaults(
  defineProps<{
    open: boolean
    title?: string
    message?: string
    confirmText?: string
    confirmVariant?: 'primary' | 'ghost' | 'danger'
    busy?: boolean
  }>(),
  { title: 'Are you sure?', message: '', confirmText: 'Delete', confirmVariant: 'danger', busy: false },
)
defineEmits<{ cancel: []; confirm: [] }>()
</script>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(16, 24, 40, 0.45);
  display: grid;
  place-items: center;
  z-index: 60;
  padding: var(--spacing-lg);
}
.dialog {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-lg);
  width: min(420px, 100%);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.dialog__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.dialog__message {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}
</style>
