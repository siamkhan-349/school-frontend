<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-backdrop" @click.self="$emit('cancel')">
      <div class="dialog" role="alertdialog" aria-modal="true">
        <h3 class="dialog__title">Publish "{{ examName }}"?</h3>
        <p class="dialog__message">
          Send guardians an SMS with the publish?
          The SMS includes: merit rank, total obtained out of full marks, and failed subjects if any.
        </p>
        <p v-if="hint" class="dialog__hint">{{ hint }}</p>
        <div class="dialog__actions">
          <AppButton variant="ghost" :disabled="busy" @click="$emit('cancel')">Cancel</AppButton>
          <AppButton variant="ghost" :disabled="busy" @click="$emit('publishOnly')">
            {{ busy ? 'Working…' : 'Publish only' }}
          </AppButton>
          <AppButton :disabled="busy" @click="$emit('publishSms')">
            {{ busy ? 'Sending…' : 'Publish with SMS' }}
          </AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import AppButton from './AppButton.vue'

defineProps<{ open: boolean; examName: string; hint?: string; busy?: boolean }>()
defineEmits<{ cancel: []; publishOnly: []; publishSms: [] }>()
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
  width: min(460px, 100%);
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
.dialog__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
.dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}
</style>
