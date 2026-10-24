<template>
  <div class="page">
    <div class="page__head">
      <h1 class="page__title">Teachers & Staff</h1>
      <AppButton v-if="canManage" @click="router.push('/admin/teachers/new')">+ Add Teacher / Staff</AppButton>
    </div>

    <AppCard>
      <FilterPanel>
        <input v-model="search" class="app-input__control" :placeholder="school.hasModule('payroll') ? 'Search name / phone / card ID…' : 'Search name / phone…'" />
        <div class="kind-tabs" role="tablist" aria-label="Filter by type">
          <button type="button" :class="['kind-tab', { 'kind-tab--active': kindFilter === '' }]" @click="kindFilter = ''">All</button>
          <button type="button" :class="['kind-tab', { 'kind-tab--active': kindFilter === 'teacher' }]" @click="kindFilter = 'teacher'">Teachers</button>
          <button type="button" :class="['kind-tab', { 'kind-tab--active': kindFilter === 'staff' }]" @click="kindFilter = 'staff'">Staff</button>
        </div>
      </FilterPanel>

      <AppSkeleton v-if="isLoading" variant="table" :rows="8" :cols="school.hasModule('payroll') ? 9 : 7" />
      <p v-else-if="isError" class="error">Failed to load teachers.</p>
      <table v-else class="table" :class="{ 'is-fetching': isFetching && !isLoading }">
        <thead>
          <tr><th></th><th>Name</th><th>Type</th><th>Designation</th><th>Phone</th><th v-if="school.hasModule('payroll')">Card ID</th><th>Joining</th><th v-if="school.hasModule('payroll')">Basic (৳)</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="t in rows" :key="t.id">
            <td><PersonAvatar :photo-url="t.photoUrl" :name="t.name" :size="32" /></td>
            <td>{{ t.name }}</td>
            <td><span class="kind-badge" :class="`kind-badge--${t.kind || 'teacher'}`">{{ (t.kind || 'teacher') === 'staff' ? 'Staff' : 'Teacher' }}</span></td>
            <td>{{ t.designation }}</td>
            <td>{{ t.phone }}</td>
            <td v-if="school.hasModule('payroll')" class="mono">{{ t.cardId || '—' }}</td>
            <td>{{ t.joiningDate }}</td>
            <td v-if="school.hasModule('payroll')">{{ t.basicSalary ?? '—' }}</td>
            <td class="row-actions-cell">
              <span class="row-actions">
              <button class="link-btn" type="button" @click="goDetail(t)">View</button>
              <button v-if="(t.kind || 'teacher') === 'teacher'" class="link-btn" type="button" @click="goSubjects(t)">Subjects</button>
              <button v-if="canManage" class="link-btn" type="button" @click="openEdit(t)">Edit</button>
              <button v-if="canManage" class="link-btn link-btn--danger" type="button" @click="askDelete(t.id, t.name)">Delete</button>
              </span>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td :colspan="school.hasModule('payroll') ? 9 : 7" class="muted">No teachers or staff yet — use + Add Teacher / Staff to add the first one.</td>
          </tr>
        </tbody>
      </table>

      <AppPagination v-model:page="page" v-model:per-page="perPage" :total="total" :busy="isFetching" />
    </AppCard>

    <Teleport to="body">
      <div v-if="form.open" class="modal-backdrop" @click.self="form.open = false">
        <div class="modal" role="dialog" aria-modal="true">
          <h3 class="modal__title">Edit {{ form.kind === 'staff' ? 'Staff' : 'Teacher' }}</h3>
          <form class="form-grid" @submit.prevent="saveForm">
            <label class="photo-picker">Photo (optional)
              <input type="file" accept="image/jpeg,image/png,image/webp" class="app-input__control" @change="onPhotoSelect" />
            </label>
            <div v-if="photoPreview || form.photoUrl" class="photo-preview">
              <img :src="photoPreview || form.photoUrl" alt="Teacher photo" />
              <AppButton variant="ghost" type="button" @click="clearPhoto">Remove</AppButton>
            </div>
            <div v-else class="photo-preview">
              <PersonAvatar :photo-url="''" :name="form.name" :size="72" />
            </div>
            <label>Name*<input v-model="form.name" class="app-input__control" placeholder="Enter teacher name" required /></label>
            <label>Type
              <select v-model="form.kind" class="app-input__control">
                <option value="teacher">Teacher</option>
                <option value="staff">Staff</option>
              </select>
            </label>
            <label>Phone<input v-model="form.phone" class="app-input__control" placeholder="Enter phone number" /></label>
            <label>Designation<input v-model="form.designation" class="app-input__control" placeholder="Enter designation" /></label>
            <label v-if="school.hasModule('payroll')">Card / Finger ID (for attendance)<input v-model="form.cardId" class="app-input__control" placeholder="Scan or type card ID" /></label>
            <label v-if="school.hasModule('payroll') && school.staffOwnTimes">Entry time — own start<input v-model="form.baseTime" type="time" class="app-input__control" /><span class="hint">Per-person timing on: late counts from here (blank = school start)</span></label>
            <label v-if="school.hasModule('payroll') && school.staffOwnTimes">Exit time — own end<input v-model="form.endTime" type="time" class="app-input__control" /><span class="hint">Exit taps count from here (blank = school end)</span></label>
            <label>Joining Date<input v-model="form.joiningDate" type="date" class="app-input__control" /></label>
            <template v-if="school.hasModule('payroll')">
            <p class="section-title">Salary (for payroll)</p>
            <label>Salary type
              <select v-model="form.payTypeId" class="app-input__control">
                <option v-for="t in salaryTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </label>
            <label>Basic salary (৳)*<input v-model.number="form.basicSalary" type="number" min="0" class="app-input__control" required /></label>
            <label>Extra allowance (৳) — House rent + Medical + Transport<input v-model.number="form.extraAllowance" type="number" min="0" class="app-input__control" placeholder="0" /></label>
            <label>Overtime / hour (৳)<input v-model.number="form.overtimeRate" type="number" min="0" class="app-input__control" /></label>
            <label>Provident fund (%)<input v-model.number="form.pfPercent" type="number" min="0" max="100" step="0.01" class="app-input__control" /></label>
            <label>Working days / month<input v-model.number="form.workingDays" type="number" min="1" max="31" class="app-input__control" /></label>
            <label>Per-day salary (৳) — editable<input v-model.number="perDayInput" type="number" min="0" step="0.01" class="app-input__control" />
              <span class="hint">Auto: ৳{{ autoPerDayText }} ((Basic + Extra) ÷ Working days)
                <button v-if="!isPerDayAuto" class="link-btn" type="button" @click="resetPerDay">Reset to auto</button>
              </span>
            </label>
            </template>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="form-actions">
              <AppButton variant="ghost" type="button" @click="form.open = false">Cancel</AppButton>
              <AppButton type="submit" :loading="saving">Save</AppButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <AppConfirmDialog
      :open="confirm.open"
      :message="confirm.message"
      :busy="deleting"
      @cancel="confirm.open = false"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import PersonAvatar from '@/components/common/PersonAvatar.vue'
import {
  useDeleteTeacher,
  useSalaryTypes,
  useTeachers,
  useUpdateTeacher,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { useSchoolStore } from '@/stores/school'
import { teacherService } from '@/services'
import type { Teacher } from '@/types/models'

const toast = useToast()
const auth = useAuthStore()
const canManage = computed(() => auth.can('admin.teachers.manage'))
const school = useSchoolStore()
const router = useRouter()
const search = ref('')
const kindFilter = ref('')
const page = ref(1)
const perPage = ref(10)
watch(search, () => {
  page.value = 1
})
watch(kindFilter, () => {
  page.value = 1
})
watch(perPage, () => {
  page.value = 1
})

const params = computed(() => ({
  search: search.value || undefined,
  kind: kindFilter.value || undefined,
  page: page.value,
  perPage: perPage.value,
}))
const { data, isLoading, isFetching, isError } = useTeachers(params)
const rows = computed(() => data.value?.data.items ?? [])
const total = computed(() => data.value?.data.pagination.total ?? 0)

const form = reactive({
  open: false, id: '', name: '', kind: 'teacher' as 'teacher' | 'staff',
  phone: '', designation: '', cardId: '', joiningDate: '',
  /** Own base time "HH:MM" ("" = school start; used while per-person timing is on). */
  baseTime: '',
  /** Own end time "HH:MM" ("" = school end; used while per-person timing is on). */
  endTime: '',
  payTypeId: '', basicSalary: 0,
  extraAllowance: 0,
    overtimeRate: 0, pfPercent: 0, loanDeduction: 0,
  workingDays: 30, photoUrl: '',
  /** 0 = auto ((Basic + Extra) ÷ Working days), otherwise the manually entered value. */
  perDay: 0,
})
const num = (v: unknown): number => Number(v) || 0
const round2 = (v: number): number => Math.round(v * 100) / 100
// Auto per-day: (Basic + Extra) ÷ Working days.
const autoPerDay = computed(() => {
  const days = Math.max(1, Math.round(num(form.workingDays)) || 30)
  return round2((num(form.basicSalary) + num(form.extraAllowance)) / days)
})
const autoPerDayText = computed(() => autoPerDay.value.toLocaleString('en-IN'))
const isPerDayAuto = computed(() => !(form.perDay > 0))
// Input shows the auto value; a user change saves as an override.
const perDayInput = computed({
  get: () => (form.perDay > 0 ? form.perDay : autoPerDay.value),
  set: (v: number) => {
    form.perDay = num(v)
  },
})
function resetPerDay(): void {
  form.perDay = 0
}

// Salary-type master (Settings): Monthly by default selected.
const { data: salaryTypeData } = useSalaryTypes(() => school.hasModule('payroll'))
const salaryTypes = computed(() => salaryTypeData.value?.data ?? [])
const monthlyId = computed(
  () => (salaryTypeData.value?.data ?? []).find((t) => t.name.toLowerCase() === 'monthly')?.id ?? '',
)
watch(monthlyId, (id) => {
  if (!form.id && !form.payTypeId && id) form.payTypeId = id
}, { immediate: true })
// Salary types load async — select Monthly once the open form has no value.
watch(salaryTypes, (list) => {
  if (form.open && !form.id && !form.payTypeId && monthlyId.value) {
    form.payTypeId = monthlyId.value
  }
})

// Optional photo: picked here, uploaded right after save.
const photoFile = ref<File | null>(null)
const photoPreview = ref('')
function onPhotoSelect(e: Event): void {
  const input = e.target as HTMLInputElement | null
  const file = input?.files?.[0] ?? null
  if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
  photoFile.value = null
  photoPreview.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    formError.value = 'Photo must be JPG, PNG or WEBP.'
    if (input) input.value = ''
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    formError.value = 'Photo must be under 5MB.'
    if (input) input.value = ''
    return
  }
  photoFile.value = file
  photoPreview.value = URL.createObjectURL(file)
}
function clearPhoto(): void {
  if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
  photoFile.value = null
  photoPreview.value = ''
}
const formError = ref('')
const saving = ref(false)
const { mutateAsync: updateTeacher } = useUpdateTeacher()

function openEdit(t: Teacher): void {
  Object.assign(form, {
    open: true, id: t.id, name: t.name, kind: (t.kind || 'teacher') as 'teacher' | 'staff',
    phone: t.phone, cardId: t.cardId ?? '',
    baseTime: t.baseTime ?? '',
    endTime: t.endTime ?? '',
    designation: t.designation, joiningDate: t.joiningDate,
    payTypeId: t.payTypeId ?? '', basicSalary: num(t.basicSalary),
    extraAllowance: num(t.extraAllowance),
    overtimeRate: num(t.overtimeRate), pfPercent: num(t.pfPercent),
    loanDeduction: num(t.loanDeduction),
    workingDays: t.workingDays ?? 30, photoUrl: t.photoUrl ?? '',
    perDay: num(t.perDaySalary),
  })
  clearPhoto()
  formError.value = ''
}

// Open the subjects page for a teacher (from the list).
function goSubjects(t: Teacher): void {
  router.push(`/admin/teachers/${t.id}/subjects`)
}
function goDetail(t: Teacher): void {
  router.push(`/admin/teachers/${t.id}`)
}

async function saveForm(): Promise<void> {
  formError.value = ''
  if (!form.name.trim()) {
    formError.value = 'Name is required.'
    return
  }
  if (!form.id) return
  saving.value = true
  try {
    const input = {
      name: form.name.trim(),
      kind: form.kind,
      phone: form.phone.trim(),
      cardId: form.cardId.trim(),
      // Own base time travels only while per-person timing is on; hidden
      // means "don't touch" (stored values stay).
      ...(school.hasModule('payroll') && school.staffOwnTimes
        ? { baseTime: form.baseTime || null, endTime: form.endTime || null }
        : {}),
      designation: form.designation.trim(),
      joiningDate: form.joiningDate,
      status: 'active' as const,
      payTypeId: form.payTypeId,
      basicSalary: num(form.basicSalary),
      extraAllowance: num(form.extraAllowance),
      overtimeRate: num(form.overtimeRate),
      pfPercent: num(form.pfPercent),
      // Loan handled in payroll/accounting now, not here.
      loanDeduction: 0,
      workingDays: Math.min(31, Math.max(1, Math.round(num(form.workingDays)) || 30)),
      // 0 = auto calculation, otherwise the user-entered per-day rate.
      perDaySalary: round2(num(form.perDay)),
    }
    await updateTeacher({ id: form.id, input })
    if (photoFile.value) {
      try {
        await teacherService.uploadPhoto(form.id, photoFile.value)
      } catch {
        toast.error('Saved, but the photo upload failed')
      }
    }
    toast.success(form.kind === 'staff' ? 'Staff updated' : 'Teacher updated')
    form.open = false
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

const confirm = ref({ open: false, id: '', message: '' })
const deleting = ref(false)
const { mutateAsync: deleteTeacher } = useDeleteTeacher()

function askDelete(id: string, name: string): void {
  confirm.value = { open: true, id, message: `Remove "${name}"?` }
}

async function doDelete(): Promise<void> {
  deleting.value = true
  try {
    await deleteTeacher(confirm.value.id)
    toast.success('Teacher removed')
    confirm.value.open = false
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}
.muted {
  color: var(--color-text-muted);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.table th,
.table td {
  text-align: left;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}
.row-actions-cell {
  text-align: right;
  vertical-align: middle;
  white-space: nowrap;
}
.row-actions {
  display: inline-flex;
  gap: var(--spacing-sm);
  align-items: center;
}
.link-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  line-height: inherit;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
}
.link-btn--danger {
  color: var(--color-danger);
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(16, 24, 40, 0.45);
  display: grid;
  place-items: center;
  z-index: 60;
  padding: var(--spacing-lg);
}
.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-lg);
  width: min(620px, 100%);
  max-height: 90dvh;
  overflow-y: auto;
}
.modal--sm {
  width: min(440px, 100%);
}
.kind-tabs {
  display: inline-flex;
  gap: 4px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 4px;
}
.kind-tab {
  background: none;
  border: none;
  padding: 6px 14px;
  font: inherit;
  font-size: var(--font-size-sm);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  cursor: pointer;
}
.kind-tab--active {
  background: var(--color-surface);
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
  box-shadow: var(--shadow-sm);
}
.kind-badge {
  display: inline-block;
  padding: 2px 10px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  border-radius: 999px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
}
.kind-badge--teacher {
  color: var(--color-primary);
  border-color: var(--color-primary);
}
.kind-badge--staff {
  color: var(--color-text-muted);
}
.modal__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-md);
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
}
.form-grid label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.section-title {
  grid-column: 1 / -1;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-muted);
  text-transform: uppercase;
  margin: var(--spacing-sm) 0 0;
}
.perday-hint {
  grid-column: 1 / -1;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  background: var(--color-background);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  margin: 0;
}
.hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-weight: var(--font-weight-normal);
}
.mono {
  font-family: ui-monospace, monospace;
}
.photo-picker input[type='file'] {
  padding: 6px;
}
.photo-preview {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.photo-preview img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.form-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}
</style>
