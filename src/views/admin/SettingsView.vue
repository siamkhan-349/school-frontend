<template>
  <div class="page">
    <h1 class="page__title">Settings</h1>

    <p v-if="isLoading" class="muted">Loading…</p>
    <template v-else>
      <div class="grid">
        <AppCard title="School Profile">
          <form class="form" @submit.prevent="saveProfile">
            <label>School name<input v-model="profile.schoolName" class="app-input__control" required /></label>
            <label>Address<input v-model="profile.address" class="app-input__control" /></label>
            <label>Phone<input v-model="profile.phone" class="app-input__control" /></label>
            <div class="form__row">
              <label>Starts at<input v-model="profile.schoolStartTime" type="time" class="app-input__control" /></label>
              <label>Ends at<input v-model="profile.schoolEndTime" type="time" class="app-input__control" /></label>
            </div>
            <label>Late after (blank = start time)<input v-model="profile.lateTime" type="time" class="app-input__control" /></label>
            <AppButton type="submit" :disabled="savingProfile">
              {{ savingProfile ? 'Saving…' : 'Save Profile' }}
            </AppButton>
          </form>
          <p class="muted">Modules, institute type and platform options are managed by the super-admin.</p>
        </AppCard>

        <AppCard title="Holidays">
          <form class="form" @submit.prevent="saveHolidays">
            <div>
              <p class="form__label">Weekly holiday days</p>
              <div class="day-row">
                <label v-for="d in WEEK_DAYS" :key="d" class="check">
                  <input v-model="holidays.weekly" type="checkbox" :value="d" /> {{ dayLabel(d) }}
                </label>
              </div>
            </div>
            <div>
              <p class="form__label">Fixed holidays (breaks)</p>
              <div v-for="(h, i) in holidays.spans" :key="i" class="span-row">
                <input v-model="h.from" type="date" class="app-input__control" required />
                <input v-model="h.to" type="date" class="app-input__control" title="To (blank = single day)" />
                <input v-model="h.label" class="app-input__control" placeholder="Label (e.g. Eid break)" />
                <button class="link-btn link-btn--danger" type="button" @click="holidays.spans.splice(i, 1)">Remove</button>
              </div>
              <p v-if="!holidays.spans.length" class="muted">No fixed holidays yet.</p>
              <div class="span-row">
                <input v-model="newSpan.from" type="date" class="app-input__control" />
                <input v-model="newSpan.to" type="date" class="app-input__control" title="To (blank = single day)" />
                <input v-model="newSpan.label" class="app-input__control" placeholder="Label (e.g. Eid break)" />
                <AppButton variant="ghost" type="button" :disabled="!newSpan.from" @click="addSpan">Add</AppButton>
              </div>
            </div>
            <p class="muted">Card taps and roster saves on these days record holiday. Close-day marks them holiday too.</p>
            <AppButton type="submit" :disabled="savingHolidays">
              {{ savingHolidays ? 'Saving…' : 'Save Holidays' }}
            </AppButton>
          </form>
        </AppCard>

        <AppCard title="Change Password">
          <form class="form" @submit.prevent="savePassword">
            <label>Current password<input v-model="pwd.currentPassword" type="password" class="app-input__control" required autocomplete="current-password" /></label>
            <label>New password (min 6 characters)<input v-model="pwd.newPassword" type="password" class="app-input__control" required minlength="6" autocomplete="new-password" /></label>
            <label>Confirm new password<input v-model="pwd.confirm" type="password" class="app-input__control" required autocomplete="new-password" /></label>
            <AppButton type="submit" :disabled="savingPassword">
              {{ savingPassword ? 'Updating…' : 'Update Password' }}
            </AppButton>
          </form>
        </AppCard>

        <AppCard title="Salary Types">
          <div v-if="!salaryTypes.length" class="muted">No salary types yet — add Monthly first.</div>
          <ul v-else class="type-list">
            <li v-for="t in salaryTypes" :key="t.id" class="type-list__row">
              <span>{{ t.name }}</span>
              <button class="link-btn link-btn--danger" type="button" @click="removeSalaryType(t.id, t.name)">Remove</button>
            </li>
          </ul>
          <form class="inline-form" @submit.prevent="addSalaryType">
            <input v-model="newSalaryType" class="app-input__control" placeholder="e.g. Daily" required />
            <AppButton type="submit" :disabled="creatingSalaryType">Add</AppButton>
          </form>
          <p class="muted">Teacher form picks one of these (Monthly by default). A type used by teachers cannot be removed.</p>
        </AppCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import { useChangePassword, useCreateSalaryType, useDeleteSalaryType, useSalaryTypes, useSettings, useUpdateSettings } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { useSchoolStore } from '@/stores/school'

const toast = useToast()
const school = useSchoolStore()
const { data, isLoading } = useSettings()
const { mutateAsync: updateSettings, isPending: savingProfile } = useUpdateSettings()
const { mutateAsync: changePassword, isPending: savingPassword } = useChangePassword()

// Only the school's own profile fields — the backend refuses anything else
// from an admin (modules / platform options stay super-admin only).
const profile = reactive({
  schoolName: '',
  address: '',
  phone: '',
  schoolStartTime: '',
  schoolEndTime: '',
  lateTime: '',
})

const pwd = reactive({
  currentPassword: '',
  newPassword: '',
  confirm: '',
})

const WEEK_DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const DAY_LABELS: Record<string, string> = {
  Sat: 'Saturday',
  Sun: 'Sunday',
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
}
function dayLabel(d: string): string {
  return DAY_LABELS[d] ?? d
}

const holidays = reactive({
  weekly: [] as string[],
  spans: [] as { from: string; to: string; label: string }[],
})
const newSpan = reactive({ from: '', to: '', label: '' })
const savingHolidays = ref(false)

function addSpan(): void {
  if (!newSpan.from) return
  holidays.spans.push({ from: newSpan.from, to: newSpan.to, label: newSpan.label.trim() })
  newSpan.from = ''
  newSpan.to = ''
  newSpan.label = ''
}

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
    profile.lateTime = s.lateTime ?? ''
    holidays.weekly = [...(s.weeklyHolidays ?? [])]
    holidays.spans = (s.holidays ?? []).map((h) => ({
      from: h.from ?? '',
      to: h.to ?? '',
      label: h.label ?? '',
    }))
  },
  { immediate: true },
)

async function saveProfile(): Promise<void> {
  try {
    await updateSettings({ ...profile })
    await school.refresh()
    toast.success('School profile saved')
  } catch {
    toast.error('Save failed')
  }
}

async function saveHolidays(): Promise<void> {
  savingHolidays.value = true
  try {
    await updateSettings({
      weeklyHolidays: [...holidays.weekly],
      holidays: holidays.spans.map((h) => ({ from: h.from, to: h.to, label: h.label })),
    })
    await school.refresh()
    toast.success('Holidays saved')
  } catch {
    toast.error('Save failed')
  } finally {
    savingHolidays.value = false
  }
}

async function savePassword(): Promise<void> {
  if (pwd.newPassword !== pwd.confirm) {
    toast.error('New passwords do not match')
    return
  }
  try {
    await changePassword({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword })
    pwd.currentPassword = ''
    pwd.newPassword = ''
    pwd.confirm = ''
    toast.success('Password updated')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Password update failed')
  }
}

// Payroll master: salary types (Monthly, Daily, ...) picked in the teacher form.
const { data: salaryTypeData } = useSalaryTypes()
const salaryTypes = computed(() => salaryTypeData.value?.data ?? [])
const { mutateAsync: createSalaryType, isPending: creatingSalaryType } = useCreateSalaryType()
const { mutateAsync: deleteSalaryType } = useDeleteSalaryType()
const newSalaryType = ref('')
async function addSalaryType(): Promise<void> {
  const name = newSalaryType.value.trim()
  if (!name) return
  try {
    await createSalaryType(name)
    newSalaryType.value = ''
    toast.success('Salary type added')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Add failed')
  }
}
async function removeSalaryType(id: string, name: string): Promise<void> {
  try {
    await deleteSalaryType(id)
    toast.success(`"${name}" removed`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Remove failed')
  }
}
</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-lg);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--spacing-md);
  align-items: start;
}
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
.form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
}
.form__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  margin: 0 0 var(--spacing-xs);
}
.day-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}
.check {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.span-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: var(--spacing-xs);
  align-items: center;
  margin-bottom: var(--spacing-xs);
}
.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  white-space: nowrap;
}
.link-btn--danger {
  color: var(--color-danger);
}
.type-list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--spacing-sm);
}
.type-list__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.inline-form {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}
.inline-form .app-input__control {
  flex: 1;
}
</style>
