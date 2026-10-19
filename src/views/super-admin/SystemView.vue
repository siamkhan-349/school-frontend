<template>
  <div class="page">
    <h1 class="page__title">System</h1>
    <p class="muted">
      Institute identity — super-admin only. Admins cannot edit these. Module options (exam,
      cards, SMS) are configured from their own cards under Module Management.
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
      <dl class="kv">
        <div><dt>API mode</dt><dd>live</dd></div>
        <div><dt>Data layer</dt><dd>real backend database</dd></div>
      </dl>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import { useSettings, useUpdateSettings } from '@/composables/useQueries'
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
.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
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
.form__hint {
  margin: 0;
}
.kv {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
}
.kv div {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--spacing-xs);
}
.kv dt {
  color: var(--color-text-muted);
}
</style>
