<template>
  <div class="page">
    <div class="page__head">
      <div>
        <button class="link-btn" type="button" @click="router.back()">← Payroll</button>
        <h1 class="page__title">{{ teacher?.name || 'Staff Attendance' }}</h1>
        <p v-if="teacher" class="muted">{{ teacher.designation || teacher.kind }} · {{ teacher.kind }}</p>
      </div>
    </div>

    <AppCard title="Month">
      <div class="month-row">
        <label>Month
          <select v-model="month" class="app-input__control">
            <option v-for="(label, i) in MONTHS" :key="i + 1" :value="`${year}-${String(i + 1).padStart(2, '0')}`">
              {{ label }} {{ year }}
            </option>
          </select>
        </label>
        <label>Year<input v-model.number="year" type="number" class="app-input__control" /></label>
      </div>
    </AppCard>

    <AppCard title="Summary">
      <div v-if="loading" class="sk-stack"><AppSkeleton variant="lines" :lines="4" /></div>
      <dl v-else class="breakdown">
        <div><dt>Present</dt><dd>{{ summary.present }} day(s)</dd></div>
        <div><dt>Absent</dt><dd>{{ summary.absent }} day(s)</dd></div>
        <div><dt>Late</dt><dd>{{ summary.late }} day(s)</dd></div>
        <div><dt>Leave</dt><dd>{{ summary.leave }} day(s)</dd></div>
        <div><dt>Holiday</dt><dd>{{ summary.holiday }} day(s)</dd></div>
        <div><dt>Total recorded</dt><dd>{{ summary.total }} day(s)</dd></div>
      </dl>
    </AppCard>

    <AppCard title="Attendance Calendar">
      <AppSkeleton v-if="loading" variant="lines" :lines="6" />
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
        >
          <span class="calendar__day">{{ cell.day || '' }}</span>
          <span v-if="cell.iso" class="calendar__status calendar__status--short">{{ statusShort(cell.status) }}</span>
          <span v-if="cell.iso && (cell.entryTime || cell.exitTime)" class="calendar__time">
            {{ cell.entryTime || '—' }}{{ cell.exitTime ? ' → ' + cell.exitTime : '' }}
          </span>
        </div>
      </div>
      <div v-if="!loading" class="calendar-legend">
        <span><i class="dot dot--present" /> Present</span>
        <span><i class="dot dot--absent" /> Absent</span>
        <span><i class="dot dot--late" /> Late</span>
        <span><i class="dot dot--off" /> Leave/Holiday</span>
        <span><i class="dot dot--none" /> No record</span>
      </div>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import { attendanceService, teacherService } from '@/services'
import type { Teacher } from '@/types/models'

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id || ''))

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

const teacher = ref<Teacher | null>(null)
const records = ref<{ teacherId: string; status: string; date: string; entryTime?: string; exitTime?: string }[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await teacherService.get(id.value)
    teacher.value = res.data ?? null
  } catch {
    teacher.value = null
  }
})

async function fetchRecords(): Promise<void> {
  loading.value = true
  try {
    const res = await attendanceService.staffMonthly(month.value)
    const raw = (res.data ?? []) as { teacherId: string; status: string; date: string; entryTime?: string; exitTime?: string }[]
    records.value = raw.filter((r) => r.teacherId === id.value)
  } catch {
    records.value = []
  } finally {
    loading.value = false
  }
}
watch(month, () => void fetchRecords(), { immediate: true })

const summary = computed(() => {
  const s = { present: 0, absent: 0, late: 0, leave: 0, holiday: 0, total: 0 }
  for (const r of records.value) {
    if (r.status === 'present') s.present += 1
    else if (r.status === 'absent') s.absent += 1
    else if (r.status === 'late') s.late += 1
    else if (r.status === 'leave') s.leave += 1
    else if (r.status === 'holiday') s.holiday += 1
    s.total += 1
  }
  return s
})

const calendarCells = computed(() => {
  if (!/^\d{4}-\d{2}$/.test(month.value)) return []
  const [y = 0, m = 0] = month.value.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const daysInMonth = new Date(y, m, 0).getDate()
  const statusByDate: Record<string, string> = {}
  const timeByDate: Record<string, { entry?: string; exit?: string }> = {}
  for (const r of records.value) {
    if (!r.date.startsWith(month.value)) continue
    statusByDate[r.date] = r.status
    if (r.entryTime || r.exitTime) timeByDate[r.date] = { entry: r.entryTime, exit: r.exitTime }
  }
  const cells: Array<{ day: number; iso: string; status?: string; entryTime?: string; exitTime?: string; isToday: boolean }> = []
  for (let i = 0; i < first.getDay(); i += 1) cells.push({ day: 0, iso: '', isToday: false })
  const todayIso = new Date().toISOString().slice(0, 10)
  for (let d = 1; d <= daysInMonth; d += 1) {
    const iso = `${month.value}-${String(d).padStart(2, '0')}`
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
</script>

<style scoped>
.page__head { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--spacing-md); margin-bottom: var(--spacing-md); flex-wrap: wrap; }
.page__title { font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin: 0; }
.muted { color: var(--color-text-muted); font-size: var(--font-size-sm); }
.head-actions { display: flex; gap: var(--spacing-sm); }
.month-row { display: flex; gap: var(--spacing-md); flex-wrap: wrap; align-items: flex-end; margin-bottom: var(--spacing-md); }
.month-row label { display: flex; flex-direction: column; gap: var(--spacing-xs); font-size: var(--font-size-sm); }
.breakdown { margin: 0; }
.breakdown > div { display: flex; justify-content: space-between; gap: var(--spacing-sm); padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--color-border); font-size: var(--font-size-sm); }
.breakdown dt { color: var(--color-text-muted); }
.breakdown dd { margin: 0; font-weight: var(--font-weight-semibold); }
.sk-stack { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-top: var(--spacing-sm); }
.calendar__weekday { text-align: center; font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-text-muted); padding: 4px 0; }
.calendar__cell { min-height: 46px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 4px; display: flex; flex-direction: column; gap: 2px; font-size: var(--font-size-xs); }
.calendar__cell--empty { border-color: transparent; background: transparent; }
.calendar__cell--today { outline: 2px solid var(--color-primary); }
.calendar__cell--present { background: var(--color-success-light, #e6f4ea); }
.calendar__cell--absent { background: var(--color-danger-light, #fce8e6); }
.calendar__cell--late { background: var(--color-warning-light, #fef7e0); }
.calendar__cell--off { background: var(--color-surface-alt, #f1f3f4); }
.calendar__cell--none { background: var(--color-surface); }
.calendar__day { font-weight: var(--font-weight-semibold); }
.calendar__status { font-size: 10px; text-transform: uppercase; }
.calendar__status--short { font-weight: var(--font-weight-bold); }
.calendar__time { font-size: 9px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.calendar-legend { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); margin-top: var(--spacing-md); font-size: var(--font-size-xs); color: var(--color-text-muted); }
.calendar-legend span { display: inline-flex; align-items: center; gap: 4px; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot--present { background: var(--color-success, #34a853); }
.dot--absent { background: var(--color-danger, #ea4335); }
.dot--late { background: var(--color-warning, #fbbc04); }
.dot--off { background: var(--color-text-muted, #9aa0a6); }
.dot--none { background: var(--color-border, #dadce0); }
</style>
