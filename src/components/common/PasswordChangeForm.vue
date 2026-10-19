<template>
  <AppCard title="Change Password">
    <form class="form" @submit.prevent="save">
      <PasswordInput v-model="pwd.currentPassword" label="Current password" required autocomplete="current-password" />
      <PasswordInput v-model="pwd.newPassword" label="New password (min 6 characters)" required :minlength="6" autocomplete="new-password" />
      <PasswordInput v-model="pwd.confirm" label="Confirm new password" required autocomplete="new-password" />
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <AppButton type="submit" :loading="saving">Update Password</AppButton>
    </form>
  </AppCard>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import AppButton from './AppButton.vue'
import AppCard from './AppCard.vue'
import PasswordInput from './PasswordInput.vue'
import { useChangePassword } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const pwd = reactive({ currentPassword: '', newPassword: '', confirm: '' })
const error = ref('')
const { mutateAsync: changePassword, isPending: saving } = useChangePassword()

async function save(): Promise<void> {
  error.value = ''
  if (pwd.newPassword !== pwd.confirm) {
    error.value = 'New passwords do not match'
    return
  }
  try {
    await changePassword({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword })
    toast.success('Password updated')
    pwd.currentPassword = ''
    pwd.newPassword = ''
    pwd.confirm = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed'
  }
}
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.form label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
</style>
