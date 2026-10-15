<template>
  <div class="page">
    <h1 class="page__title">System</h1>
    <p class="muted">Institute configuration — super-admin only. Admins cannot edit these.</p>

    <p v-if="isLoading" class="muted">Loading…</p>
    <AppCard v-else title="Institute Configuration">
      <form class="form" @submit.prevent="saveProfile">
        <label>School name<input v-model="profile.schoolName" class="app-input__control" required /></label>
        <label>Address<input v-model="profile.address" class="app-input__control" /></label>
        <label>Phone<input v-model="profile.phone" class="app-input__control" /></label>
        <div class="form__row">
          <label>Starts at<input v-model="profile.schoolStartTime" type="time" class="app-input__control" /></label>
          <label>Ends at<input v-model="profile.schoolEndTime" type="time" class="app-input__control" /></label>
        </div>
        <label>Result SMS mode
          <select v-model="profile.resultSmsMode" class="app-input__control">
            <option value="after_publish">After publish</option>
            <option value="per_student">Per student</option>
          </select>
        </label>
        <label>Card cooldown (minutes after issue before taps work, 0 = off)
          <input v-model.number="profile.cardCooldownMinutes" type="number" min="0" class="app-input__control" />
        </label>
        <label class="check">
          <input v-model="profile.entrySmsEnabled" type="checkbox" />
          Entry SMS — guardian gets present + entry time on card punch
        </label>
        <label class="check">
          <input v-model="profile.exitSmsEnabled" type="checkbox" />
          Exit SMS — guardian gets exit time on exit punch
        </label>
        <AppButton type="submit" :disabled="saving">
          {{ saving ? 'Saving…' : 'Save Configuration' }}
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
import { useSettings, useUpdateSettings } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { useSchoolStore } from '@/stores/school'

const toast = useToast()
const school = useSchoolStore()
const { data, isLoading } = useSettings()
const { mutateAsync: updateSettings, isPending: saving } = useUpdateSettings()

const profile = reactive({
  schoolName: '',
  address: '',
  phone: '',
  schoolStartTime: '',
  schoolEndTime: '',
  resultSmsMode: 'after_publish' as 'after_publish' | 'per_student',
  cardCooldownMinutes: 1,
  entrySmsEnabled: false,
  exitSmsEnabled: false,
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
    profile.resultSmsMode = s.resultSmsMode
    profile.cardCooldownMinutes = Number(s.cardCooldownMinutes ?? 1) || 0
    profile.entrySmsEnabled = Boolean(s.entrySmsEnabled)
    profile.exitSmsEnabled = Boolean(s.exitSmsEnabled)
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
.form label.check {
  flex-direction: row;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
}
.form label.check input {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
}
.form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
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
