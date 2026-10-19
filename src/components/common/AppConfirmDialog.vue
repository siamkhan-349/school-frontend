<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-backdrop" @click.self="!busy && $emit('cancel')">
      <div
        ref="dialogEl"
        class="dialog"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="messageId"
        @keydown.tab="trapFocus"
      >
        <h3 :id="titleId" class="dialog__title">{{ title }}</h3>
        <p :id="messageId" class="dialog__message">{{ message }}</p>
        <div class="dialog__actions">
          <AppButton variant="ghost" @click="$emit('cancel')">Cancel</AppButton>
          <AppButton :variant="confirmVariant" :loading="busy" @click="$emit('confirm')">
            {{ confirmText }}
          </AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, useId, watch } from 'vue'
import AppButton from './AppButton.vue'

const props = withDefaults(
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
const emit = defineEmits<{ cancel: []; confirm: [] }>()

const dialogEl = ref<HTMLElement | null>(null)
const uid = useId()
const titleId = `confirm-title-${uid}`
const messageId = `confirm-message-${uid}`
let previouslyFocused: HTMLElement | null = null

function focusables(): HTMLElement[] {
  if (!dialogEl.value) return []
  return Array.from(
    dialogEl.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  )
}

/** Keep Tab inside the dialog while it is open. */
function trapFocus(event: KeyboardEvent): void {
  const items = focusables()
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) return
  const active = document.activeElement as HTMLElement | null
  if (event.shiftKey && (active === first || !dialogEl.value?.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

// Escape cancels — but never while the action is in flight.
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open && !props.busy) emit('cancel')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement | null
      await nextTick()
      focusables()[0]?.focus()
    } else {
      previouslyFocused?.focus?.()
      previouslyFocused = null
    }
  },
)
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
  overflow-y: auto;
}
.dialog {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-lg);
  width: min(420px, 100%);
  max-height: min(85vh, 640px);
  max-height: min(85dvh, 640px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.dialog__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  overflow-wrap: anywhere;
}
.dialog__message {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}
.dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}
</style>
