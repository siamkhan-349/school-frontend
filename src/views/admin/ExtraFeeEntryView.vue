<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Add Extra Fee</h1>
        <p class="muted">A one-time charge for students already admitted. Apply it now so it appears on Student Fee, or save a draft to review first.</p>
      </div>
      <RouterLink to="/admin/fees/extra" class="back">← Extra Fee</RouterLink>
    </div>

    <AppCard title="Extra Fee">
      <form class="form" @submit.prevent="save">
        <label>Fee name
          <input
            v-model="form.name"
            class="app-input__control"
            placeholder="e.g. Annual Exam Fee 2026"
            maxlength="255"
            required
          />
        </label>

        <label>Amount (৳)
          <input
            v-model.number="form.amount"
            type="number"
            min="1"
            step="0.01"
            class="app-input__control"
            required
          />
        </label>

        <label>Scope
          <select v-model="form.classId" class="app-input__control">
            <option value="">Whole school</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
        </label>

        <label v-if="selectedClass?.hasDepartments">Department (optional)
          <select v-model="form.departmentId" class="app-input__control">
            <option :value="null">All departments</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.label }}</option>
          </select>
        </label>

        <label v-if="form.classId && sections.length">Section (optional)
          <select v-model="form.sectionId" class="app-input__control">
            <option :value="null">All sections</option>
            <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.label }}</option>
          </select>
        </label>

        <label>Payment deadline (optional)
          <input v-model="form.dueFor" type="date" class="app-input__control" />
          <span class="field-hint">Optional. The due is added as soon as you apply; this date is only the collection deadline shown on Student Fee.</span>
          <span v-if="dueDateLabel" class="field-hint field-hint--strong">Selected: {{ dueDateLabel }}</span>
        </label>

        <label>Notes (optional)
          <textarea
            v-model="form.notes"
            class="app-input__control"
            rows="3"
            placeholder="e.g. Cox's Bazar tour — collect before 15 Nov"
          ></textarea>
        </label>

        <label class="checkbox">
          <input v-model="form.applyNow" type="checkbox" />
          Apply to current students now
        </label>
        <p class="field-hint">
          <template v-if="form.applyNow">
            Checked: every active student in this scope is charged as soon as you save.
          </template>
          <template v-else>
            Unchecked: saves as a draft. No one is charged until you press Apply on the Extra Fee list.
          </template>
        </p>

        <div class="scope-box">
          <div>
            <strong>{{ previewCount }}</strong>
            active {{ previewCount === 1 ? 'student' : 'students' }} in this scope
            <span v-if="previewLoading" class="muted"> · checking…</span>
          </div>
          <p class="muted">
            Applying creates one due per student. Students admitted later can be added with “Add new students”
            from the Extra Fee list. Use a distinct name so a receipt can be matched to this fee.
          </p>
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <div class="form-actions">
          <RouterLink to="/admin/fees/extra">
            <AppButton variant="ghost" type="button">Cancel</AppButton>
          </RouterLink>
          <AppButton type="submit" :loading="saving" :disabled="!canSave">
            {{ form.applyNow ? 'Save & Apply' : 'Save Draft' }}
          </AppButton>
        </div>
      </form>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import {
  useClasses,
  useCreateExtraFee,
  useDepartments,
  useExtraFeePreview,
  useSections,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const toast = useToast()

const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])

const form = reactive({
  name: '',
  amount: 0,
  classId: '',
  departmentId: null as string | null,
  sectionId: null as string | null,
  dueFor: '',
  notes: '',
  applyNow: true,
})

const selectedClass = computed(() => classes.value.find((c) => c.id === form.classId))
const dueDateLabel = computed(() => {
  if (!form.dueFor) return ''
  const date = new Date(`${form.dueFor}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})
const { data: deptData } = useDepartments(() => form.classId || undefined)
const departments = computed(() => deptData.value?.data ?? [])
const { data: sectionData } = useSections(() => form.classId || undefined, undefined, true)
const sections = computed(() =>
  (sectionData.value?.data ?? []).filter((s) => s.classId === form.classId),
)
watch(
  () => form.classId,
  () => {
    form.departmentId = null
    form.sectionId = null
  },
)

const { data: previewData, isFetching: previewLoading } = useExtraFeePreview(
  () => form.classId,
  () => (form.classId ? form.departmentId : null),
  () => (form.classId ? form.sectionId : null),
)
const previewCount = computed(() => previewData.value?.data.students ?? 0)

const canSave = computed(
  () => form.name.trim().length > 0 && Number(form.amount) > 0,
)

const error = ref('')
const { mutateAsync: createExtraFee, isPending: saving } = useCreateExtraFee()

async function save(): Promise<void> {
  error.value = ''
  if (!canSave.value) {
    error.value = 'Enter a fee name and an amount greater than zero.'
    return
  }
  try {
    const res = await createExtraFee({
      name: form.name.trim(),
      amount: Number(form.amount),
      classId: form.classId || null,
      departmentId: form.classId ? form.departmentId : null,
      sectionId: form.classId ? form.sectionId : null,
      dueFor: form.dueFor || '',
      notes: form.notes.trim(),
      applyNow: form.applyNow,
    })
    toast.success(
      res.message || (form.applyNow ? 'Extra fee applied' : 'Draft saved'),
    )
    await router.push('/admin/fees/extra')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Save failed'
  }
}
</script>

<style scoped>
.page {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-lg);
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--spacing-xs);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin: 0;
}
.back {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
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
}
.form label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.form label.checkbox {
  flex-direction: row;
  align-items: center;
  gap: var(--spacing-sm);
}
.form label.checkbox input {
  width: auto;
}
.field-hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  line-height: 1.4;
}
.field-hint--strong {
  color: var(--color-text);
  font-weight: 500;
}
.form > .field-hint {
  margin-top: calc(var(--spacing-xs) * -1);
}
.scope-box {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
}
.scope-box p {
  line-height: 1.45;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}
</style>
