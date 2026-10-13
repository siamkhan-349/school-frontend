<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Edit Student</h1>
        <p class="page__hint">Update identity, guardian, class, and the admission total.</p>
      </div>
      <AppButton variant="ghost" type="button" @click="goBack">← Back</AppButton>
    </div>

    <p v-if="isLoading" class="hint">Loading…</p>
    <p v-else-if="isError || !student" class="error">Student not found.</p>
    <form v-else @submit.prevent="save">
      <AppCard title="Student Identity">
        <div class="form-grid">
          <label>Name*
            <input v-model="form.name" class="app-input__control" />
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
            <input v-model="form.roll" class="app-input__control" />
            <span v-if="errors.roll" class="field-error">{{ errors.roll }}</span>
          </label>
          <label>Card ID (optional)
            <input v-model="form.cardId" class="app-input__control" placeholder="e.g. RFID card number" />
          </label>
          <label>Guardian name
            <input v-model="form.guardianName" class="app-input__control" />
          </label>
          <label>Guardian phone*
            <input v-model="form.guardianPhone" class="app-input__control" />
            <span v-if="errors.guardianPhone" class="field-error">{{ errors.guardianPhone }}</span>
          </label>
        </div>
      </AppCard>

      <AppCard title="Details (optional)">
        <div class="form-grid">
          <label class="photo-picker">
            <span>Student photo (optional)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" class="app-input__control" :disabled="photoBusy" @change="onPhotoSelect" />
            <span class="hint">JPG / PNG / WEBP, max 5MB. Uploads immediately.</span>
          </label>
          <div v-if="photoPreview || student?.photoUrl" class="photo-preview">
            <img :src="photoPreview || student?.photoUrl" alt="Student photo" />
            <AppButton variant="ghost" type="button" :disabled="photoBusy" @click="removePhotoNow">Remove</AppButton>
          </div>
          <label>Date of birth<input v-model="form.dateOfBirth" type="date" class="app-input__control" /></label>
          <label>Student phone<input v-model="form.phone" class="app-input__control" /></label>
          <label>Guardian phone 2<input v-model="form.guardianPhone2" class="app-input__control" /></label>
          <label>Previous institute<input v-model="form.instituteName" class="app-input__control" /></label>
          <label>Address<input v-model="form.address" class="app-input__control" /></label>
        </div>
      </AppCard>

      <AppCard title="Admission">
        <div class="form-grid">
          <label>Class*
            <select v-model="form.classId" class="app-input__control">
              <option value="">Select class</option>
              <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
            <span v-if="errors.classId" class="field-error">{{ errors.classId }}</span>
          </label>
          <label>Section
            <select v-model="form.sectionLabel" class="app-input__control">
              <option v-for="opt in SECTION_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </label>
          <label v-if="editClass?.hasDepartments">Department
            <select v-model="form.departmentId" class="app-input__control">
              <option :value="null">Select department</option>
              <option v-for="d in editDepartments" :key="d.id" :value="d.id">{{ d.label }}</option>
            </select>
          </label>
          <label>Status
            <select v-model="form.status" class="app-input__control">
              <option value="active">active</option><option value="inactive">inactive</option>
            </select>
          </label>
          <label>Total (৳)
            <input v-model.number="form.totalAmount" type="number" min="0" class="app-input__control" />
          </label>
        </div>
        <p class="hint">If you change the total, the due recalculates automatically (due = total − paid).</p>
        <div v-if="form.classId" class="subjects-preview">
          <p class="subjects-preview__title">Subjects ({{ form.selectedSubjects.length }}) — tick what the student will study</p>
          <div v-if="editCommon.length" class="chip-row">
            <label v-for="s in editCommon" :key="s.id" class="checkbox-item" :class="{ 'checkbox-item--checked': form.selectedSubjects.includes(s.label) }">
              <input type="checkbox" :value="s.label" v-model="form.selectedSubjects" />
              <span>{{ s.label }}</span>
            </label>
          </div>
          <div v-if="form.departmentId && editPickedDept.length" class="chip-row">
            <label v-for="s in editPickedDept" :key="s.id" class="checkbox-item checkbox-item--dept" :class="{ 'checkbox-item--checked': form.selectedSubjects.includes(s.label) }">
              <input type="checkbox" :value="s.label" v-model="form.selectedSubjects" />
              <span>{{ s.label }}</span>
            </label>
          </div>
        </div>
      </AppCard>

      <p v-if="formError" class="error">{{ formError }}</p>
      <div class="form-actions">
        <AppButton variant="ghost" type="button" @click="goBack">Cancel</AppButton>
        <AppButton type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save changes' }}</AppButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import {
  useClasses,
  useDepartments,
  useEnsureSection,
  useSections,
  useStudent,
  useSubjects,
  useUpdateStudent,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { studentService } from '@/services'
import { SECTION_OPTIONS } from '@/types/models'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const qc = useQueryClient()
const id = computed(() => String(route.params.id ?? ''))

const { data, isLoading, isError } = useStudent(id)
const student = computed(() => data.value?.data)

const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])

const form = reactive({
  name: '',
  cardId: '',
  gender: '',
  phone: '',
  address: '',
  roll: '',
  guardianName: '',
  guardianPhone: '',
  guardianPhone2: '',
  dateOfBirth: '',
  instituteName: '',
  classId: '',
  sectionLabel: SECTION_OPTIONS[0] ?? 'A',
  departmentId: null as string | null,
  selectedSubjects: [] as string[],
  totalAmount: 0,
  status: 'active' as 'active' | 'inactive',
})

const filled = ref(false)
watch(student, (s) => {
  if (!s || filled.value) return
  filled.value = true
  form.name = s.name ?? ''
  form.cardId = s.cardId ?? ''
  form.gender = s.gender ?? ''
  form.phone = s.phone ?? ''
  form.address = s.address ?? ''
  form.roll = s.roll ?? ''
  form.guardianName = s.guardianName ?? ''
  form.guardianPhone = s.guardianPhone ?? ''
  form.guardianPhone2 = s.guardianPhone2 ?? ''
  form.dateOfBirth = s.dateOfBirth ?? ''
  form.instituteName = s.instituteName ?? ''
  form.classId = s.classId ?? ''
  form.departmentId = s.departmentId ?? null
  form.selectedSubjects = Object.keys(s.subjects ?? {})
  form.totalAmount = Number(s.totalAmount) || 0
  form.status = s.status === 'inactive' ? 'inactive' : 'active'
})

const editClass = computed(() => classes.value.find((c) => c.id === form.classId))
const { data: editDeptData } = useDepartments(() => form.classId || undefined)
const editDepartments = computed(() => editDeptData.value?.data ?? [])

// Subject select (checkbox) — prefilled from the record; changing class/dept
// auto-ticks all visible subjects (then untick by hand). No price.
const { data: editSubjectData, isFetching: editSubjectsFetching } = useSubjects(() => form.classId || undefined)
const editSubjects = computed(() => editSubjectData.value?.data ?? [])
const editCommon = computed(() => editSubjects.value.filter((s) => !s.departmentId))
const editPickedDept = computed(() =>
  form.departmentId ? editSubjects.value.filter((s) => s.departmentId === form.departmentId) : [],
)
const autoSelectSubjects = ref(false)
const visibleEditLabels = computed(() => {
  const list = form.departmentId ? [...editCommon.value, ...editPickedDept.value] : editSubjects.value
  return list.map((s) => s.label)
})
watch([() => form.classId, () => form.departmentId], () => {
  if (filled.value) autoSelectSubjects.value = true
})
watch(visibleEditLabels, (labels) => {
  // Same transient-empty guard as the admit form (the 0/N bug).
  if (!labels.length && editSubjectsFetching.value) return
  if (autoSelectSubjects.value) {
    form.selectedSubjects = [...labels]
    autoSelectSubjects.value = false
  } else if (labels.length) {
    const keep = new Set(labels)
    form.selectedSubjects = form.selectedSubjects.filter((l) => keep.has(l))
  }
})
const { data: editSectionData } = useSections(() => form.classId || undefined)
watch(editSectionData, (res) => {
  if (!filled.value) return
  const current = (res?.data ?? []).find((s) => s.id === student.value?.sectionId)
  if (current) form.sectionLabel = current.label
}, { immediate: true })

const errors = reactive<Record<string, string>>({})
function validate(): boolean {
  errors.name = form.name.trim() ? '' : 'Student name is required.'
  errors.gender = form.gender ? '' : 'Gender is required.'
  errors.roll = form.roll.trim() ? '' : 'Roll is required.'
  errors.guardianPhone = form.guardianPhone.trim() ? '' : 'Guardian phone is required.'
  errors.classId = form.classId ? '' : 'Class is required.'
  return !errors.name && !errors.gender && !errors.roll && !errors.guardianPhone && !errors.classId
}

const formError = ref('')
const saving = ref(false)
const { mutateAsync: updateStudent } = useUpdateStudent()
const { mutateAsync: ensureSection } = useEnsureSection()

// Photo uploads immediately (the student already exists).
const photoPreview = ref('')
const photoBusy = ref(false)
async function onPhotoSelect(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement | null
  const file = input?.files?.[0] ?? null
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
  formError.value = ''
  photoBusy.value = true
  try {
    await studentService.uploadPhoto(id.value, file)
    if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
    photoPreview.value = URL.createObjectURL(file)
    qc.invalidateQueries({ queryKey: ['student'] })
    qc.invalidateQueries({ queryKey: ['students'] })
    toast.success('Photo updated')
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Photo upload failed'
  } finally {
    photoBusy.value = false
    if (input) input.value = ''
  }
}
async function removePhotoNow(): Promise<void> {
  photoBusy.value = true
  try {
    await studentService.removePhoto(id.value)
    if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
    photoPreview.value = ''
    qc.invalidateQueries({ queryKey: ['student'] })
    qc.invalidateQueries({ queryKey: ['students'] })
    toast.success('Photo removed')
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Photo remove failed'
  } finally {
    photoBusy.value = false
  }
}

function goBack(): void {
  router.push(`/admin/students/${id.value}`)
}

async function save(): Promise<void> {
  formError.value = ''
  if (!validate()) return
  saving.value = true
  try {
    const section = await ensureSection({ classId: form.classId, label: form.sectionLabel })
    await updateStudent({
      id: id.value,
      input: {
        name: form.name.trim(),
        cardId: form.cardId.trim(),
        gender: form.gender,
        phone: form.phone.trim(),
        address: form.address.trim(),
        roll: form.roll.trim(),
        classId: form.classId,
        sectionId: section.id,
        departmentId: form.departmentId,
        subjects: [...form.selectedSubjects.filter((l) => new Set(visibleEditLabels.value).has(l))],
        guardianName: form.guardianName.trim(),
        guardianPhone: form.guardianPhone.trim(),
        guardianPhone2: form.guardianPhone2.trim(),
        dateOfBirth: form.dateOfBirth || null,
        instituteName: form.instituteName.trim(),
        totalAmount: form.totalAmount,
        status: form.status,
      },
    })
    toast.success('Student updated')
    goBack()
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
</style>
