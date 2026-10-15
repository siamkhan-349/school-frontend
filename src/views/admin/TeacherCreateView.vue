<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Add Teacher / Staff</h1>
        <p class="page__hint">Basic info → salary. Saving a teacher offers subject assignment.</p>
      </div>
      <AppButton variant="ghost" type="button" @click="goBack">← Teachers & Staff</AppButton>
    </div>

    <form @submit.prevent="saveForm">
      <AppCard title="Basic Info">
        <div class="form-grid">
          <label class="photo-picker">Photo (optional)
            <input type="file" accept="image/jpeg,image/png,image/webp" class="app-input__control" @change="onPhotoSelect" />
          </label>
          <div v-if="photoPreview" class="photo-preview">
            <img :src="photoPreview" alt="Teacher photo" />
            <AppButton variant="ghost" type="button" @click="clearPhoto">Remove</AppButton>
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
          <label>Card / Finger ID (for attendance)<input v-model="form.cardId" class="app-input__control" placeholder="Scan or type card ID" /></label>
          <label>Joining Date<input v-model="form.joiningDate" type="date" class="app-input__control" /></label>
        </div>
      </AppCard>

      <AppCard title="Salary (for payroll)">
        <div class="form-grid">
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
        </div>
      </AppCard>

      <p v-if="formError" class="error">{{ formError }}</p>
      <div class="page-actions">
        <AppButton variant="ghost" type="button" @click="goBack">Cancel</AppButton>
        <AppButton type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</AppButton>
      </div>
    </form>

    <Teleport to="body">
      <div v-if="askSubjects.open" class="modal-backdrop" @click.self="askSubjects.open = false">
        <div class="modal modal--sm" role="dialog" aria-modal="true">
          <h3 class="modal__title">Teacher added</h3>
          <p class="muted">Do you want to assign subjects to "{{ askSubjects.name }}" now, or go back to the teacher list?</p>
          <div class="form-actions">
            <AppButton variant="ghost" type="button" @click="goList">Back to list</AppButton>
            <AppButton type="button" @click="goAssignSubjects">Assign subjects</AppButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import { useCreateTeacher, useSalaryTypes } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { teacherService } from '@/services'

const toast = useToast()
const router = useRouter()

const form = reactive({
  name: '', kind: 'teacher' as 'teacher' | 'staff',
  phone: '', designation: '', cardId: '', joiningDate: '',
  payTypeId: '', basicSalary: 0,
  extraAllowance: 0,
  overtimeRate: 0, pfPercent: 0,
  workingDays: 30,
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
const { data: salaryTypeData } = useSalaryTypes()
const salaryTypes = computed(() => salaryTypeData.value?.data ?? [])
const monthlyId = computed(
  () => (salaryTypeData.value?.data ?? []).find((t) => t.name.toLowerCase() === 'monthly')?.id ?? '',
)
watch(monthlyId, (id) => {
  if (!form.payTypeId && id) form.payTypeId = id
}, { immediate: true })
watch(salaryTypes, () => {
  if (!form.payTypeId && monthlyId.value) form.payTypeId = monthlyId.value
}, { immediate: true })

// Optional photo: picked here, uploaded right after save.
const photoFile = ref<File | null>(null)
const photoPreview = ref('')
const formError = ref('')
const saving = ref(false)
const { mutateAsync: createTeacher } = useCreateTeacher()

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

// Save-er por Teacher hole subject assign prompt, Staff hole soja list.
const askSubjects = ref({ open: false, id: '', name: '' })
function goBack(): void {
  router.push('/admin/teachers')
}
function goList(): void {
  askSubjects.value.open = false
  goBack()
}
function goAssignSubjects(): void {
  const id = askSubjects.value.id
  askSubjects.value.open = false
  if (id) router.push(`/admin/teachers/${id}/subjects`)
}

async function saveForm(): Promise<void> {
  formError.value = ''
  if (!form.name.trim()) {
    formError.value = 'Name is required.'
    return
  }
  saving.value = true
  try {
    const input = {
      name: form.name.trim(),
      kind: form.kind,
      phone: form.phone.trim(),
      designation: form.designation.trim(),
      cardId: form.cardId.trim(),
      joiningDate: form.joiningDate,
      status: 'active' as const,
      payTypeId: form.payTypeId,
      basicSalary: num(form.basicSalary),
      extraAllowance: num(form.extraAllowance),
      overtimeRate: num(form.overtimeRate),
      pfPercent: num(form.pfPercent),
      // Loan handled in payroll/accounting now, not in teacher add.
      loanDeduction: 0,
      workingDays: Math.min(31, Math.max(1, Math.round(num(form.workingDays)) || 30)),
      // 0 = auto calculation, otherwise the user-entered per-day rate.
      perDaySalary: round2(num(form.perDay)),
    }
    const created = await createTeacher(input)
    const savedId = created.data?.id ?? ''
    const savedName = created.data?.name ?? input.name
    if (photoFile.value && savedId) {
      try {
        await teacherService.uploadPhoto(savedId, photoFile.value)
      } catch {
        toast.error('Saved, but the photo upload failed')
      }
    }
    toast.success(form.kind === 'staff' ? 'Staff added' : 'Teacher added')
    if (form.kind === 'teacher' && savedId) {
      askSubjects.value = { open: true, id: savedId, name: savedName }
    } else {
      goBack()
    }
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-lg);
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}
.page__hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
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
  margin-top: var(--spacing-md);
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
.link-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  cursor: pointer;
}
.page-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
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
.modal--sm {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-lg);
  width: min(440px, 100%);
}
.modal__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-md);
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}
</style>
