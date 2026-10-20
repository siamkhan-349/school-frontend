<template>
  <div class="page">
    <h1 class="page__title">System</h1>
    <p class="muted">
      Institute identity and the single school-admin login — super-admin only. Admins cannot edit these.
      Module options (exam, cards, SMS) are configured from their own cards under Module Management.
    </p>

    <div v-if="isLoading" class="sk-stack">
      <AppSkeleton variant="card" />
      <AppSkeleton variant="card" />
    </div>
    <AppCard v-else title="Institute Configuration">
      <form class="form" @submit.prevent="saveProfile">
        <label>School name<input v-model="profile.schoolName" class="app-input__control" required /></label>
        <label>Address<input v-model="profile.address" class="app-input__control" /></label>
        <label>Phone<input v-model="profile.phone" class="app-input__control" /></label>
        <div class="form__row">
          <label>Starts at<input v-model="profile.schoolStartTime" type="time" class="app-input__control" /></label>
          <label>Ends at<input v-model="profile.schoolEndTime" type="time" class="app-input__control" /></label>
        </div>
        <AppButton type="submit" :loading="saving">
          Save Configuration
        </AppButton>
      </form>
    </AppCard>

    <AppCard class="admin-card" title="Admin Login">
      <p class="muted card-hint">
        One school means one admin account. The super admin sets the username and password here;
        the admin can change only their own password from My Profile.
      </p>
      <AppSkeleton v-if="adminLoading" variant="card" />
      <form v-else class="form form--last" @submit.prevent="saveAdmin">
        <div class="form__row">
          <label>Name<input v-model="adminForm.name" class="app-input__control" required /></label>
          <label>Username<input v-model="adminForm.username" class="app-input__control" required /></label>
        </div>
        <div class="form__row">
          <label>Phone<input v-model="adminForm.phone" class="app-input__control" placeholder="01XXXXXXXXX" /></label>
          <label>
            Status
            <select v-model="adminForm.status" class="app-input__control">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
        <div class="form__row">
          <PasswordInput
            v-model="adminForm.password"
            :label="admin ? 'New password (blank = keep current)' : 'Password'"
            :required="!admin"
            :minlength="6"
            autocomplete="new-password"
            placeholder="Min 6 characters"
          />
          <PasswordInput
            v-model="adminForm.confirmPassword"
            label="Confirm password"
            :required="!!adminForm.password"
            :minlength="6"
            autocomplete="new-password"
            placeholder="Repeat new password"
          />
        </div>
        <p v-if="adminError" class="error">{{ adminError }}</p>
        <AppButton type="submit" :loading="savingAdmin">
          {{ admin ? 'Save Admin Login' : 'Create Admin Login' }}
        </AppButton>
      </form>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import PasswordInput from '@/components/common/PasswordInput.vue'
import {
  useSchoolAdmin,
  useSettings,
  useUpdateSchoolAdmin,
  useUpdateSettings,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { useSchoolStore } from '@/stores/school'

const toast = useToast()
const school = useSchoolStore()
const { data, isLoading } = useSettings()
const { mutateAsync: updateSettings, isPending: saving } = useUpdateSettings()

// Only the institute identity fields this page owns. Module-scoped settings
// (exam entry mode, exam sittings, result SMS mode, card-punch SMS, card
// cooldown) are edited on their own module cards under Module Management
// now, and staying out of this payload means a save here can never
// overwrite what a module card set.
const profile = reactive({
  schoolName: '',
  address: '',
  phone: '',
  schoolStartTime: '',
  schoolEndTime: '',
})

watch(
  data,
  (res) => {
    const s = res?.data
    if (!s) return
    profile.schoolName = s.schoolName
    profile.address = s.address
    profile.phone = s.phone
    profile.schoolStartTime = s.schoolStartTime
    profile.schoolEndTime = s.schoolEndTime
  },
  { immediate: true },
)

async function saveProfile(): Promise<void> {
  try {
    await updateSettings({ ...profile })
    await school.refresh()
    toast.success('System configuration saved')
  } catch {
    toast.error('Save failed')
  }
}

// One school, one admin. The endpoint returns null when no admin row exists
// (a hand-deleted account); the same form then creates the first one.
const { data: adminData, isLoading: adminLoading } = useSchoolAdmin()
const { mutateAsync: updateSchoolAdmin, isPending: savingAdmin } = useUpdateSchoolAdmin()
const admin = computed(() => adminData.value?.data ?? null)
const adminForm = reactive({
  name: '',
  username: '',
  phone: '',
  password: '',
  confirmPassword: '',
  status: 'active' as 'active' | 'inactive',
})
const adminError = ref('')

watch(
  admin,
  (account) => {
    adminForm.name = account?.name ?? ''
    adminForm.username = account?.username ?? ''
    adminForm.phone = account?.phone ?? ''
    adminForm.status = account?.status === 'inactive' ? 'inactive' : 'active'
  },
  { immediate: true },
)

async function saveAdmin(): Promise<void> {
  adminError.value = ''
  if (!adminForm.name.trim() || !adminForm.username.trim()) {
    adminError.value = 'Name and username are required.'
    return
  }
  if (!admin && !adminForm.password) {
    adminError.value = 'A password is required for the first admin login.'
    return
  }
  if (adminForm.password && adminForm.password.length < 6) {
    adminError.value = 'Password must be at least 6 characters.'
    return
  }
  if (adminForm.password !== adminForm.confirmPassword) {
    adminError.value = 'Passwords do not match.'
    return
  }
  try {
    await updateSchoolAdmin({
      name: adminForm.name.trim(),
      username: adminForm.username.trim().toLowerCase(),
      phone: adminForm.phone.trim(),
      status: adminForm.status,
      ...(adminForm.password ? { password: adminForm.password } : {}),
    })
    adminForm.password = ''
    adminForm.confirmPassword = ''
    toast.success(admin ? 'Admin login updated' : 'Admin login created')
  } catch (e) {
    adminError.value = e instanceof Error ? e.message : 'Save failed'
  }
}
</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-xs);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-md);
}
.card-hint {
  margin: 0 0 var(--spacing-md);
}
.admin-card {
  margin-top: var(--spacing-lg);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin: 0;
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}
.form--last {
  margin-bottom: 0;
}
.form label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
}
@media (max-width: 640px) {
  .form__row {
    grid-template-columns: 1fr;
  }
}
</style>
