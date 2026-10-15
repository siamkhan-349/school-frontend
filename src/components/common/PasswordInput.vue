<template>
  <label class="pwd-field">
    <span v-if="label" class="pwd-field__label">{{ label }}</span>
    <span class="pwd-field__wrap">
      <input
        v-model="model"
        class="app-input__control pwd-field__input"
        :type="show ? 'text' : 'password'"
        :placeholder="placeholder"
        :required="required"
        :minlength="minlength"
        :autocomplete="autocomplete"
        :disabled="disabled"
      />
      <button
        type="button"
        class="pwd-field__toggle"
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

const model = defineModel<string>({ required: true })

withDefaults(
  defineProps<{
    label?: string
    placeholder?: string
    required?: boolean
    minlength?: number
    autocomplete?: string
    disabled?: boolean
  }>(),
  { label: '', placeholder: '', required: false, minlength: undefined, autocomplete: 'new-password', disabled: false },
)

const show = ref(false)
</script>

<style scoped>
.pwd-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.pwd-field__label {
  font-weight: var(--font-weight-medium);
}
.pwd-field__wrap {
  position: relative;
  display: block;
}
.pwd-field__input {
  width: 100%;
  padding-right: 40px;
}
.pwd-field__toggle {
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
.pwd-field__toggle:hover {
  background: var(--color-primary-light);
  color: var(--color-text);
}
</style>
