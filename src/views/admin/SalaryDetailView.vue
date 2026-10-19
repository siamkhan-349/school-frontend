<template>
  <div class="page">
    <div class="page__head">
      <div>
        <button class="link-btn" type="button" @click="router.back()">← Salary Records</button>
        <h1 class="page__title">Salary Sheet — {{ sheet?.teacherName || '…' }}</h1>
        <p v-if="sheet" class="muted">{{ periodLabel(sheet.month, sheet.year) }} · Status: {{ sheet.status }}</p>
      </div>
      <div class="head-actions">
        <AppButton
          v-if="sheet && sheet.status !== 'paid'"
          type="button"
          :loading="paying"
          @click="markPaid"
        >
          Mark paid — ৳{{ netPreview }}
        </AppButton>
        <AppButton variant="ghost" type="button" @click="askRemove">Delete</AppButton>
      </div>
    </div>

    <div v-if="isLoading" class="sk-stack">
      <AppSkeleton variant="card" />
      <AppSkeleton variant="card" />
      <AppSkeleton variant="card" />
    </div>
    <p v-else-if="isError || !sheet" class="error">Salary sheet not found.</p>
    <template v-else>
      <div class="cards">
        <AppCard title="Pay Breakdown">
          <dl class="breakdown">
            <div><dt>Basic</dt><dd>৳{{ sheet.basic }}</dd></div>
            <div><dt>Allowance</dt><dd>৳{{ sheet.allowance }}</dd></div>
            <div><dt>Bonus</dt><dd>৳{{ sheet.bonus ?? 0 }}</dd></div>
            <div><dt>Deduction</dt><dd>− ৳{{ sheet.deduction }}</dd></div>
            <div class="gross"><dt>Gross</dt><dd>৳{{ gross }}</dd></div>
            <div class="net"><dt>Net payable</dt><dd>৳{{ netPreview }}</dd></div>
          </dl>
        </AppCard>

        <AppCard title="Review & Adjust">
          <form class="form" @submit.prevent="save">
            <label>Bonus (৳)<input v-model.number="form.bonus" type="number" min="0" class="app-input__control" /></label>
            <label>Deduction (৳)<input v-model.number="form.deduction" type="number" min="0" class="app-input__control" /></label>
            <label>Payment date (empty = pending)<input v-model="form.paymentDate" type="date" class="app-input__control" /></label>
            <label>Notes<input v-model="form.notes" class="app-input__control" placeholder="Optional note" /></label>
            <p v-if="formError" class="error">{{ formError }}</p>
            <AppButton type="submit" :loading="saving">Save changes</AppButton>
          </form>
        </AppCard>
      </div>

      <AppCard title="Attendance & Info">
        <dl class="breakdown">
          <div><dt>Present</dt><dd>{{ sheet.presentDays ?? 0 }} day(s)</dd></div>
          <div><dt>Absent</dt><dd>{{ sheet.absentDays ?? 0 }} day(s)</dd></div>
          <div><dt>Late</dt><dd>{{ sheet.lateDays ?? 0 }} day(s)</dd></div>
          <div><dt>Paid on</dt><dd>{{ sheet.paymentDate || '—' }}</dd></div>
          <div><dt>Notes</dt><dd>{{ sheet.notes || '—' }}</dd></div>
        </dl>
      </AppCard>
    </template>

    <AppConfirmDialog
      :open="confirm.open"
      message="Delete this salary sheet?"
      :busy="deleting"
      @cancel="confirm.open = false"
      @confirm="doRemove"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import { useDeleteSalary, usePaySalary, useSalary, useUpdateSalary } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const periodLabel = (m: number, y: number): string => `${MONTHS[m - 1] ?? m} ${y}`
const num = (v: unknown): number => Number(v) || 0

const route = useRoute()
const router = useRouter()
const toast = useToast()
const id = computed(() => String(route.params.id || ''))

const { data, isLoading, isError } = useSalary(id)
const sheet = computed(() => data.value?.data)

const form = reactive({ bonus: 0, deduction: 0, paymentDate: '', notes: '' })
watch(sheet, (s) => {
  if (!s) return
  form.bonus = num(s.bonus)
  form.deduction = num(s.deduction)
  form.paymentDate = s.paymentDate || ''
  form.notes = s.notes || ''
}, { immediate: true })

const gross = computed(() =>
  num(sheet.value?.basic) + num(sheet.value?.allowance) + num(form.bonus),
)
const netPreview = computed(() => gross.value - num(form.deduction))

const formError = ref('')
const saving = ref(false)
const { mutateAsync: updateSalary } = useUpdateSalary(id.value)
async function save(): Promise<void> {
  formError.value = ''
  saving.value = true
  try {
    await updateSalary({
      bonus: num(form.bonus),
      deduction: num(form.deduction),
      paymentDate: form.paymentDate || null,
      notes: form.notes.trim(),
    })
    toast.success('Salary sheet updated')
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

const paying = ref(false)
const { mutateAsync: paySalary } = usePaySalary()
async function markPaid(): Promise<void> {
  paying.value = true
  try {
    await paySalary(id.value)
    toast.success('Salary marked paid')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  } finally {
    paying.value = false
  }
}

const confirm = ref({ open: false })
const deleting = ref(false)
const { mutateAsync: removeSalary } = useDeleteSalary()
function askRemove(): void {
  confirm.value.open = true
}
async function doRemove(): Promise<void> {
  deleting.value = true
  try {
    await removeSalary(id.value)
    toast.success('Salary sheet deleted')
    router.push('/admin/payroll')
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
  align-items: flex-start;
  margin-bottom: var(--spacing-lg);
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-top: var(--spacing-xs);
}
.head-actions {
  display: flex;
  gap: var(--spacing-sm);
}
.muted {
  color: var(--color-text-muted);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.link-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
@media (max-width: 640px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
.breakdown {
  margin: 0;
}
.breakdown > div {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.breakdown dt {
  color: var(--color-text-muted);
  min-width: 0;
  overflow-wrap: anywhere;
}
.breakdown dd {
  margin: 0;
  font-weight: var(--font-weight-semibold);
  flex-shrink: 0;
}
.breakdown .gross dd,
.breakdown .net dd {
  font-size: var(--font-size-lg);
}
.breakdown .net dd {
  color: var(--color-primary);
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
</style>
