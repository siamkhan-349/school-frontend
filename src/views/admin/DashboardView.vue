<template>
  <div class="admin-dashboard">
    <div class="admin-dashboard__header">
      <div>
        <h1 class="admin-dashboard__title">{{ greeting }}, {{ userName }}</h1>
        <p class="admin-dashboard__subtitle">
          Here's what's happening at {{ schoolName }} today.
        </p>
      </div>
      <div class="admin-dashboard__actions">
        <RouterLink v-if="school.hasModule('payment')" to="/admin/fees/collect" class="action-link">
          <AppButton variant="ghost" type="button">Collect Fee</AppButton>
        </RouterLink>
        <RouterLink to="/admin/students/new" class="action-link">
          <AppButton type="button">+ Admit Student</AppButton>
        </RouterLink>
      </div>
    </div>

    <div v-if="isLoading" class="sk-stack">
      <div class="admin-dashboard__stats">
        <AppCard v-for="n in 5" :key="n">
          <AppSkeleton variant="lines" :lines="3" />
        </AppCard>
      </div>
      <AppCard class="panel-card">
        <AppSkeleton variant="lines" :lines="2" />
      </AppCard>
      <AppCard class="panel-card">
        <AppSkeleton variant="block" :height="'200px'" />
      </AppCard>
    </div>
    <p v-else-if="isError" class="error">Failed to load dashboard.</p>

    <div v-else class="admin-dashboard__stats">
      <AppCard v-for="stat in visibleStatCards" :key="stat.label">
        <RouterLink :to="stat.to" class="stat-card__link">
          <p class="stat-card__label">{{ stat.label }}</p>
          <p class="stat-card__value">{{ stat.value }}</p>
          <p class="stat-card__note">{{ stat.note }}</p>
        </RouterLink>
      </AppCard>
    </div>

    <AppCard v-if="!isLoading && !isError && school.hasModule('attendance')" class="panel-card">
      <div class="panel-card__header">
        <h2 class="panel-card__title">{{ stripTitle }}</h2>
        <div class="panel-card__tools">
          <input v-model="stripPicked" type="date" class="app-input__control strip-date" title="Pick a day" />
        </div>
      </div>
      <div class="att-strip" :class="{ 'att-strip--fetching': dayFetching }">
        <button type="button" class="att-chip att-chip--present" @click="openDrill('present')">
          <span class="att-chip__value">{{ todayCounts.present }}</span>
          <span class="att-chip__label">Present</span>
        </button>
        <button type="button" class="att-chip att-chip--absent" @click="openDrill('absent')">
          <span class="att-chip__value">{{ todayCounts.absent }}</span>
          <span class="att-chip__label">Absent</span>
        </button>
        <button type="button" class="att-chip att-chip--late" @click="openDrill('late')">
          <span class="att-chip__value">{{ todayCounts.late }}</span>
          <span class="att-chip__label">Late</span>
        </button>
        <button type="button" class="att-chip att-chip--leave" @click="openDrill('leave')">
          <span class="att-chip__value">{{ todayCounts.leave }}</span>
          <span class="att-chip__label">Leave</span>
        </button>
      </div>
      <p class="att-note">Click a card to open the full list page.</p>
    </AppCard>

    <div v-if="!isLoading && !isError" class="admin-dashboard__grid">
      <AppCard v-if="school.hasModule('payment') && collectionChart" class="panel-card">
        <div class="panel-card__header">
          <h2 class="panel-card__title">Collections — last 6 months</h2>
          <RouterLink to="/admin/reports" class="panel-card__link">Reports</RouterLink>
        </div>
        <div class="chart-canvas">
          <Bar :data="collectionChart" :options="chartOptions" />
        </div>
      </AppCard>

      <AppCard v-if="school.hasModule('attendance') && attendanceChart" class="panel-card">
        <div class="panel-card__header">
          <h2 class="panel-card__title">Attendance by class</h2>
          <RouterLink to="/admin/attendance" class="panel-card__link">Open</RouterLink>
        </div>
        <div class="chart-canvas">
          <Bar :data="attendanceChart" :options="rateChartOptions" />
        </div>
      </AppCard>

      <AppCard v-if="school.hasModule('payment')" class="panel-card">
        <div class="panel-card__header">
          <h2 class="panel-card__title">Top Dues</h2>
          <RouterLink to="/admin/fees/dues" class="panel-card__link">All</RouterLink>
        </div>
        <div v-if="topDueStudents.length" class="item-list">
          <div v-for="item in topDueStudents" :key="item.id" class="item-list__row">
            <StudentAvatar :photo-url="item.photoUrl" :name="item.name" :gender="item.gender" :size="36" />
            <div class="item-list__info">
              <p class="item-list__name">{{ item.name }}</p>
              <p class="item-list__sub">Roll {{ item.roll }}</p>
            </div>
            <span class="due-badge">৳{{ item.dueAmount }}</span>
            <RouterLink
              :to="{ path: '/admin/fees/collect', query: { studentId: item.id } }"
              class="panel-card__link"
            >Collect</RouterLink>
          </div>
        </div>
        <AppSkeleton v-else-if="duesLoading" variant="list" :rows="3" />
        <p v-else class="panel-card__empty">No outstanding dues.</p>
      </AppCard>

      <AppCard v-if="school.hasModule('attendance')" class="panel-card">
        <div class="panel-card__header">
          <h2 class="panel-card__title">Live Attendance</h2>
          <RouterLink to="/admin/attendance?tab=student" class="panel-card__link">Open</RouterLink>
        </div>
        <div v-if="liveAttendance.length" class="item-list">
          <div
            v-for="item in liveAttendance"
            :key="item.id"
            class="item-list__row"
          >
            <div class="item-list__info">
              <p class="item-list__name">{{ item.studentName }}</p>
              <p class="item-list__sub">{{ item.date }}<span v-if="item.entryTime"> · {{ item.entryTime }}<span v-if="item.exitTime">–{{ item.exitTime }}</span></span></p>
            </div>
            <span class="att-pill" :class="`att-pill--${item.status}`">{{ item.status }}</span>
            <RouterLink
              :to="{ path: `/admin/attendance/student/${item.studentId}`, query: { name: item.studentName } }"
              class="panel-card__link"
            >Details</RouterLink>
          </div>
        </div>
        <AppSkeleton v-else-if="liveLoading" variant="list" :rows="3" />
        <p v-else class="panel-card__empty">No attendance yet today.</p>
      </AppCard>

      <AppCard class="panel-card">
        <div class="panel-card__header">
          <h2 class="panel-card__title">Recent Students</h2>
          <RouterLink to="/admin/students" class="panel-card__link">View all</RouterLink>
        </div>
        <div v-if="recentStudents.length" class="item-list">
          <div v-for="s in recentStudents" :key="s.id" class="item-list__row">
            <StudentAvatar :photo-url="s.photoUrl" :name="s.name" :gender="s.gender" :size="36" />
            <div class="item-list__info">
              <p class="item-list__name">{{ s.name }}</p>
              <p class="item-list__sub">{{ classLabel(s.classId) }}<span v-if="s.roll"> · Roll {{ s.roll }}</span></p>
            </div>
            <RouterLink :to="`/admin/students/${s.id}`" class="panel-card__link">View</RouterLink>
          </div>
        </div>
        <AppSkeleton v-else-if="recentLoading" variant="list" :rows="3" />
        <p v-else class="panel-card__empty">No students yet.</p>
      </AppCard>

      <AppCard v-if="school.hasModule('exam_result')" class="panel-card">
        <div class="panel-card__header">
          <h2 class="panel-card__title">Recent Exams</h2>
          <RouterLink to="/admin/exams" class="panel-card__link">View all</RouterLink>
        </div>
        <div v-if="recentExams.length" class="item-list">
          <div v-for="e in recentExams" :key="e.id" class="item-list__row">
            <div class="item-list__info">
              <p class="item-list__name">{{ e.name }}</p>
              <p class="item-list__sub">{{ e.examDate }}</p>
            </div>
            <span class="status-badge">{{ e.status }}</span>
          </div>
        </div>
        <AppSkeleton v-else-if="examsLoading" variant="list" :rows="3" />
        <p v-else class="panel-card__empty">No exams yet.</p>
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import { useRouter } from 'vue-router'
import type { ModuleKey } from '@/constants/modules'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import StudentAvatar from '@/components/common/StudentAvatar.vue'
import { useChartPalette } from '@/composables/useChartPalette'
import {
  useAttendanceDay,
  useAttendanceSummary,
  useClasses,
  useDashboard,
  useDues,
  useExams,
  useRecentAttendance,
  useSettings,
  useStudents,
} from '@/composables/useQueries'
import { useAuthStore } from '@/stores/auth'
import { useSchoolStore } from '@/stores/school'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const { palette } = useChartPalette()
const auth = useAuthStore()
const school = useSchoolStore()
const router = useRouter()

interface OverviewTotals {
  students: number
  activeStudents: number
  activeTeachers: number
  collectedThisMonth: number
  /** Deprecated alias — backend still sends it. */
  revenueThisMonth?: number
}
interface CollectedMonth {
  month: string
  label: string
  amount: number
}
interface AttendanceRateRow {
  unitId: string
  sectionId: string
  classLabel: string
  sectionLabel: string
  groupLabel: string
  percentage: number
  markedDays: number
  presentDays: number
}

const greeting = (() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})()
const userName = computed(() => auth.user?.name || auth.user?.email?.split('@')[0] || 'Admin')

const { data: settingsData } = useSettings()
const schoolName = computed(() => settingsData.value?.data.schoolName || 'your school')

const { data, isLoading, isError } = useDashboard()
const overview = computed(
  () =>
    (data.value?.data ?? {}) as {
      totalStudents: number
      totalTeachers: number
      presentToday: number
      duesAmount: number
      totals: OverviewTotals
      collectedByMonth: CollectedMonth[]
      /** Deprecated alias — backend still sends it. */
      revenueByMonth?: CollectedMonth[]
      attendanceRate: AttendanceRateRow[]
    },
)
const totals = computed<OverviewTotals>(
  () =>
    overview.value.totals ?? {
      students: 0,
      activeStudents: 0,
      activeTeachers: 0,
      collectedThisMonth: 0,
    },
)

function formatTaka(amount: number): string {
  return `৳${Math.round(amount || 0).toLocaleString()}`
}

const { data: duesData, isLoading: duesLoading } = useDues(() => school.hasModule('payment'))
const outstandingRows = computed(() =>
  (duesData.value?.data ?? []).filter((s) => (s.dueAmount ?? 0) > 0),
)
const topDueStudents = computed(() =>
  [...outstandingRows.value]
    .sort((a, b) => (b.dueAmount ?? 0) - (a.dueAmount ?? 0))
    .slice(0, 5),
)

const { data: recentData, isLoading: recentLoading } = useStudents({ perPage: 5, ordering: '-created_at' })
const recentStudents = computed(() => recentData.value?.data.items ?? [])

const { data: liveData, isLoading: liveLoading } = useRecentAttendance(10, 15000, () => school.hasModule('attendance'))
const liveAttendance = computed(() => liveData.value?.data ?? [])

// ---------- Today's attendance strip (click a card → see WHO) ----------
// Latest school day with marks (today isn't marked yet in the morning).
  // Picking a date overrides it — to view another day, change the date.
const { data: attSumData } = useAttendanceSummary(undefined, undefined, undefined, () => school.hasModule('attendance'))
const stripPicked = ref('')
const stripDate = computed(() => stripPicked.value || attSumData.value?.data?.[0]?.date || new Date().toISOString().slice(0, 10))
const stripTitle = computed(() => {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const yd = new Date(now)
  yd.setDate(now.getDate() - 1)
  const yesterday = yd.toISOString().slice(0, 10)
  const d = stripDate.value
  // With no attendance at all (all 0) the default latest day = yesterday → shows Yesterday.
  // Once today's attendance starts, latest = today → shows Today.
  if (d === today) return `Today's Attendance — ${d}`
  if (d === yesterday) return `Yesterday's Attendance — ${d}`
  return `Attendance — ${d}`
})
const { data: dayData, isFetching: dayFetching } = useAttendanceDay(stripDate, () => school.hasModule('attendance'))
const todaySheet = computed(() => dayData.value?.data ?? [])
const todayCounts = computed(() => ({
  present: todaySheet.value.filter((r) => r.status === 'present').length,
  absent: todaySheet.value.filter((r) => r.status === 'absent').length,
  late: todaySheet.value.filter((r) => r.status === 'late').length,
  leave: todaySheet.value.filter((r) => r.status === 'leave' || r.status === 'holiday').length,
}))
type DrillStatus = 'present' | 'absent' | 'late' | 'leave'
function openDrill(status: DrillStatus): void {
  router.push({ path: `/admin/attendance/day/${stripDate.value}`, query: { status } })
}

const { data: examData, isLoading: examsLoading } = useExams({ perPage: 5 }, () => school.hasModule('exam_result'))
const recentExams = computed(() => (examData.value?.data.items ?? []).slice(0, 5))

const { data: classData } = useClasses()
const classLabel = (classId: string): string =>
  classData.value?.data.find((c) => c.id === classId)?.label ?? classId

interface StatCard {
  label: string
  value: string
  note: string
  to: string
  /** Card belongs to a module; hidden while that module is off. */
  module?: ModuleKey
}

const statCards = computed<StatCard[]>(() => [
  {
    label: 'Total Students',
    value: (totals.value.students ?? 0).toLocaleString(),
    note: `${totals.value.activeStudents ?? 0} active`,
    to: '/admin/students',
  },
  {
    label: 'Active Teachers',
    value: (totals.value.activeTeachers ?? 0).toLocaleString(),
    note: 'teaching now',
    to: '/admin/teachers',
    module: 'staff',
  },
  {
    label: 'Collected This Month',
    value: formatTaka(totals.value.collectedThisMonth ?? totals.value.revenueThisMonth ?? 0),
    note: 'collected',
    to: '/admin/payments',
    module: 'payment',
  },
  {
    label: "Today's Attendance",
    value: (overview.value.presentToday ?? 0).toLocaleString(),
    note: 'present today',
    to: '/admin/attendance?tab=student',
    module: 'attendance',
  },
  {
    label: 'Outstanding Dues',
    value: formatTaka(overview.value.duesAmount ?? 0),
    note: `${outstandingRows.value.length} students owe`,
    to: '/admin/fees/dues',
    module: 'payment',
  },
])

/** Cards whose module is off are hidden — value, note and link all belong to it. */
const visibleStatCards = computed(() =>
  statCards.value.filter((s) => !s.module || school.hasModule(s.module)),
)

const chartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false } },
    y: { beginAtZero: true },
  },
}

const collectionChart = computed<ChartData<'bar'> | null>(() => {
  const items = overview.value.collectedByMonth ?? overview.value.revenueByMonth ?? []
  if (!items.length) return null
  return {
    labels: items.map((i) => i.label),
    datasets: [
      {
        data: items.map((i) => i.amount),
        backgroundColor: palette.value.primary,
        borderRadius: 6,
        maxBarThickness: 42,
      },
    ],
  }
})

const attendanceChart = computed<ChartData<'bar'> | null>(() => {
  const items = (overview.value.attendanceRate ?? []).filter((r) => r.markedDays > 0)
  if (!items.length) return null
  const colors = palette.value
  return {
    labels: items.map((i) => i.groupLabel || i.classLabel),
    datasets: [
      {
        data: items.map((i) => i.percentage),
        backgroundColor: items.map((i) =>
          i.percentage >= 75 ? colors.primary : colors.danger,
        ),
        borderRadius: 6,
        maxBarThickness: 40,
      },
    ],
  }
})

const rateChartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (c) => `${Number(c.parsed.y) || 0}%` } },
  },
  scales: {
    x: { grid: { display: false } },
    y: { beginAtZero: true, max: 100, ticks: { callback: (v) => `${v}%` } },
  },
}))
</script>

<style scoped>
.admin-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}
.admin-dashboard__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}
.admin-dashboard__title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin: 0 0 var(--spacing-xs);
}
.admin-dashboard__subtitle {
  color: var(--color-text-secondary);
  margin: 0;
  font-size: var(--font-size-sm);
}
.admin-dashboard__actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}
.action-link {
  text-decoration: none;
  display: inline-block;
}
.muted {
  color: var(--color-text-muted);
}
.error {
  color: var(--color-danger);
}
.admin-dashboard__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}
.admin-dashboard__stats > *,
.admin-dashboard__grid > * {
  min-width: 0;
}
.stat-card__link {
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
}
.stat-card__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-xs);
}
.stat-card__value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin: 0 0 var(--spacing-xs);
  overflow-wrap: anywhere;
}
.stat-card__note {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin: 0;
}
.admin-dashboard__grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--spacing-md);
}
.panel-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}
.panel-card__title {
  font-size: var(--font-size-base);
  font-weight: 600;
  margin: 0;
}
.panel-card__link {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
  white-space: nowrap;
}
.panel-card__link:hover {
  text-decoration: underline;
}
.panel-card__tools {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.strip-date {
  max-width: 150px;
  height: 32px;
  font-size: var(--font-size-xs);
}
.panel-card__empty {
  margin: 0;
  padding: var(--spacing-lg) 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-align: center;
}
.chart-canvas {
  position: relative;
  height: 260px;
}
.item-list {
  display: flex;
  flex-direction: column;
}
.item-list__row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
}
.item-list__row:last-child {
  border-bottom: none;
}
.item-list__info {
  flex: 1;
  min-width: 0;
}
.item-list__name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  margin: 0 0 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-list__sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin: 0;
}
.due-badge {
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  background: var(--color-surface-alt);
  color: var(--color-text-secondary);
  white-space: nowrap;
}
.att-pill {
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: capitalize;
  background: var(--color-surface-alt);
  color: var(--color-text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}
.att-pill--present {
  background: var(--color-success-light, #dcfce7);
  color: var(--color-success, #166534);
}
.att-pill--late {
  background: var(--color-warning-light, #fef3c7);
  color: var(--color-warning, #b45309);
}
.status-badge {
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  background: var(--color-primary-light);
  color: var(--color-primary);
  white-space: nowrap;
  text-transform: capitalize;
}
.att-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: var(--spacing-md);
  transition: opacity 0.15s ease;
}
.att-strip--fetching {
  opacity: 0.55;
}
.att-note {
  margin: var(--spacing-sm) 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
.att-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
  font: inherit;
  cursor: pointer;
}
.att-chip:hover {
  border-color: var(--color-primary);
}
.att-chip__value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  line-height: 1;
}
.att-chip__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.att-chip--present .att-chip__value {
  color: var(--color-success, green);
}
.att-chip--absent .att-chip__value {
  color: var(--color-danger);
}
.att-chip--late .att-chip__value {
  color: var(--color-warning, #b45309);
}
.drill-sub {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
@media (max-width: 1024px) {
  .admin-dashboard__stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .admin-dashboard__grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 480px) {
  .admin-dashboard__stats {
    grid-template-columns: 1fr;
  }
  .admin-dashboard__actions {
    width: 100%;
  }
}
</style>
