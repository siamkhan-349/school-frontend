<template>
  <label class="app-field">
    <span v-if="label" class="app-field__label">{{ label }}</span>
    <input
      class="app-input__control"
      :value="modelValue"
      :placeholder="placeholder"
      :type="type"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </label>
</template>

<script setup lang="ts">
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
</style>
