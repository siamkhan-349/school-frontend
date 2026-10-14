<template>
  <div class="receipt">
    <div class="receipt__toolbar">
      <RouterLink to="/admin/payments" class="back">‹ Back</RouterLink>
      <div class="receipt__actions">
        <AppButton variant="ghost" @click="downloadPdf">PDF</AppButton>
        <AppButton @click="print">Print Receipt</AppButton>
      </div>
    </div>
    <p v-if="isLoading" class="muted">Loading…</p>
    <p v-else-if="!payment" class="error">Receipt not found.</p>
    <div v-else class="sheet">
      <header class="sheet__head">
        <h2>{{ settings?.schoolName ?? 'School' }}</h2>
        <p class="muted">{{ settings?.address ?? '' }} · {{ settings?.phone ?? '' }}</p>
        <h3>Fee Receipt — {{ payment.receiptNumber }}</h3>
      </header>
      <dl class="kv">
        <div><dt>Student</dt><dd>{{ payment.studentName }}</dd></div>
        <div v-if="!(payment.breakdown ?? []).length"><dt>Fee name</dt><dd>{{ (payment.feeName || payment.feeType) }}</dd></div>
        <div><dt>Date</dt><dd>{{ payment.paymentDate }}</dd></div>
        <div><dt>Status</dt><dd>{{ payment.status }}</dd></div>
        <div><dt>Amount</dt><dd>৳{{ payment.amount }}</dd></div>
        <div v-if="Number(payment.discount) > 0"><dt>Discount</dt><dd>৳{{ payment.discount }}</dd></div>
        <div><dt>Paid</dt><dd>৳{{ payment.paid }}</dd></div>
        <div><dt>Due on receipt</dt><dd>৳{{ payment.due }}</dd></div>
      </dl>
      <table v-if="(payment.breakdown ?? []).length" class="lines">
        <thead>
          <tr><th>Fee name</th><th>Amount</th><th>Paid</th></tr>
        </thead>
        <tbody>
          <tr v-for="line in payment.breakdown" :key="line.feeType + (line.dueFor || '')">
            <td>{{ line.feeName || line.feeType }}<em v-if="line.dueFor" class="duefor"> · {{ line.dueFor.slice(0, 7) }}</em></td><td>৳{{ line.amount }}</td><td>৳{{ line.paid }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="stillDues.length" class="still">
        <h4 class="still__title">Still due after this receipt</h4>
        <div v-for="row in stillDues" :key="row.key" class="still__row">
          <span>{{ row.name }}<em v-if="row.dueFor" class="duefor"> · {{ row.dueFor.slice(0, 7) }}</em></span><span>৳{{ row.due }}</span>
        </div>
        <div class="still__row still__row--total">
          <span>Total still due</span><span>৳{{ stillTotal }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import { useReceipt, useSettings, useStudent, useStudentPayments } from '@/composables/useQueries'
import { printWithTitle } from '@/utils/print'
import { receiptPdf } from '@/utils/pdf'

const route = useRoute()
const id = computed(() => String(route.params.id ?? ''))
const { data, isLoading } = useReceipt(id)
const payment = computed(() => data.value?.data)
const { data: settingsData } = useSettings()
const settings = computed(() => settingsData.value?.data)

// Still-due per head: admit snapshot minus every receipt's attribution
// (breakdown lines first, legacy whole-paid to its fee type).
const studentId = computed(() => payment.value?.studentId ?? '')
const { data: studentData } = useStudent(studentId)
const student = computed(() => studentData.value?.data)
const { data: histData } = useStudentPayments(studentId)
const stillDues = computed(() => {
  const dues = (student.value?.feeDues ?? []) as {
    name: string
    amount: number
    dueFor?: string
  }[]
  const base =
    dues.length > 0
      ? dues
          .filter((d) => d.name && (Number(d.amount) || 0) > 0)
          .map((d) => ({
            key: `${d.name}||${d.dueFor || ''}`,
            name: d.name,
            dueFor: d.dueFor || '',
            charge: Number(d.amount) || 0,
          }))
      : Object.entries(
          (student.value?.feeBreakdown ?? {}) as Record<string, number>,
        ).map(([name, charge]) => ({
          key: `${name}||`,
          name,
          dueFor: '',
          charge: Number(charge) || 0,
        }))
  const paidExact: Record<string, number> = {}
  const legacyPool: Record<string, number> = {}
  for (const p of histData.value?.data ?? []) {
    const lines = (p.breakdown ?? []) as { feeType: string; feeName?: string; dueFor?: string; paid: number }[]
    if (lines.length) {
      for (const line of lines) {
        const nm = line.feeName || line.feeType
        if (!nm) continue
        const pd = Number(line.paid) || 0
        if (line.dueFor) paidExact[`${nm}||${line.dueFor}`] = (paidExact[`${nm}||${line.dueFor}`] ?? 0) + pd
        else legacyPool[nm] = (legacyPool[nm] ?? 0) + pd
      }
    } else {
      const nm = ((p as { feeName?: string }).feeName || p.feeType) as string
      if (nm) legacyPool[nm] = (legacyPool[nm] ?? 0) + (Number(p.paid) || 0)
    }
  }
  const ordered = [...base].sort((a, b) =>
    a.name === b.name ? (a.dueFor || '').localeCompare(b.dueFor || '') : 0,
  )
  const remaining = { ...legacyPool }
  return ordered
    .map((r) => {
      const exact = paidExact[r.key] ?? 0
      let due = Math.max(0, r.charge - exact)
      if (due > 0 && (remaining[r.name] ?? 0) > 0) {
        const take = Math.min(due, remaining[r.name] ?? 0)
        due -= take
        remaining[r.name] = (remaining[r.name] ?? 0) - take
      }
      return { ...r, due }
    })
    .filter((r) => r.due > 0)
})
const stillTotal = computed(() => stillDues.value.reduce((s, r) => s + r.due, 0))

function print(): void {
  const p = payment.value
  printWithTitle(p ? `Fee Receipt - ${p.receiptNumber} - ${p.studentName}` : 'Fee Receipt')
}
function downloadPdf(): void {
  const p = payment.value
  if (!p) return
  receiptPdf({
    schoolName: settings.value?.schoolName ?? 'School',
    address: settings.value?.address ?? '',
    phone: settings.value?.phone ?? '',
    receiptNumber: p.receiptNumber,
    studentName: p.studentName,
    date: p.paymentDate,
    status: p.status,
    amount: Number(p.amount),
    discount: Number(p.discount),
    paid: Number(p.paid),
    due: Number(p.due),
    lines: (p.breakdown ?? []).map((l) => ({
      name: l.feeName || l.feeType,
      amount: Number(l.amount),
      paid: Number(l.paid),
    })),
  })
}
</script>

<style scoped>
.receipt {
  max-width: var(--form-max-width);
  margin: 0 auto;
  padding: var(--spacing-lg);
}
.receipt__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}
.receipt__actions {
  display: flex;
  gap: var(--spacing-sm);
}
.back {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.duefor {
  font-style: normal;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}
.error {
  color: var(--color-danger);
}
.sheet {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.sheet__head {
  text-align: center;
}
.kv {
  display: grid;
  grid-template-columns: 1fr 1fr;
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
.lines {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.lines th,
.lines td {
  text-align: left;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}
.still {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  border-top: 2px solid var(--color-border);
  padding-top: var(--spacing-sm);
}
.still__title {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}
.still__row {
  display: flex;
  justify-content: space-between;
}
.still__row--total {
  font-weight: var(--font-weight-bold);
}
@media print {
  .receipt__toolbar,
  .app-shell__sidebar,
  .app-shell__topbar {
    display: none !important;
  }
  .receipt {
    max-width: none;
    padding: 0;
  }
  .sheet {
    border: none;
  }
}
</style>
