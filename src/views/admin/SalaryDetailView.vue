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
            <div v-if="num(sheet.lateDeduction) > 0">
              <dt>· late cut inside</dt><dd>− ৳{{ sheet.lateDeduction }}</dd>
            </div>
            <div class="gross"><dt>Gross</dt><dd>৳{{ gross }}</dd></div>
            <div class="net"><dt>Net payable</dt><dd>৳{{ netPreview }}</dd></div>
          </dl>
        </AppCard>

        <AppCard title="Review & Adjust">
          <form class="form" @submit.prevent="save">
            <label>Bonus (৳)<input v-model.number="form.bonus" type="number" min="0" class="app-input__control" /></label>
            <label>Deduction (৳)<input v-model.number="form.deduction" type="number" min="0" class="app-input__control" /></label>
            <p v-if="num(sheet?.absentDays) > 0" class="muted small">
              Absent: {{ sheet?.absentDays }} day(s) → suggested ৳{{ absentDeduction }}
              <button type="button" class="link-btn tiny" @click="form.deduction = absentDeduction">Use</button>
            </p>
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
          <div>
            <dt>Late cut</dt>
            <dd>{{ sheet.lateCutDays ?? 0 }} hajira (৳{{ sheet.lateDeduction ?? 0 }})</dd>
          </div>
          <div><dt>Paid on</dt><dd>{{ sheet.paymentDate || '—' }}</dd></div>
          <div><dt>Notes</dt><dd>{{ sheet.notes || '—' }}</dd></div>
        </dl>
        <p class="muted small" style="margin-top: var(--spacing-sm);">
          Click a day in the calendar below to adjust its status (absent → leave, etc.).
        </p>
      </AppCard>

      <AppCard title="Attendance Calendar">
        <AppSkeleton v-if="recordsLoading" variant="lines" :lines="6" />
        <div v-else class="calendar">
          <div v-for="day in WEEKDAYS" :key="day" class="calendar__weekday">{{ day }}</div>
          <div
            v-for="(cell, index) in calendarCells"
            :key="index"
            class="calendar__cell"
            :class="[
              cell.day === 0 ? 'calendar__cell--empty' : '',
              cell.isToday ? 'calendar__cell--today' : '',
              statusClass(cell.status),
            ]"
            @click="openDay(cell.iso)"
          >
            <span class="calendar__day">{{ cell.day || '' }}</span>
            <span v-if="cell.iso" class="calendar__status calendar__status--short">{{ statusShort(cell.status) }}</span>
            <span v-if="cell.iso && (cell.entryTime || cell.exitTime)" class="calendar__time">
              {{ cell.entryTime || '—' }}{{ cell.exitTime ? ' → ' + cell.exitTime : '' }}
            </span>
          </div>
        </div>
        <div v-if="!recordsLoading" class="calendar-legend">
          <span><i class="dot dot--present" /> Present</span>
          <span><i class="dot dot--absent" /> Absent</span>
          <span><i class="dot dot--late" /> Late</span>
          <span><i class="dot dot--off" /> Leave/Holiday</span>
          <span><i class="dot dot--none" /> No record</span>
        </div>
      </AppCard>
    </template>

    <AppConfirmDialog
      :open="confirm.open"
      message="Delete this salary sheet?"
      :busy="deleting"
      @cancel="confirm.open = false"
      @confirm="doRemove"
    />

    <!-- Per-day status picker -->
    <Teleport to="body">
      <div v-if="selectedDay" class="modal-backdrop" @click.self="closeDay">
        <div class="modal">
          <h3 class="modal__title">Adjust {{ selectedDay }}</h3>
          <p class="muted small">Current: {{ dayStatus(selectedDay) || 'no record' }}</p>
          <div class="status-grid">
            <button
              v-for="opt in dayStatuses"
              :key="opt.value"
              type="button"
              class="status-btn"
              :class="`status-btn--${opt.value}`"
              :disabled="dayBusy"
              @click="setDayStatus(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
          <p v-if="dayError" class="error">{{ dayError }}</p>
          <div class="form-actions">
            <AppButton variant="ghost" type="button" :disabled="dayBusy" @click="closeDay">Cancel</AppButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import { attendanceService, payrollService } from '@/services'
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const monthStr = computed(() => {
  const s = sheet.value
  if (!s) return ''
  return `${s.year}-${String(s.month).padStart(2, '0')}`
})

interface StaffAttRow {
  teacherId: string
  status: string
  date: string
  entryTime?: string
  exitTime?: string
}
const staffRecords = ref<StaffAttRow[]>([])
const recordsLoading = ref(false)

async function fetchAttendance(): Promise<void> {
  const s = sheet.value
  if (!s || !monthStr.value) return
  recordsLoading.value = true
  try {
    const res = await attendanceService.staffMonthly(monthStr.value)
    const raw = (res.data ?? []) as StaffAttRow[]
    staffRecords.value = raw.filter((r) => r.teacherId === s.teacherId)
  } catch {
    staffRecords.value = []
  } finally {
    recordsLoading.value = false
  }
}
watch(sheet, (s) => {
  if (s) void fetchAttendance()
}, { immediate: true })

const calendarCells = computed(() => {
  if (!/^\d{4}-\d{2}$/.test(monthStr.value)) return []
  const [year = 0, m = 0] = monthStr.value.split('-').map(Number)
  const first = new Date(year, m - 1, 1)
  const daysInMonth = new Date(year, m, 0).getDate()
  const statusByDate: Record<string, string> = {}
  const timeByDate: Record<string, { entry?: string; exit?: string }> = {}
  for (const r of staffRecords.value) {
    if (!r.date.startsWith(monthStr.value)) continue
    statusByDate[r.date] = r.status
    if (r.entryTime || r.exitTime) timeByDate[r.date] = { entry: r.entryTime, exit: r.exitTime }
  }
  const cells: Array<{ day: number; iso: string; status?: string; entryTime?: string; exitTime?: string; isToday: boolean }> = []
  for (let i = 0; i < first.getDay(); i += 1) cells.push({ day: 0, iso: '', isToday: false })
  const todayIso = new Date().toISOString().slice(0, 10)
  for (let d = 1; d <= daysInMonth; d += 1) {
    const iso = `${monthStr.value}-${String(d).padStart(2, '0')}`
    cells.push({
      day: d,
      iso,
      status: statusByDate[iso],
      entryTime: timeByDate[iso]?.entry,
      exitTime: timeByDate[iso]?.exit,
      isToday: iso === todayIso,
    })
  }
  while (cells.length % 7 !== 0) cells.push({ day: 0, iso: '', isToday: false })
  return cells
})

const statusClass = (status?: string) => {
  const v = String(status || '').toLowerCase()
  if (v === 'absent') return 'calendar__cell--absent'
  if (v === 'late') return 'calendar__cell--late'
  if (v === 'leave' || v === 'holiday') return 'calendar__cell--off'
  if (v) return 'calendar__cell--present'
  return 'calendar__cell--none'
}
const statusShort = (status?: string) => {
  const v = String(status || '').toLowerCase()
  if (v === 'absent') return 'A'
  if (v === 'late') return 'L'
  if (v === 'leave') return 'Lv'
  if (v === 'holiday') return 'H'
  if (v) return 'P'
  return '–'
}
const dayStatus = (iso: string | null) => {
  if (!iso) return ''
  return staffRecords.value.find((r) => r.date === iso)?.status ?? ''
}

// ---- per-day attendance adjustment ----
const selectedDay = ref<string | null>(null)
const dayBusy = ref(false)
const dayError = ref('')
const dayStatuses: { value: string; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'leave', label: 'Leave' },
  { value: 'holiday', label: 'Holiday' },
]
function openDay(iso: string): void {
  if (!iso) return
  selectedDay.value = iso
  dayError.value = ''
}
function closeDay(): void {
  selectedDay.value = null
  dayError.value = ''
}
async function setDayStatus(status: string): Promise<void> {
  const s = sheet.value
  const iso = selectedDay.value
  if (!s || !iso) return
  dayBusy.value = true
  dayError.value = ''
  try {
    // 1. Upsert StaffAttendance for this teacher + day.
    await attendanceService.saveStaff(iso, [{ teacherId: s.teacherId, status: status as never }])
    // 2. If marked leave, best-effort create an approved, salary-deductible Leave
    //    record so the salary sheet's leave days/deduction reflect it.
    if (status === 'leave') {
      try {
        const lr = await payrollService.applyLeave({
          teacherId: s.teacherId,
          type: 'leave',
          startDate: iso,
          endDate: iso,
          note: 'Admin adjustment from salary sheet',
        })
        const leaveId = (lr.data as { id?: string } | null)?.id
        if (leaveId) {
          await payrollService.updateLeave(leaveId, { salaryDeductible: true })
          await payrollService.setLeaveStatus(leaveId, 'approved')
        }
      } catch {
        // best-effort; ignore (e.g. duplicate)
      }
    }
    // 3. Refresh calendar.
    await fetchAttendance()
    // 4. Recompute attendance counts + late cut from backend draft and patch
    //    the saved salary record so the page reflects the change.
    const draftRes = await payrollService.sheetDraft(s.month, s.year)
    const teacherRow = (draftRes.data?.rows ?? []).find((r) => r.teacherId === s.teacherId)
    const absentDays = teacherRow?.absent ?? staffRecords.value.filter((r) => r.status === 'absent' || r.status === 'leave').length
    const perDay = (num(s.basic) + num(s.allowance)) / 30
    const absentDed = Math.round(perDay * absentDays)  // whole taka (no paisa)
    let finalDeduction = Math.round((teacherRow?.suggestedDeduction ?? 0) + absentDed)
    if (teacherRow) {
      await updateSalary({
        presentDays: teacherRow.present,
        absentDays: teacherRow.absent,
        lateDays: teacherRow.late,
        lateCutDays: teacherRow.lateCutDays,
        lateDeduction: Math.round(teacherRow.lateDeduction ?? 0),
        deduction: finalDeduction,
      })
    } else {
      const present = staffRecords.value.filter((r) => r.status === 'present').length
      const late = staffRecords.value.filter((r) => r.status === 'late').length
      await updateSalary({ presentDays: present, absentDays: absentDays, lateDays: late, deduction: finalDeduction })
    }
    form.deduction = finalDeduction
    toast.success(`Marked ${status} · Deduction ৳${finalDeduction}`)
    closeDay()
  } catch (e) {
    dayError.value = e instanceof Error ? e.message : 'Update failed'
  } finally {
    dayBusy.value = false
  }
}

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
const absentDeduction = computed(() => {
  const s = sheet.value
  if (!s) return 0
  const absent = num(s.absentDays)
  if (absent <= 0) return 0
  const perDay = (num(s.basic) + num(s.allowance)) / 30
  return Math.round(perDay * absent)  // whole taka
})

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
.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-top: var(--spacing-sm);
}
.calendar__weekday {
  text-align: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  padding: 4px 0;
}
.calendar__cell {
  min-height: 46px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-xs);
  cursor: pointer;
}
.calendar__cell:hover:not(.calendar__cell--empty) {
  outline: 1px solid var(--color-primary);
}
.calendar__cell--empty {
  border-color: transparent;
  background: transparent;
  cursor: default;
}
.calendar__cell--today {
  outline: 2px solid var(--color-primary);
}
.calendar__cell--present { background: var(--color-success-light, #e6f4ea); }
.calendar__cell--absent { background: var(--color-danger-light, #fce8e6); }
.calendar__cell--late { background: var(--color-warning-light, #fef7e0); }
.calendar__cell--off { background: var(--color-surface-alt, #f1f3f4); }
.calendar__cell--none { background: var(--color-surface); }
.calendar__day {
  font-weight: var(--font-weight-semibold);
}
.calendar__status {
  font-size: 10px;
  text-transform: uppercase;
}
.calendar__status--short { font-weight: var(--font-weight-bold); }
.calendar__time {
  font-size: 9px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.calendar-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
.calendar-legend span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.dot--present { background: var(--color-success, #34a853); }
.dot--absent { background: var(--color-danger, #ea4335); }
.dot--late { background: var(--color-warning, #fbbc04); }
.dot--off { background: var(--color-text-muted, #9aa0a6); }
.dot--none { background: var(--color-border, #dadce0); }
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
  width: min(420px, 100%);
}
.modal__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-md);
}
.status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
  margin: var(--spacing-md) 0;
}
.status-btn {
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  cursor: pointer;
  font-size: var(--font-size-sm);
}
.status-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}
.small {
  font-size: var(--font-size-xs);
}
</style>