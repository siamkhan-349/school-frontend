<template>
  <div class="att-detail">
    <header class="page-header">
      <button type="button" class="page-header__back" @click="goBack">← Back to attendance</button>
      <div class="page-header__row">
        <div>
          <h1 class="page-header__title">{{ memberName }}</h1>
          <p class="page-header__subtitle">{{ subtitle }}</p>
        </div>
        <span class="page-header__badge">Student</span>
      </div>
    </header>

    <p v-if="historyLoading && allRecords.length === 0" class="muted">Loading attendance…</p>
    <p v-else-if="historyError && allRecords.length === 0" class="error">
      Attendance load hoyni ({{ historyError }}). Internet/backend check kore
      <button type="button" class="link-btn" @click="refetchHistory">try again</button>.
    </p>

    <template v-else>
      <div class="summary-cards">
        <div class="summary-card summary-card--present">
          <span class="summary-card__value">{{ allTime.present }}</span>
          <span class="summary-card__label">Present</span>
        </div>
        <div class="summary-card summary-card--late">
          <span class="summary-card__value">{{ allTime.late }}</span>
          <span class="summary-card__label">Late</span>
        </div>
        <div class="summary-card summary-card--absent">
          <span class="summary-card__value">{{ allTime.absent }}</span>
          <span class="summary-card__label">Absent</span>
        </div>
        <div class="summary-card">
          <span class="summary-card__value">{{ allTime.timed }}</span>
          <span class="summary-card__label">Entry timed</span>
        </div>
        <div class="summary-card summary-card--total">
          <span class="summary-card__value">{{ allTime.total }}</span>
          <span class="summary-card__label">Total days</span>
        </div>
        <div class="summary-card summary-card--percent">
          <span class="summary-card__value">{{ allTime.percentage }}%</span>
          <span class="summary-card__label">Attendance</span>
        </div>
      </div>

      <AppCard>
        <div class="att-detail__filters">
          <div class="att-detail__month-nav">
            <AppButton variant="ghost" type="button" aria-label="Previous month" @click="shiftMonth(-1)">←</AppButton>
            <div class="att-detail__month-picker">
              <label class="form-field__label" for="att-detail-month">Month</label>
              <input id="att-detail-month" v-model="month" type="month" class="app-input__control" />
            </div>
            <AppButton variant="ghost" type="button" aria-label="Next month" @click="shiftMonth(1)">→</AppButton>
          </div>

          <div class="att-detail__day-picker">
            <label class="form-field__label" for="att-detail-day">Specific date</label>
            <div class="att-detail__day-row">
              <input id="att-detail-day" v-model="dayFilter" type="date" class="app-input__control" />
              <button v-if="dayFilter" type="button" class="link-btn" @click="dayFilter = ''">Clear</button>
            </div>
          </div>

          <div v-if="availableMonths.length" class="att-detail__months">
            <label class="form-field__label" for="att-detail-month-select">Jump to</label>
            <select
              id="att-detail-month-select"
              class="app-input__control"
              :value="month"
              @change="dayFilter = ''; month = ($event.target as HTMLSelectElement).value"
            >
              <option v-for="m in availableMonths" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
        </div>

        <div class="att-detail__legend">
          <span class="legend-item"><span class="legend-dot legend-dot--present"></span> Present</span>
          <span class="legend-item"><span class="legend-dot legend-dot--late"></span> Late</span>
          <span class="legend-item"><span class="legend-dot legend-dot--absent"></span> Absent</span>
          <span class="legend-item"><span class="legend-dot"></span> No record</span>
        </div>

        <div class="att-detail__month-stats">
          <span>This month: {{ stats.present }} present</span>
          <span>{{ stats.late }} late</span>
          <span>{{ stats.absent }} absent</span>
          <span>{{ stats.total }} days</span>
          <span class="att-detail__month-percent">{{ stats.percentage }}%</span>
        </div>

        <div class="calendar">
          <div v-for="day in WEEKDAYS" :key="day" class="calendar__weekday">{{ day }}</div>
          <button
            v-for="(cell, index) in calendarCells"
            :key="`${cell.iso || 'empty'}-${index}`"
            type="button"
            class="calendar__cell"
            :class="[
              cell.day === 0 ? 'calendar__cell--empty' : '',
              statusClass(cell.status),
              cell.isToday ? 'calendar__cell--today' : '',
              dayFilter === cell.iso ? 'calendar__cell--selected' : '',
            ]"
            :disabled="cell.day === 0"
            :title="cell.iso ? `${formatDay(cell.iso)} · ${statusLabel(cell.status)}` : ''"
            @click="toggleDay(cell)"
          >
            <span class="calendar__day">{{ cell.day || '' }}</span>
            <span v-if="cell.iso" class="calendar__status calendar__status--full">{{ statusLabel(cell.status) }}</span>
            <span v-if="cell.iso" class="calendar__status calendar__status--short">{{ statusShort(cell.status) }}</span>
            <span v-if="cell.iso && (cell.entryTime || cell.exitTime)" class="calendar__time">
              {{ cell.entryTime || '–' }}–{{ cell.exitTime || '–' }}
            </span>
          </button>
        </div>

        <div v-if="dayFilter" class="att-detail__day-note">
          Showing only {{ formatDay(dayFilter) }}.
          <button type="button" class="att-detail__day-clear" @click="dayFilter = ''">Show whole month</button>
        </div>
      </AppCard>

      <AppCard title="Recorded days">
        <div v-if="filteredRecords.length === 0" class="att-detail__state">
          <p v-if="allRecords.length === 0">{{ memberName }} has no attendance records in the backend yet — mark attendance from <strong>/admin/attendance</strong> first, then check back here.</p>
          <p v-else>No attendance records for this period.</p>
        </div>
        <div v-else class="att-detail__table-wrap">
          <table class="att-detail__table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Status</th>
                <th scope="col">Entry time</th>
                <th scope="col">Exit time</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(record, index) in filteredRecords" :key="`${record.date}-${index}`">
                <td class="att-detail__date">{{ formatDay(record.date) }}</td>
                <td>
                  <span class="att-detail__status" :class="recordStatusClass(record.status)">
                    {{ record.status.toLowerCase() }}
                  </span>
                </td>
                <td class="att-detail__time">{{ formatTime(record.entryTime) }}</td>
                <td class="att-detail__time">{{ formatTime(record.exitTime) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import {
  useClasses,
  useDepartments,
  useSections,
  useStudent,
  useStudentAttendanceHistory,
} from '@/composables/useQueries'

const route = useRoute()
const router = useRouter()

const studentId = computed(() => String(route.params.id || ''))
const queryName = computed(() => String(route.query.name || ''))

const { data: studentInfoData } = useStudent(studentId)
const { data: historyData, isLoading: historyLoading, isError: historyFailed, error: historyErr, refetch: refetchHistory } = useStudentAttendanceHistory(studentId)
// NOTE: `student` must be declared BEFORE useSections/useDepartments —
// their key resolvers read it eagerly, otherwise TDZ ReferenceError.
const student = computed(() => studentInfoData.value?.data)
const historyError = computed(() => {
  if (!historyFailed.value) return ''
  const msg = historyErr.value instanceof Error ? historyErr.value.message : 'Failed to load'
  return msg
})

const { data: classData } = useClasses()
const { data: sectionData } = useSections(() => student.value?.classId || undefined)
const { data: deptData } = useDepartments(() => student.value?.classId || undefined)

const memberName = computed(() => queryName.value || student.value?.name || studentId.value)
const subtitle = computed(() => {
  const s = student.value
  if (!s) return 'Student'
  const parts = [classData.value?.data.find((c) => c.id === s.classId)?.label ?? '']
  const section = sectionData.value?.data.find((x) => x.id === s.sectionId)?.label
  if (section) parts.push(`Section ${section}`)
  const dept = deptData.value?.data.find((d) => d.id === s.departmentId)?.label
  if (dept) parts.push(dept)
  if (s.roll) parts.push(`Roll ${s.roll}`)
  return parts.filter(Boolean).join(' · ')
})

const goBack = () => router.push({ path: '/admin/attendance', query: { tab: 'student' } })

const today = () => new Date().toISOString().slice(0, 10)

interface DayRecord {
  date: string
  status: string
  entryTime?: string
  exitTime?: string
}

const allRecords = computed<DayRecord[]>(() =>
  (historyData.value?.data ?? []).map((r) => ({
    date: r.date ?? '',
    status: String(r.status ?? ''),
    entryTime: r.entryTime ? String(r.entryTime).slice(0, 5) : undefined,
    exitTime: r.exitTime ? String(r.exitTime).slice(0, 5) : undefined,
  })).filter((r) => r.date),
)

const month = ref(today().slice(0, 7))
const dayFilter = ref('')

const availableMonths = computed(() =>
  [...new Set(allRecords.value.map((r) => r.date.slice(0, 7)))].sort(),
)

watch(
  availableMonths,
  (months) => {
    const last = months[months.length - 1]
    if (last && !months.includes(month.value)) {
      month.value = last
    }
  },
  { immediate: true },
)

const filteredRecords = computed(() =>
  allRecords.value
    .filter((r) => {
      if (!r.date.startsWith(month.value)) return false
      if (dayFilter.value) return r.date === dayFilter.value
      return true
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date))),
)

const isPresentDay = (status?: string) => {
  const v = String(status || '').toLowerCase()
  return v === 'present' || v === 'late'
}

function summarize(rows: DayRecord[]) {
  const present = rows.filter((r) => String(r.status).toLowerCase() === 'present').length
  const late = rows.filter((r) => String(r.status).toLowerCase() === 'late').length
  const absent = rows.filter((r) => String(r.status).toLowerCase() === 'absent').length
  const timed = rows.filter((r) => r.entryTime).length
  const total = present + late + absent
  return {
    present,
    late,
    absent,
    timed,
    total,
    percentage: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
  }
}

const stats = computed(() => summarize(filteredRecords.value))
const allTime = computed(() => summarize(allRecords.value))

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const calendarCells = computed(() => {
  if (!/^\d{4}-\d{2}$/.test(month.value)) return []
  const [year = 0, m = 0] = month.value.split('-').map(Number)
  const first = new Date(year, m - 1, 1)
  const daysInMonth = new Date(year, m, 0).getDate()
  const statusByDate: Record<string, string> = {}
  const timeByDate: Record<string, { entry?: string; exit?: string }> = {}
  for (const r of allRecords.value) {
    if (!r.date.startsWith(month.value)) continue
    statusByDate[r.date] = r.status
    if (r.entryTime || r.exitTime) timeByDate[r.date] = { entry: r.entryTime, exit: r.exitTime }
  }
  const cells: Array<{
    day: number
    iso: string
    status?: string
    entryTime?: string
    exitTime?: string
    isToday: boolean
  }> = []
  for (let i = 0; i < first.getDay(); i += 1) cells.push({ day: 0, iso: '', isToday: false })
  for (let d = 1; d <= daysInMonth; d += 1) {
    const iso = `${month.value}-${String(d).padStart(2, '0')}`
    cells.push({
      day: d,
      iso,
      status: statusByDate[iso],
      entryTime: timeByDate[iso]?.entry,
      exitTime: timeByDate[iso]?.exit,
      isToday: iso === today(),
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

const statusLabel = (status?: string) => String(status || '').toLowerCase() || 'no record'

const statusShort = (status?: string) => {
  const v = String(status || '').toLowerCase()
  if (v === 'absent') return 'A'
  if (v === 'late') return 'L'
  if (v === 'leave') return 'Lv'
  if (v === 'holiday') return 'H'
  if (v) return 'P'
  return '–'
}

const shiftMonth = (delta: number) => {
  const [year = 0, m = 0] = month.value.split('-').map(Number)
  const date = new Date(year, m - 1 + delta, 1)
  month.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const toggleDay = (cell: { iso: string }) => {
  if (!cell.iso) return
  dayFilter.value = dayFilter.value === cell.iso ? '' : cell.iso
}

const formatDay = (iso: string) => {
  const date = new Date(`${iso}T00:00:00`)
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

const recordStatusClass = (status: string) => {
  const v = String(status || '').toLowerCase()
  if (v === 'absent') return 'is-absent'
  if (v === 'late') return 'is-late'
  if (v === 'leave' || v === 'holiday') return 'is-off'
  return 'is-present'
}

const formatTime = (time?: string) => time || '—'
</script>

<style scoped>
.att-detail {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}
.page-header__back {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 6px var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  font-family: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.page-header__back:hover {
  color: var(--color-text);
  background: var(--color-surface);
}
.page-header__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}
.page-header__title {
  font-size: var(--font-size-2xl);
  margin: 0;
}
.page-header__subtitle {
  color: var(--color-text-secondary);
  margin: var(--spacing-xs) 0 0;
}
.page-header__badge {
  display: inline-block;
  padding: 4px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: capitalize;
  background: var(--color-primary-light);
  color: var(--color-primary-active);
}
.muted {
  color: var(--color-text-muted);
}
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--spacing-md);
}
.summary-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.summary-card__value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
}
.summary-card__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}
.summary-card--present .summary-card__value {
  color: var(--color-success);
}
.summary-card--absent .summary-card__value {
  color: var(--color-danger);
}
.summary-card--late .summary-card__value {
  color: var(--color-warning);
}
.summary-card--percent .summary-card__value {
  color: var(--color-primary);
}
.att-detail__filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--spacing-md);
  align-items: end;
}
.att-detail__month-nav {
  display: flex;
  align-items: end;
  gap: var(--spacing-sm);
}
.att-detail__month-picker,
.att-detail__day-picker {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.form-field__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}
.att-detail__day-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  white-space: nowrap;
}
.att-detail__months {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.att-detail__legend {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  margin-top: var(--spacing-lg);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
}
.legend-dot--present {
  background: var(--color-success);
  border-color: var(--color-success);
}
.legend-dot--absent {
  background: var(--color-danger);
  border-color: var(--color-danger);
}
.legend-dot--late {
  background: var(--color-warning);
  border-color: var(--color-warning);
}
.att-detail__month-stats {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-surface-alt);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.att-detail__month-percent {
  color: var(--color-primary);
}
.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--spacing-xs);
  margin-top: var(--spacing-lg);
}
.calendar__weekday {
  padding: var(--spacing-xs);
  text-align: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}
.calendar__cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 64px;
  padding: var(--spacing-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-family: inherit;
  cursor: pointer;
}
.calendar__cell:hover:not(.calendar__cell--empty) {
  border-color: var(--color-primary);
}
.calendar__cell--empty {
  border: none;
  background: transparent;
  cursor: default;
}
.calendar__cell--today {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}
.calendar__cell--selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-focus-ring);
}
.calendar__cell--present {
  background: color-mix(in srgb, var(--color-success) 18%, var(--color-surface));
  border-color: var(--color-success);
}
.calendar__cell--absent {
  background: color-mix(in srgb, var(--color-danger) 18%, var(--color-surface));
  border-color: var(--color-danger);
}
.calendar__cell--late {
  background: color-mix(in srgb, var(--color-warning) 18%, var(--color-surface));
  border-color: var(--color-warning);
}
.calendar__cell--off {
  background: var(--color-surface-alt);
  border-color: var(--color-border);
  border-style: dashed;
}
.calendar__day {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}
.calendar__status {
  font-size: 10px;
  text-transform: capitalize;
  color: var(--color-text-secondary);
}
.calendar__status--short {
  display: none;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}
.calendar__time {
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
  white-space: nowrap;
}
@media (max-width: 640px) {
  .calendar {
    gap: 4px;
  }
  .calendar__weekday {
    padding: 2px 0;
  }
  .calendar__cell {
    min-height: 44px;
    padding: 4px 2px;
    gap: 0;
  }
  .calendar__day {
    font-size: var(--font-size-xs);
  }
  .calendar__status--full {
    display: none;
  }
  .calendar__status--short {
    display: inline;
  }
  .calendar__time {
    display: none;
  }
}
.att-detail__day-note {
  margin-top: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.att-detail__day-clear {
  margin-left: var(--spacing-xs);
  padding: 0;
  font-family: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  background: none;
  border: none;
  cursor: pointer;
}
.att-detail__day-clear:hover {
  text-decoration: underline;
}
.att-detail__state {
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--color-text-secondary);
}
.att-detail__table-wrap {
  overflow-x: auto;
}
.att-detail__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.att-detail__table th,
.att-detail__table td {
  text-align: left;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}
.att-detail__table thead th {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  background: var(--color-surface-alt);
}
.att-detail__table tbody tr:last-child td {
  border-bottom: none;
}
.att-detail__date {
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}
.att-detail__status {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: capitalize;
}
.att-detail__status.is-present {
  background: var(--color-success-light);
  color: var(--color-success);
}
.att-detail__status.is-absent {
  background: var(--color-danger-light);
  color: var(--color-danger);
}
.att-detail__status.is-late {
  background: var(--color-warning-light);
  color: var(--color-warning);
}
.att-detail__status.is-off {
  background: var(--color-surface-alt);
  color: var(--color-text-secondary);
}
</style>
