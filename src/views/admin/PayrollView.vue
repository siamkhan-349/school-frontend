<template>
  <div class="page">
    <h1 class="page__title">Payroll</h1>

    <div class="tabs">
      <button :class="['tab', { 'tab--active': tab === 'salary' }]" type="button" @click="tab = 'salary'">
        Salary
      </button>
      <button :class="['tab', { 'tab--active': tab === 'attendance' }]" type="button" @click="tab = 'attendance'">
        Teacher Attendance
      </button>
      <button :class="['tab', { 'tab--active': tab === 'leaves' }]" type="button" @click="tab = 'leaves'">
        Leaves
      </button>
    </div>

    <!-- Salary -->
    <template v-if="tab === 'salary'">
      <AppCard title="Monthly Salary Sheet" class="sheet-card">
        <div class="month-row">
          <label>Month
            <select v-model.number="sheetMonth" class="app-input__control">
              <option v-for="(label, i) in MONTHS" :key="i + 1" :value="i + 1">{{ label }}</option>
            </select>
          </label>
          <label>Year<input v-model.number="sheetYear" type="number" class="app-input__control" /></label>
          <AppButton type="button" @click="openMonthSheet">
            Open sheet
          </AppButton>
        </div>
        <p class="hint">Open the month to review every teacher & staff row — fix where needed, then Save creates the sheets.</p>
      </AppCard>
      <div class="grid">
        <AppCard title="Saved Sheets" class="full-row">
          <p v-if="salLoading" class="muted">Loading…</p>
          <table v-else class="table">
            <thead>
              <tr><th>Period</th><th>Sheets</th><th>Total Net (৳)</th><th>Paid</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="g in sheetGroups" :key="`${g.year}-${g.month}`" class="clickable-row" @click="openMonthSheetOf(g.year, g.month)">
                <td>{{ periodLabel(g.month, g.year) }}</td>
                <td>{{ g.count }}</td>
                <td><strong>{{ g.totalNet }}</strong></td>
                <td>{{ g.paidCount }} / {{ g.count }}</td>
                <td class="row-actions-cell">
                  <span class="row-actions">
                    <button class="link-btn" type="button" @click.stop="openMonthSheetOf(g.year, g.month)">Open</button>
                  </span>
                </td>
              </tr>
              <tr v-if="sheetGroups.length === 0">
                <td colspan="5" class="muted">No saved sheets yet — open a month above to create the first one.</td>
              </tr>
            </tbody>
          </table>
        </AppCard>
      </div>
    </template>

    <!-- Teacher attendance: step 1 date, step 2 roster -->
    <template v-if="tab === 'attendance'">
      <AppCard v-if="attStep === 1" title="Step 1 — Pick a date">
        <div class="month-row">
          <label>Date<input v-model="staffDate" type="date" class="app-input__control" /></label>
          <AppButton type="button" :disabled="!staffDate" @click="attStep = 2">Next</AppButton>
        </div>
      </AppCard>
      <AppCard v-else :title="`Step 2 — Mark attendance (${staffDate})`">
        <div class="step-actions">
          <AppButton variant="ghost" type="button" @click="attStep = 1">← Change date</AppButton>
          <AppButton :disabled="staffSaving" @click="saveStaff">{{ staffSaving ? 'Saving…' : `Save ${staffDate}` }}</AppButton>
        </div>
        <p v-if="staffLoading" class="muted">Loading…</p>
        <table v-else class="table">
          <thead>
            <tr><th>Name</th><th>Designation</th><th>Status</th><th>Entry</th><th>Exit</th></tr>
          </thead>
          <tbody>
            <tr v-for="t in teachers" :key="t.id">
              <td>{{ t.name }}</td>
              <td>{{ t.designation }}</td>
              <td>
                <div class="status-btns">
                  <button
                    v-for="st in STATUSES"
                    :key="st"
                    type="button"
                    :class="['st', `st--${st}`, { 'st--on': staffMarks[t.id] === st }]"
                    @click="setStaffStatus(t.id, st)"
                  >
                    {{ st }}
                  </button>
                </div>
              </td>
              <td>
                <input
                  v-model="staffEntry[t.id]"
                  type="time"
                  class="app-input__control time"
                  :disabled="!showStaffTimes(t.id)"
                />
              </td>
              <td>
                <input
                  v-model="staffExit[t.id]"
                  type="time"
                  class="app-input__control time"
                  :disabled="!showStaffTimes(t.id)"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <div class="step-actions step-actions--bottom">
          <AppButton variant="ghost" type="button" @click="attStep = 1">← Change date</AppButton>
          <AppButton :disabled="staffSaving" @click="saveStaff">{{ staffSaving ? 'Saving…' : `Save ${staffDate}` }}</AppButton>
        </div>
      </AppCard>
    </template>

    <!-- Leaves -->
    <template v-else-if="tab === 'leaves'">
      <AppCard title="Leave Requests">
        <p v-if="leaveLoading" class="muted">Loading…</p>
        <table v-else class="table">
          <thead>
            <tr><th>Teacher</th><th>Type</th><th>From → To</th><th>Days</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="l in leaves" :key="l.id">
              <td>{{ l.teacherName }}</td>
              <td>{{ l.type }}</td>
              <td>{{ l.startDate }} → {{ l.endDate }}</td>
              <td>{{ l.days }}</td>
              <td><span class="chip">{{ l.status }}</span></td>
              <td class="row-actions-cell">
                <span class="row-actions">
                <template v-if="l.status === 'pending'">
                  <button class="link-btn" type="button" @click="decide(l.id, 'approved')">Approve</button>
                  <button class="link-btn link-btn--danger" type="button" @click="decide(l.id, 'rejected')">Reject</button>
                </template>
                </span>
              </td>
            </tr>
            <tr v-if="leaves.length === 0">
              <td colspan="6" class="muted">No leave requests.</td>
            </tr>
          </tbody>
        </table>
      </AppCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import {
  useLeaves,
  useLeaveStatus,
  useSalaries,
  useSaveStaffAttendance,
  useStaffAttendance,
  useTeachers,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import type { AttendanceStatus, LeaveStatus } from '@/types/models'

const toast = useToast()
const route = useRoute()
const router = useRouter()
const tab = ref<'salary' | 'attendance' | 'leaves'>(
  route.query.tab === 'attendance' ? 'attendance' : route.query.tab === 'leaves' ? 'leaves' : 'salary',
)
watch(tab, (t) => {
  router.replace({ query: { ...route.query, tab: t } })
})

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'leave', 'holiday']
const today = (): string => new Date().toISOString().slice(0, 10)
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const monthName = (m: number): string => MONTHS[m - 1] ?? `Month ${m}`
const periodLabel = (m: number, y: number): string => `${monthName(m)} ${y}`

const { data: teacherData } = useTeachers({ perPage: 500 })
const teachers = computed(() => teacherData.value?.data.items ?? [])

const now = new Date()
const todayStr = (): string => new Date().toISOString().slice(0, 10)
const num = (v: unknown): number => Number(v) || 0
// Monthly sheet defaults to last month (sheets are made from the 1st).
const lastMonth = (): { month: number; year: number } => {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { month: d.getMonth() + 1, year: d.getFullYear() }
}
const sheetMonth = ref(lastMonth().month)
const sheetYear = ref(lastMonth().year)

function openMonthSheet(): void {
  router.push(`/admin/payroll/sheet/${sheetYear.value}/${sheetMonth.value}`)
}

const { data: salData, isLoading: salLoading } = useSalaries(
  () => undefined,
  () => undefined,
)
// Saved sheets grouped by month — one row per month, click opens details.
const sheetGroups = computed(() => {
  const map = new Map<string, {
    month: number; year: number; count: number; totalNet: number; paidCount: number;
  }>()
  for (const s of salData.value?.data ?? []) {
    const key = `${s.year}-${s.month}`
    const g = map.get(key) ?? { month: s.month, year: s.year, count: 0, totalNet: 0, paidCount: 0 }
    g.count += 1
    g.totalNet += num(s.net)
    if (s.status === 'paid') g.paidCount += 1
    map.set(key, g)
  }
  return [...map.values()].sort((a, b) => b.year - a.year || b.month - a.month)
})

function openMonthSheetOf(year: number, month: number): void {
  router.push(`/admin/payroll/sheet/${year}/${month}`)
}

const { data: leaveData, isLoading: leaveLoading } = useLeaves()
const leaves = computed(() => leaveData.value?.data ?? [])
const { mutateAsync: setLeaveStatus } = useLeaveStatus()
async function decide(id: string, status: LeaveStatus): Promise<void> {
  try {
    await setLeaveStatus({ id, status })
    toast.success(`Leave ${status}`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}

// ---------- teacher attendance (2 steps: date first, roster next) ----------
const attStep = ref(1)
const staffDate = ref(today())
watch(staffDate, () => {
  attStep.value = 1
})
const { data: staffAttData, isLoading: staffLoading } = useStaffAttendance(() => staffDate.value)

const staffMarks = reactive<Record<string, AttendanceStatus>>({})
const staffEntry = reactive<Record<string, string>>({})
const staffExit = reactive<Record<string, string>>({})
watch(
  [staffAttData, teacherData],
  () => {
    const saved = Object.fromEntries((staffAttData.value?.data ?? []).map((m) => [m.teacherId, m]))
    for (const t of teachers.value) {
      staffMarks[t.id] = (saved[t.id]?.status ?? 'present') as AttendanceStatus
      staffEntry[t.id] = saved[t.id]?.entryTime ?? staffEntry[t.id] ?? ''
      staffExit[t.id] = saved[t.id]?.exitTime ?? staffExit[t.id] ?? ''
    }
  },
  { immediate: true },
)

function showStaffTimes(id: string): boolean {
  const st = staffMarks[id] ?? 'present'
  return st === 'present' || st === 'late'
}

function setStaffStatus(id: string, st: AttendanceStatus): void {
  staffMarks[id] = st
  if (!showStaffTimes(id)) {
    staffEntry[id] = ''
    staffExit[id] = ''
  }
}

const { mutateAsync: saveStaffMarks, isPending: staffSaving } = useSaveStaffAttendance()
async function saveStaff(): Promise<void> {
  try {
    await saveStaffMarks({
      date: staffDate.value,
      marks: teachers.value.map((t) => {
        const status = staffMarks[t.id] ?? 'present'
        const timed = status === 'present' || status === 'late'
        return {
          teacherId: t.id,
          status,
          ...(timed && staffEntry[t.id] ? { entryTime: staffEntry[t.id] } : {}),
          ...(timed && staffExit[t.id] ? { exitTime: staffExit[t.id] } : {}),
        }
      }),
    })
    toast.success('Staff attendance saved')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}
</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-md);
}
.tabs {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}
.tab {
  height: 36px;
  padding: 0 var(--spacing-md);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
}
.tab--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-primary-contrast);
}
.grid {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: var(--spacing-md);
  align-items: start;
}
.full-row {
  grid-column: 1 / -1;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
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
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
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
.status-btns {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}
.st {
  height: 28px;
  padding: 0 var(--spacing-sm);
  font-size: var(--font-size-xs);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  text-transform: capitalize;
  cursor: pointer;
}
.st--on {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-primary-contrast);
}
.time {
  max-width: 120px;
}
.time:disabled {
  opacity: 0.4;
}
.chip {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  font-size: var(--font-size-xs);
  text-transform: capitalize;
}
.context-box {
  background: var(--color-background);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
}
.context-line {
  margin: 2px 0;
}
.totals {
  margin-top: var(--spacing-sm);
  font-weight: var(--font-weight-semibold);
}
.clickable-row {
  cursor: pointer;
}
.clickable-row:hover td {
  background: var(--color-background);
}
.sheet-card {
  margin-bottom: var(--spacing-md);
}
.month-row {
  display: flex;
  gap: var(--spacing-sm);
  align-items: flex-end;
}
.step-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}
.step-actions--bottom {
  margin-top: var(--spacing-md);
  margin-bottom: 0;
}
.month-row label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  min-width: 120px;
}
.hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-top: var(--spacing-xs);
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
</style>
