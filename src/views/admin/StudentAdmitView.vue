<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Admit Student</h1>
        <p class="page__hint">{{ school.hasModule('payment') ? 'Identity → details → class & fees. The total comes automatically from Fee Management.' : 'Identity → details → class.' }}</p>
      </div>
      <AppButton variant="ghost" type="button" @click="goBack">← Students</AppButton>
    </div>

    <form @submit.prevent="save">
      <ol class="steps">
        <li v-for="step in steps" :key="step.number">
          <button
            type="button"
            class="steps__item"
            :class="{
              'steps__item--active': currentStep === step.number,
              'steps__item--done': currentStep > step.number,
            }"
            @click="selectStep(step.number)"
          >
            <span class="steps__number">{{ step.number }}</span>
            <span class="steps__label">{{ step.label }}</span>
          </button>
        </li>
      </ol>

      <AppCard v-if="currentStep === 1" title="Student Identity">
        <div class="form-grid">
          <label>Name*
            <input v-model="form.name" class="app-input__control" placeholder="e.g. Rahim Uddin" />
            <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
          </label>
          <label>Gender*
            <select v-model="form.gender" class="app-input__control">
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <span v-if="errors.gender" class="field-error">{{ errors.gender }}</span>
          </label>
          <label>Roll*
            <input v-model="form.roll" class="app-input__control" placeholder="e.g. 10" />
            <span v-if="errors.roll" class="field-error">{{ errors.roll }}</span>
          </label>
          <label v-if="school.hasModule('attendance')">Card ID (optional)
            <input v-model="form.cardId" class="app-input__control" placeholder="e.g. RFID card number" />
            <span v-if="errors.cardId" class="field-error">{{ errors.cardId }}</span>
          </label>
          <label>Guardian name (optional)
            <input v-model="form.guardianName" class="app-input__control" placeholder="e.g. Abdul Uddin" />
          </label>
          <label>Guardian phone*
            <input v-model="form.guardianPhone" class="app-input__control" placeholder="01XXXXXXXXX" />
            <span v-if="errors.guardianPhone" class="field-error">{{ errors.guardianPhone }}</span>
          </label>
        </div>
      </AppCard>

      <AppCard v-if="currentStep === 2" title="Details (optional)">
        <div class="form-grid">
          <label class="photo-picker">
            <span>Student photo (optional)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" class="app-input__control" @change="onPhotoSelect" />
            <span class="hint">JPG / PNG / WEBP, max 5MB.</span>
          </label>
          <div v-if="photoPreview" class="photo-preview">
            <img :src="photoPreview" alt="Photo preview" />
            <AppButton variant="ghost" type="button" @click="clearPhoto">Remove</AppButton>
          </div>
          <label>Date of birth (optional)<input v-model="form.dateOfBirth" type="date" class="app-input__control" /></label>
          <label>Blood group (optional)
            <select v-model="form.bloodGroup" class="app-input__control">
              <option value="">Select blood group</option>
              <option v-for="group in BLOOD_GROUP_OPTIONS" :key="group" :value="group">{{ group }}</option>
            </select>
          </label>
          <label>Guardian phone 2 (optional)<input v-model="form.guardianPhone2" class="app-input__control" placeholder="01XXXXXXXXX" /></label>
          <label>Previous institute (optional)<input v-model="form.instituteName" class="app-input__control" placeholder="e.g. Old school" /></label>
          <label>Address (optional)<input v-model="form.address" class="app-input__control" /></label>
        </div>
      </AppCard>

      <template v-if="currentStep === 3">
      <AppCard title="Admission">
        <div class="form-grid">
          <label>Class*
            <select v-model="form.classId" class="app-input__control">
              <option value="">Select class</option>
              <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
            <span v-if="errors.classId" class="field-error">{{ errors.classId }}</span>
          </label>
          <label v-if="form.classId">Section
            <select v-model="form.sectionId" class="app-input__control">
              <option value="">No section</option>
              <option v-for="s in admitSections" :key="s.id" :value="s.id">{{ s.label }}</option>
            </select>
          </label>
          <label v-if="admitClass?.hasDepartments">Department
            <select v-model="form.departmentId" class="app-input__control">
              <option :value="null">Select department</option>
              <option v-for="d in admitDepartments" :key="d.id" :value="d.id">{{ d.label }}</option>
            </select>
          </label>
        </div>
        <div v-if="form.classId" class="subjects-preview">
          <p class="subjects-preview__title">Subjects ({{ form.selectedSubjects.length }}/{{ previewCount }}) — tick what the student will study</p>
          <template v-if="subjectsFetching">
            <div class="chip-row">
              <AppSkeleton variant="chip" :width="'96px'" />
              <AppSkeleton variant="chip" :width="'96px'" />
              <AppSkeleton variant="chip" :width="'96px'" />
            </div>
          </template>
          <template v-else-if="previewCount > 0">
            <div v-if="commonSubjects.length" class="chip-row">
              <label v-for="s in commonSubjects" :key="s.id" class="checkbox-item" :class="{ 'checkbox-item--checked': form.selectedSubjects.includes(s.label) }">
                <input type="checkbox" :value="s.label" v-model="form.selectedSubjects" />
                <span>{{ s.label }}</span>
              </label>
            </div>
            <template v-if="form.departmentId">
              <div v-if="pickedDeptSubjects.length" class="chip-row">
                <label v-for="s in pickedDeptSubjects" :key="s.id" class="checkbox-item checkbox-item--dept" :class="{ 'checkbox-item--checked': form.selectedSubjects.includes(s.label) }">
                  <input type="checkbox" :value="s.label" v-model="form.selectedSubjects" />
                  <span>{{ s.label }}</span>
                </label>
              </div>
            </template>
            <template v-else>
              <div v-for="[dept, subs] in deptSubjectGroups" :key="dept" class="chip-group">
                <span class="chip-group__label">{{ dept }}:</span>
                <label v-for="s in subs" :key="s.id" class="checkbox-item checkbox-item--dept" :class="{ 'checkbox-item--checked': form.selectedSubjects.includes(s.label) }">
                  <input type="checkbox" :value="s.label" v-model="form.selectedSubjects" />
                  <span>{{ s.label }}</span>
                </label>
              </div>
            </template>
          </template>
          <p v-else class="hint">No subjects set for this class — add them from Academics.</p>
        </div>
      </AppCard>

      <AppCard v-if="school.hasModule('payment')" title="Fees">
        <AppSkeleton v-if="catalogFetching" variant="lines" :lines="3" />
        <div v-else-if="catalogNonEmpty.length" class="breakdown">
          <label v-for="item in catalogNonEmpty" :key="item.id" class="breakdown__row" :class="{ 'breakdown__row--off': !checkedFees.has(itemKey(item)) }">
            <span class="checkline">
              <input type="checkbox" :checked="checkedFees.has(itemKey(item))" @change="toggleFee(item)" />
              <span>{{ item.name }}</span>
              <em v-if="item.cycleDays > 0" class="cycle">· {{ item.cycleDays === 30 ? 'monthly' : `every ${item.cycleDays}d` }}</em>
            </span>
            <input
              v-model.number="feeEdits[itemKey(item)]"
              type="number"
              min="0"
              class="app-input__control amount"
              :disabled="!checkedFees.has(itemKey(item))"
            />
          </label>
          <div class="breakdown__row breakdown__row--total">
            <span>Total ({{ checkedFees.size }}/{{ catalogNonEmpty.length }} selected)</span><span>৳{{ admitTotal }}</span>
          </div>
        </div>
        <p v-else class="hint">No fees set in Fee Management for this class{{ admitClass?.hasDepartments ? '/department' : '' }} — set them from the Fee page first.</p>
        <p v-if="catalogNonEmpty.length" class="hint">Untick a fee to skip it for this student — the total follows.</p>
      </AppCard>
      </template>

      <p v-if="formError" class="error">{{ formError }}</p>
      <div class="form-actions">
        <AppButton v-if="currentStep > 1" variant="ghost" type="button" :disabled="saving" @click="prevStep">Back</AppButton>
        <AppButton v-if="currentStep < steps.length" type="button" :disabled="saving" @click="nextStep">Next</AppButton>
        <AppButton v-else type="submit" :loading="saving">Admit Student</AppButton>
        <AppButton variant="ghost" type="button" @click="goBack">Cancel</AppButton>
      </div>
    </form>

    <AppConfirmDialog
      :open="askPayment"
      title="Student admitted — collect fee?"
      :message="`“${createdName}” is admitted. Collect the fee now?`"
      confirm-text="Yes, collect fee"
      confirm-variant="primary"
      @cancel="afterAdmit(false)"
      @confirm="afterAdmit(true)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import {
  useClasses,
  useCreateStudent,
  useDepartments,
  useFeeCatalog,
  useSections,
  useSubjects,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { useSchoolStore } from '@/stores/school'
import { studentService } from '@/services'
import { BLOOD_GROUP_OPTIONS } from '@/utils/bloodGroup'
import type { FeeCatalogItem } from '@/types/models'

const router = useRouter()
const toast = useToast()
const school = useSchoolStore()

const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])

const form = reactive({
  name: '',
  cardId: '',
  gender: '',
  bloodGroup: '',
  address: '',
  roll: '',
  guardianName: '',
  guardianPhone: '',
  guardianPhone2: '',
  dateOfBirth: '',
  instituteName: '',
  classId: '',
  sectionId: '',
  departmentId: null as string | null,
  selectedSubjects: [] as string[],
})

watch(() => form.classId, () => {
  form.departmentId = null
})

const admitClass = computed(() => classes.value.find((c) => c.id === form.classId))
const { data: admitDeptData } = useDepartments(() => form.classId || undefined)
const admitDepartments = computed(() => admitDeptData.value?.data ?? [])

const { data: admitSectionData } = useSections(() => form.classId || undefined, undefined, true)
const admitSections = computed(() => admitSectionData.value?.data ?? [])
watch(admitSections, (list) => {
  if (!list.some((s) => s.id === form.sectionId)) form.sectionId = list[0]?.id ?? ''
})

// Class-er subject preview: common + department-wise (read-only info).
const { data: admitSubjectData, isFetching: subjectsFetching } = useSubjects(() => form.classId || undefined)
const classSubjects = computed(() => admitSubjectData.value?.data ?? [])
const commonSubjects = computed(() => classSubjects.value.filter((s) => !s.departmentId))
const pickedDeptSubjects = computed(() =>
  form.departmentId ? classSubjects.value.filter((s) => s.departmentId === form.departmentId) : [],
)
const deptSubjectGroups = computed(() => {
  const groups = new Map<string, { id: string; label: string }[]>()
  for (const s of classSubjects.value) {
    if (!s.departmentId) continue
    const key = s.department || 'Department'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)?.push({ id: s.id, label: s.label })
  }
  return [...groups.entries()]
})
const previewCount = computed(() =>
  form.departmentId
    ? commonSubjects.value.length + pickedDeptSubjects.value.length
    : classSubjects.value.length,
)

// Subject select (checkbox): ticked labels are saved on the student record
// (e.g. a Hindu student unticks Islam Shikkha). No price — school rule.
// Changing class/dept auto-ticks all visible subjects, then untick by hand.
const autoSelectSubjects = ref(true)
const visibleSubjectLabels = computed(() => {
  const list = form.departmentId
    ? [...commonSubjects.value, ...pickedDeptSubjects.value]
    : classSubjects.value
  return list.map((s) => s.label)
})
watch([() => form.classId, () => form.departmentId], () => {
  autoSelectSubjects.value = true
})
watch(visibleSubjectLabels, (labels) => {
  // A transient empty list while the new scope loads must never apply —
  // it would wipe the ticks (the 0/6 bug).
  if (!labels.length && subjectsFetching.value) return
  if (autoSelectSubjects.value) {
    form.selectedSubjects = [...labels]
    autoSelectSubjects.value = false
  } else if (labels.length) {
    const keep = new Set(labels)
    form.selectedSubjects = form.selectedSubjects.filter((l) => keep.has(l))
  }
})

// School fee rule: class-wise named fees, department-wise where the class
// has departments (merged common + dept). Each fee is ticked by default;
// untick to skip it for this student. The total is the live sum of ticked
// fees. Nothing is collected here — payment happens on the Collect page.
const { data: admitCatalogData, isFetching: catalogFetching } = useFeeCatalog(() => form.classId, () => form.departmentId, () => form.sectionId || null, true, () => school.hasModule('payment'))
const catalogItems = computed(() => (admitCatalogData.value?.data ?? []).filter((r) => r.isActive))
const catalogNonEmpty = computed(() => catalogItems.value.filter((r) => (Number(r.amount) || 0) > 0))
function itemKey(item: FeeCatalogItem): string {
  return item.id || item.name
}
const feeEdits = ref<Record<string, number>>({})
const checkedFees = ref<Set<string>>(new Set())
const feeEditKey = ref('')
function toggleFee(item: FeeCatalogItem): void {
  const key = itemKey(item)
  const next = new Set(checkedFees.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  checkedFees.value = next
}
watch([() => `${form.classId}|${form.departmentId ?? ''}|${form.sectionId ?? ''}`, admitCatalogData], ([key, res]) => {
  if (!form.classId || key === feeEditKey.value) return
  if (!res?.data && catalogFetching.value) return // scope data on the way — keep old edits
  feeEditKey.value = key
  const rows = ((res?.data ?? []) as FeeCatalogItem[]).filter((r) => r.isActive && (Number(r.amount) || 0) > 0)
  feeEdits.value = Object.fromEntries(rows.map((r) => [itemKey(r), Number(r.amount) || 0]))
  checkedFees.value = new Set(rows.map((r) => itemKey(r)))
})
const admitTotal = computed(() =>
  catalogNonEmpty.value
    .filter((r) => checkedFees.value.has(itemKey(r)))
    .reduce((sum, r) => sum + (Number(feeEdits.value[itemKey(r)]) || 0), 0),
)
function admitFeeDues(): { name: string; amount: number; dueFor: string; feeItemId: string; source: 'admission' }[] {
  return catalogNonEmpty.value
    .filter((r) => checkedFees.value.has(itemKey(r)))
    .map((r) => ({
      name: r.name,
      amount: Number(feeEdits.value[itemKey(r)]) || 0,
      dueFor: '',
      feeItemId: r.id || '',
      source: 'admission' as const,
    }))
    .filter((r) => r.amount > 0 && r.name.trim())
}

const errors = reactive<Record<string, string>>({})

const steps = computed(() => [
  { number: 1, label: 'Student Identity' },
  { number: 2, label: 'Details' },
  { number: 3, label: school.hasModule('payment') ? 'Admission & Fees' : 'Admission' },
])
const currentStep = ref(1)

function validateIdentity(): boolean {
  errors.name = form.name.trim() ? '' : 'Student name is required.'
  errors.gender = form.gender ? '' : 'Gender is required.'
  errors.roll = form.roll.trim() ? '' : 'Roll is required.'
  errors.guardianPhone = form.guardianPhone.trim() ? '' : 'Guardian phone is required.'
  return !errors.name && !errors.gender && !errors.roll && !errors.guardianPhone
}

function validate(): boolean {
  const ok = validateIdentity()
  errors.classId = form.classId ? '' : 'Class is required.'
  return ok && !errors.classId
}

function nextStep(): void {
  formError.value = ''
  if (currentStep.value === 1 && !validateIdentity()) return
  if (currentStep.value < steps.value.length) currentStep.value += 1
}

function prevStep(): void {
  formError.value = ''
  if (currentStep.value > 1) currentStep.value -= 1
}

function selectStep(target: number): void {
  formError.value = ''
  if (target <= 1) {
    currentStep.value = 1
    return
  }
  if (!validateIdentity()) {
    currentStep.value = 1
    return
  }
  currentStep.value = Math.min(target, steps.value.length)
}

const formError = ref('')
const saving = ref(false)
const { mutateAsync: createStudent } = useCreateStudent()

// Optional photo: picked here, uploaded right after the student is created.
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

const askPayment = ref(false)
const createdId = ref('')
const createdName = ref('')

function goBack(): void {
  router.push('/admin/students')
}

function afterAdmit(collect: boolean): void {
  askPayment.value = false
  if (collect && createdId.value) {
    router.push({ path: '/admin/fees/collect', query: { studentId: createdId.value } })
  } else if (createdId.value) {
    router.push(`/admin/students/${createdId.value}`)
  } else {
    goBack()
  }
}

async function save(): Promise<void> {
  formError.value = ''
  if (!validate()) return
  saving.value = true
  try {
    const created = await createStudent({
      name: form.name.trim(),
      cardId: form.cardId.trim(),
      gender: form.gender,
      bloodGroup: form.bloodGroup,
      address: form.address.trim(),
      roll: form.roll.trim(),
      classId: form.classId,
      sectionId: form.sectionId || null,
      departmentId: form.departmentId,
      // Belt-and-braces: only labels visible right now are sent, so a stale
      // tick from a previous scope can never leak into the record.
      subjects: form.selectedSubjects.filter((l) => new Set(visibleSubjectLabels.value).has(l)),
      guardianName: form.guardianName.trim(),
      guardianPhone: form.guardianPhone.trim(),
      guardianPhone2: form.guardianPhone2.trim(),
      dateOfBirth: form.dateOfBirth || null,
      instituteName: form.instituteName.trim(),
      totalAmount: admitTotal.value,
      paidAmount: 0,
      feeBreakdown: Object.fromEntries(
        admitFeeDues().map((r) => [r.name, r.amount]),
      ),
      feeDues: admitFeeDues(),
      status: 'active',
    })
    createdName.value = form.name.trim()
    createdId.value = created.data?.id ?? ''
    if (photoFile.value && createdId.value) {
      try {
        await studentService.uploadPhoto(createdId.value, photoFile.value)
      } catch {
        toast.error('Student admitted, but the photo upload failed')
      }
    }
    toast.success('Student admitted')
    if (school.hasModule('payment')) {
      askPayment.value = true
    } else {
      // Fees module off — straight to the new student's profile.
      afterAdmit(false)
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
}
form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.steps {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin: 0;
  padding: 0;
  list-style: none;
}
.steps__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-family: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.steps__item:hover {
  border-color: var(--color-primary);
}
.steps__number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 50%;
}
.steps__item--active {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}
.steps__item--active .steps__number {
  color: var(--color-primary-contrast);
  background: var(--color-primary);
  border-color: var(--color-primary);
}
.steps__item--done {
  color: var(--color-text);
  border-color: var(--color-primary);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.field-error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
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
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}
.breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-md);
}
.breakdown__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--spacing-xs);
}
.breakdown__row .amount {
  max-width: 140px;
}
.breakdown__row--off {
  opacity: 0.6;
}
.checkline {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
}
.cycle {
  font-style: normal;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}
.breakdown__row--total {
  font-weight: var(--font-weight-bold);
}
.subjects-preview {
  margin-top: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.subjects-preview__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}
.checkbox-item {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  min-height: 36px;
  padding: 2px var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  font-size: var(--font-size-xs);
  cursor: pointer;
}
.checkbox-item--checked {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}
.checkbox-item--dept {
  border-style: dashed;
}
.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  align-items: center;
}
.chip-group__label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-muted);
}
</style>
