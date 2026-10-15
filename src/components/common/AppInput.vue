<template>
  <label class="app-field">
    <span v-if="label" class="app-field__label">{{ label }}</span>
    <span class="app-field__wrap">
      <input
        class="app-input__control app-field__input"
        :value="modelValue"
        :placeholder="placeholder"
        :type="type === 'password' && show ? 'text' : type"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="type === 'password'"
        type="button"
        class="app-field__toggle"
        :title="show ? 'Hide password' : 'Show password'"
        aria-label="Toggle password visibility"
        @click="show = !show"
      >
        <EyeOff v-if="show" :size="18" />
        <Eye v-else :size="18" />
      </button>
    </span>
  </label>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    placeholder?: string
    type?: string
  }>(),
  { type: 'text', placeholder: '', label: '' },
)
defineEmits<{ 'update:modelValue': [value: string] }>()

const show = ref(false)
</script>

<style scoped>
.app-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.app-field__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.app-field__wrap {
  position: relative;
  display: block;
}
.app-field__input {
  width: 100%;
}
.app-field__toggle {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}
.app-field__toggle:hover {
  background: var(--color-primary-light);
  color: var(--color-text);
}
</style>
