<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Bulk Import Payments</h1>
        <p class="page__hint">One receipt per line: studentId, fee name, amount, discount, paid, paymentDate (YYYY-MM-DD). A header first line is skipped.</p>
      </div>
      <AppButton variant="ghost" type="button" @click="goBack">← Payments</AppButton>
    </div>

    <AppCard>
      <label class="paste-label">CSV rows
        <textarea v-model="raw" rows="8" class="app-input__control" placeholder="12, মাসিক বেতন, 500, 0, 500, 2026-10-01" />
      </label>
      <p class="muted">{{ parsed.length }} rows ready — {{ errorRows }} bad rows will be skipped.</p>
      <table v-if="parsed.length" class="table">
        <thead>
          <tr><th>#</th><th>Student ID</th><th>Fee name</th><th>Amount</th><th>Discount</th><th>Paid</th><th>Date</th></tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in parsedPreview" :key="i">
            <td>{{ i + 1 }}</td><td>{{ r.studentId }}</td><td>{{ r.feeType }}</td>
            <td>{{ r.amount }}</td><td>{{ r.discount }}</td><td>{{ r.paid }}</td><td>{{ r.paymentDate }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="result" class="success">{{ result.created }} created, {{ result.errors }} failed.</p>
      <ul v-if="resultErrors.length" class="error-list">
        <li v-for="e in resultErrors" :key="e.row">Row {{ e.row }}: {{ e.message }}</li>
      </ul>
      <p v-if="formError" class="error">{{ formError }}</p>
      <div class="form-actions">
        <AppButton type="button" :disabled="!parsed.length" :loading="sending" @click="send">
          Import {{ parsed.length }} rows
        </AppButton>
      </div>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import { useBulkPayments } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'

interface BulkRow {
  studentId: string
  feeType: string
  amount: number
  discount: number
  paid: number
  paymentDate: string
}

const router = useRouter()
const toast = useToast()
const raw = ref('')

function parseLine(line: string): BulkRow | null {
  const parts = line.split(',').map((p) => p.trim())
  if (parts.length < 5 || !parts[0]) return null
  const num = (v: string | undefined): number => {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }
  return {
    studentId: parts[0] ?? '',
    feeType: parts[1] || 'Monthly',
    amount: num(parts[2]),
    discount: num(parts[3]),
    paid: num(parts[4]),
    paymentDate: parts[5] || new Date().toISOString().slice(0, 10),
  }
}

const parsed = computed(() => {
  const lines = raw.value.split('\n').map((l) => l.trim()).filter(Boolean)
  const rows: BulkRow[] = []
  for (const line of lines) {
    if (/studentid/i.test(line)) continue
    const row = parseLine(line)
    if (row) rows.push(row)
  }
  return rows
})
const errorRows = computed(() => {
  const lines = raw.value.split('\n').map((l) => l.trim()).filter(Boolean).filter((l) => !/studentid/i.test(l))
  return lines.length - parsed.value.length
})
const parsedPreview = computed(() => parsed.value.slice(0, 20))

const result = ref<{ created: number; errors: number } | null>(null)
const resultErrors = ref<{ row: number; message: string }[]>([])
const formError = ref('')
const sending = ref(false)
const { mutateAsync: bulkPayments } = useBulkPayments()

function goBack(): void {
  router.push('/admin/payments')
}

async function send(): Promise<void> {
  formError.value = ''
  result.value = null
  resultErrors.value = []
  sending.value = true
  try {
    const res = await bulkPayments({ records: parsed.value })
    const created = (res.data.created ?? []).length
    const errors = res.data.errors ?? []
    result.value = { created, errors: errors.length }
    resultErrors.value = errors
    toast.success(`${created} payments imported`)
    if (!errors.length) raw.value = ''
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Import failed'
  } finally {
    sending.value = false
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
.paste-label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-sm);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.success {
  color: var(--color-success);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.error-list {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin: var(--spacing-sm) 0;
  padding-left: var(--spacing-lg);
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  margin: var(--spacing-sm) 0;
}
.table th,
.table td {
  text-align: left;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--spacing-md);
}
</style>
