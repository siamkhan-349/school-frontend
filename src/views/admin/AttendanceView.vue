<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Student Attendance</h1>
        <p class="page__hint">Daily roster with entry/exit times. Teacher attendance lives under Payroll.</p>
      </div>
    </div>

    <div class="tabs">
      <button :class="['tab', { 'tab--active': mainTab === 'mark' }]" type="button" @click="mainTab = 'mark'">
        Take Attendance
      </button>
      <button :class="['tab', { 'tab--active': mainTab === 'report' }]" type="button" @click="mainTab = 'report'">
        Report
      </button>
    </div>

    <template v-if="mainTab === 'mark'">
    <!-- Student attendance -->
      <AppCard title="Card scan — tap a card on the reader">
        <div class="scan-row">
          <input
            ref="scanInput"
            v-model="scanCard"
            class="app-input__control scan-input"
            placeholder="Scan / type card ID, then Enter…"
            autocomplete="off"
            @keyup.enter="sendTap()"
          />
          <AppButton :disabled="tapping || !scanCard.trim()" @click="sendTap">
            {{ tapping ? 'Marking…' : 'Mark' }}
          </AppButton>
        </div>
        <p v-if="tapMsg" class="tap-ok">{{ tapMsg }}</p>
        <p v-if="tapError" class="error">{{ tapError }}</p>
        <p class="muted">1st tap = entry (late if after school start). Exit opens at school end time — reads before that only confirm the entry. Today only.</p>
      </AppCard>

      <AppCard v-if="step === 'select'" title="Daily attendance">
        <p class="muted">Pick the date, class, section and department — then continue to the roster.</p>
        <div class="pick-grid">
          <label>Date
            <input v-model="date" type="date" class="app-input__control" />
          </label>
          <label>Class
            <select v-model="classId" class="app-input__control">
              <option value="">Select class</option>
              <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
          </label>
          <label>Section
            <select v-model="sectionId" class="app-input__control" :disabled="!classId">
              <option :value="null">All sections</option>
              <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.label }}</option>
            </select>
          </label>
          <label v-if="filterClass?.hasDepartments">Department
            <select v-model="departmentId" class="app-input__control">
              <option :value="null">All departments</option>
              <option v-for="d in filterDepartments" :key="d.id" :value="d.id">{{ d.label }}</option>
            </select>
          </label>
        </div>
        <div class="save-bar">
          <AppButton type="button" :disabled="!date || !classId" @click="goNext">Next →</AppButton>
        </div>
      </AppCard>

      <AppCard v-else>
        <div class="roster-head">
          <button type="button" class="roster-back" @click="goBack">← Change selection</button>
          <div class="roster-chips">
            <span class="roster-chip roster-chip--date">{{ date }}</span>
            <span class="roster-chip">{{ classLabel(classId) }}</span>
            <span class="roster-chip">{{ sectionId ? sectionLabel(sectionId) : 'All sections' }}</span>
            <span v-if="filterClass?.hasDepartments" class="roster-chip">{{ departmentId ? deptLabel(departmentId) : 'All departments' }}</span>
          </div>
        </div>
        <div class="roster-actions">
          <AppButton variant="ghost" @click="markAll('present')">All present</AppButton>
          <AppButton variant="ghost" :disabled="closingDay" @click="closeDay">
            {{ closingDay ? 'Closing…' : 'Close day (absent)' }}
          </AppButton>
        </div>

        <p v-if="attLoading" class="muted">Loading…</p>
        <template v-else>
          <table class="table">
            <thead>
              <tr><th>Roll</th><th>Name</th><th>Status</th><th>Entry</th><th>Exit</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="row in studentRows" :key="row.id">
                <td>{{ row.roll }}</td>
                <td>{{ row.name }}</td>
                <td>
                  <div class="status-btns">
                    <button
                      v-for="st in STATUSES"
                      :key="st"
                      type="button"
                      :class="['st', `st--${st}`, { 'st--on': marks[row.id] === st }]"
                      @click="setStudentStatus(row.id, st)"
                    >
                      {{ st }}
                    </button>
                  </div>
                </td>
                <td>
                  <input
                    v-model="entryTimes[row.id]"
                    type="time"
                    class="app-input__control time"
                    :disabled="!showStudentTimes(row.id)"
                  />
                </td>
                <td>
                  <input
                    v-model="exitTimes[row.id]"
                    type="time"
                    class="app-input__control time"
                    :disabled="!showStudentTimes(row.id)"
                  />
                </td>
                <td class="row-actions">
                  <button class="link-btn" type="button" @click="openStudentDetails(row)">Details</button>
                </td>
              </tr>
              <tr v-if="studentRows.length === 0">
                <td colspan="6" class="muted">No students in this selection.</td>
              </tr>
            </tbody>
          </table>
          <div class="save-bar">
            <AppButton :disabled="saving || studentRows.length === 0" @click="saveStudent">
              {{ saving ? 'Saving…' : `Save ${date}` }}
            </AppButton>
          </div>
        </template>
      </AppCard>

      <AppCard title="Recent Summary">
        <table class="table">
          <thead>
            <tr><th>Date</th><th>Present</th><th>Absent</th><th>Late</th><th>Leave</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in summary" :key="r.date">
              <td>{{ r.date }}</td>
              <td><button class="count-btn count-btn--present" type="button" @click="openDrill(r.date, 'present')">{{ r.present }}</button></td>
              <td><button class="count-btn count-btn--absent" type="button" @click="openDrill(r.date, 'absent')">{{ r.absent }}</button></td>
              <td><button class="count-btn count-btn--late" type="button" @click="openDrill(r.date, 'late')">{{ r.late }}</button></td>
              <td><button class="count-btn count-btn--leave" type="button" @click="openDrill(r.date, 'leave')">{{ r.leave }}</button></td>
            </tr>
            <tr v-if="summary.length === 0">
              <td colspan="5" class="muted">No attendance records yet.</td>
            </tr>
          </tbody>
        </table>
      </AppCard>
    </template>

    <template v-else>
      <AppCard title="Attendance report — every student">
        <div class="pick-grid">
          <label>Class
            <select v-model="repClassId" class="app-input__control">
              <option value="">All classes</option>
              <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
          </label>
          <label>Section
            <select v-model="repSectionId" class="app-input__control" :disabled="!repClassId">
              <option :value="null">All sections</option>
              <option v-for="s in repSections" :key="s.id" :value="s.id">{{ s.label }}</option>
            </select>
          </label>
          <label v-if="repClass?.hasDepartments">Department
            <select v-model="repDeptId" class="app-input__control">
              <option :value="null">All departments</option>
              <option v-for="d in repDepts" :key="d.id" :value="d.id">{{ d.label }}</option>
            </select>
          </label>
          <label>From
            <input v-model="repFrom" type="date" class="app-input__control" />
          </label>
          <label>To
            <input v-model="repTo" type="date" class="app-input__control" />
          </label>
        </div>
        <div class="roster-actions">
          <AppButton variant="ghost" :disabled="reportRows.length === 0" @click="exportReportCSV">
            Export CSV
          </AppButton>
          <AppButton variant="ghost" :disabled="reportRows.length === 0" @click="exportReportPDF">
            PDF
          </AppButton>
        </div>
        <p v-if="reportLoading" class="muted">Loading…</p>
        <table v-else class="table">
          <thead>
            <tr><th>Student</th><th>Present</th><th>Late</th><th>Absent</th><th>Days</th><th>Attendance</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="row in pagedReportRows" :key="row.studentId">
              <td>{{ row.studentName }}<span v-if="row.roll" class="muted"> · Roll {{ row.roll }}</span></td>
              <td>{{ row.present }}</td>
              <td>{{ row.late }}</td>
              <td>{{ row.absent }}</td>
              <td>{{ row.total }}</td>
              <td>
                <span v-if="!row.hasRecord" class="muted">no record</span>
                <div v-else class="percent">
                  <span class="percent__bar"><span class="percent__fill" :class="percentClass(row.percentage)" :style="{ width: `${row.percentage}%` }" /></span>
                  <span class="percent__value">{{ row.percentage }}%</span>
                </div>
              </td>
              <td class="row-actions">
                <button class="link-btn" type="button" @click="openStudentDetails({ id: row.studentId, name: row.studentName })">Details</button>
              </td>
            </tr>
            <tr v-if="pagedReportRows.length === 0">
              <td colspan="7" class="muted">No attendance data in the selected range.</td>
            </tr>
          </tbody>
        </table>
        <AppPagination v-if="!reportLoading" v-model:page="repPage" v-model:per-page="repPerPage" :total="reportRows.length" />
      </AppCard>
    </template>

  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import {
  useAttendanceReport,
  useAttendanceSummary,
  useClasses,
  useCloseAttendanceDay,
  useDepartments,
  useSaveStudentAttendance,
  useSections,
  useSettings,
  useStudentAttendance,
  useStudents,
  useTapAttendance,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { usePagedList } from '@/composables/usePagedList'
import { lastCardTap } from '@/composables/useCardScanner'
import { attendanceReportPdf } from '@/utils/pdf'
import type { AttendanceStatus } from '@/types/models'

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'leave', 'holiday']
const today = (): string => new Date().toISOString().slice(0, 10)

const toast = useToast()
const router = useRouter()

const mainTab = ref<'mark' | 'report'>('mark')

// ---------- student ----------
// Stepped flow (coaching pattern): pick date/class/section/department
// first, then mark the roster. One screen, one job.
const step = ref<'select' | 'roster'>('select')
const date = ref(today())
const classId = ref('')
const sectionId = ref<string | null>(null)
const departmentId = ref<string | null>(null)

function goNext(): void {
  if (date.value && classId.value) step.value = 'roster'
}
function goBack(): void {
  step.value = 'select'
}

const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])
const filterClass = computed(() => classes.value.find((c) => c.id === classId.value))
const { data: sectionData } = useSections(() => classId.value || undefined)
const sections = computed(() => sectionData.value?.data ?? [])
const { data: filterDeptData } = useDepartments(() => classId.value || undefined)
const filterDepartments = computed(() => filterDeptData.value?.data ?? [])
const { data: allDeptData } = useDepartments(undefined)
watch(classId, () => {
  sectionId.value = null
  departmentId.value = null
})

const classLabel = (id: string): string => classes.value.find((c) => c.id === id)?.label ?? id
const sectionLabel = (id: string | null): string =>
  sections.value.find((s) => s.id === id)?.label ?? ''
const deptLabel = (id: string | null): string =>
  (allDeptData.value?.data ?? []).find((d) => d.id === id)?.label ?? ''

const listParams = computed(() => ({
  classId: classId.value || undefined,
  sectionId: sectionId.value ?? undefined,
  departmentId: departmentId.value ?? undefined,
  perPage: 500,
}))
const { data: studentData } = useStudents(listParams)
const { data: attData, isLoading: attLoading } = useStudentAttendance(
  () => date.value,
  () => classId.value,
  () => sectionId.value,
  () => departmentId.value,
)

const marks = reactive<Record<string, AttendanceStatus>>({})
const entryTimes = reactive<Record<string, string>>({})
const exitTimes = reactive<Record<string, string>>({})
watch(
  [attData, studentData],
  () => {
    const saved = Object.fromEntries(
      (attData.value?.data ?? []).map((m) => [m.studentId, m]),
    )
    for (const s of studentData.value?.data.items ?? []) {
      marks[s.id] = (saved[s.id]?.status ?? 'present') as AttendanceStatus
      entryTimes[s.id] = saved[s.id]?.entryTime ?? entryTimes[s.id] ?? ''
      exitTimes[s.id] = saved[s.id]?.exitTime ?? exitTimes[s.id] ?? ''
    }
  },
  { immediate: true },
)

/** Entry/exit only exist on working days (present or late) — coaching rule. */
function showStudentTimes(id: string): boolean {
  const st = marks[id] ?? 'present'
  return st === 'present' || st === 'late'
}

function setStudentStatus(id: string, st: AttendanceStatus): void {
  marks[id] = st
  if (!showStudentTimes(id)) {
    entryTimes[id] = ''
    exitTimes[id] = ''
  }
}

const studentRows = computed(() => {
  const all = studentData.value?.data.items ?? []
  return all
    .filter((s) => !classId.value || s.classId === classId.value)
    .filter((s) => sectionId.value == null || (s.sectionId ?? null) === sectionId.value)
    .filter((s) => departmentId.value == null || (s.departmentId ?? null) === departmentId.value)
})

function markAll(status: AttendanceStatus): void {
  for (const row of studentRows.value) marks[row.id] = status
}

function openStudentDetails(row: { id: string; name: string }): void {
  router.push({ path: `/admin/attendance/student/${row.id}`, query: { name: row.name } })
}

const { mutateAsync: saveStudentMarks, isPending: saving } = useSaveStudentAttendance()
async function saveStudent(): Promise<void> {
  try {
    await saveStudentMarks({
      date: date.value,
      classId: classId.value,
      sectionId: sectionId.value,
      departmentId: departmentId.value,
      marks: studentRows.value.map((s) => {
        const status = marks[s.id] ?? 'present'
        const timed = status === 'present' || status === 'late'
        return {
          studentId: s.id,
          status,
          ...(timed && entryTimes[s.id] ? { entryTime: entryTimes[s.id] } : {}),
          ...(timed && exitTimes[s.id] ? { exitTime: exitTimes[s.id] } : {}),
        }
      }),
    })
    toast.success('Attendance saved')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}

const { data: summaryData } = useAttendanceSummary(
  () => classId.value || undefined,
  () => sectionId.value ?? undefined,
  () => departmentId.value ?? undefined,
)
const summary = computed(() => summaryData.value?.data ?? [])

// ---------- Recent Summary drill-down: full page (modal too small for 300 names) ----------
type DrillStatus = 'present' | 'absent' | 'late' | 'leave'
function openDrill(date: string, status: DrillStatus): void {
  router.push({ path: `/admin/attendance/day/${date}`, query: { status } })
}

// ---------- report (every student, coaching pattern) ----------
const monthAgo = (): string => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}
const repClassId = ref('')
const repSectionId = ref<string | null>(null)
const repDeptId = ref<string | null>(null)
const repFrom = ref(monthAgo())
const repTo = ref(today())
const repClass = computed(() => classes.value.find((c) => c.id === repClassId.value))
const { data: repSectionData } = useSections(() => repClassId.value || undefined)
const repSections = computed(() => repSectionData.value?.data ?? [])
const { data: repDeptData } = useDepartments(() => repClassId.value || undefined)
const repDepts = computed(() => repDeptData.value?.data ?? [])
watch(repClassId, () => {
  repSectionId.value = null
  repDeptId.value = null
})
const reportParams = computed(() => ({
  classId: repClassId.value || undefined,
  sectionId: repSectionId.value ?? undefined,
  departmentId: repDeptId.value ?? undefined,
  from: repFrom.value || undefined,
  to: repTo.value || undefined,
}))
const { data: reportData, isLoading: reportLoading } = useAttendanceReport(reportParams)
const reportRows = computed(() => reportData.value?.data ?? [])
const { data: settingsData } = useSettings()
// Report table pagination (mark roster stays full-list by design — teacher marks all).
const { page: repPage, perPage: repPerPage } = usePagedList(10)
watch([repClassId, repSectionId, repDeptId, repFrom, repTo], () => {
  repPage.value = 1
})
const pagedReportRows = computed(() => {
  const start = (repPage.value - 1) * repPerPage.value
  return reportRows.value.slice(start, start + repPerPage.value)
})

const percentClass = (percentage: number): string =>
  percentage >= 85 ? 'percent__fill--high' : percentage >= 60 ? 'percent__fill--mid' : 'percent__fill--low'

function exportReportCSV(): void {
  const header = ['Student', 'Roll', 'Class', 'Present', 'Late', 'Absent', 'Days', 'Percentage']
  const lines = reportRows.value.map((r) =>
    [r.studentName, r.roll ?? '', r.classLabel, r.present, r.late, r.absent, r.total, `${r.percentage}%`]
      .map((c) => {
        const v = String(c)
        return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
      })
      .join(','),
  )
  const url = URL.createObjectURL(new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `attendance-report-${repFrom.value}-${repTo.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportReportPDF(): void {
  const className = repClass.value?.label ?? 'All classes'
  attendanceReportPdf({
    schoolName: settingsData.value?.data.schoolName || 'School',
    period: `${repFrom.value} to ${repTo.value}`,
    classLabel: className,
    rows: reportRows.value.map((r) => ({
      name: r.studentName,
      roll: String(r.roll ?? ''),
      present: r.present,
      late: r.late,
      absent: r.absent,
      total: r.total,
      percentage: r.percentage,
    })),
  })
}

// ---------- card-reader taps (today only) ----------
const scanCard = ref('')
const scanInput = ref<HTMLInputElement | null>(null)
const tapMsg = ref('')
const tapError = ref('')
const { mutateAsync: tapCard, isPending: tapping } = useTapAttendance()
async function sendTap(card?: string): Promise<void> {
  const value = (card ?? scanCard.value).trim()
  if (!value || tapping.value) return
  tapMsg.value = ''
  tapError.value = ''
  try {
    const res = await tapCard({ cardId: value })
    const d = res.data
    tapMsg.value = d.tap === 'duplicate' ? res.message : d.tap === 'entry'
      ? `${d.student.name} — Entry ${d.entryTime} (${d.status})`
      : `${d.student.name} — Exit ${d.exitTime}`
    scanCard.value = ''
  } catch (e) {
    tapError.value = e instanceof Error ? e.message : 'Tap failed'
  } finally {
    scanInput.value?.focus()
  }
}

/*
 * Shell-wide scanning (see AdminLayout) catches reader bursts on any page;
 * mirror the last tap here so this page shows it inline too (toast already
 * fired there). The box below stays for manual entry.
 */
watch(lastCardTap, (t) => {
  tapMsg.value = t.ok
  tapError.value = t.err
})

// ---------- close day: missing rows become absent (holiday on holidays) ----------
const { mutateAsync: closeDayMarks, isPending: closingDay } = useCloseAttendanceDay()
async function closeDay(): Promise<void> {
  try {
    const res = await closeDayMarks({
      date: date.value,
      classId: classId.value || undefined,
      sectionId: sectionId.value,
      departmentId: departmentId.value,
    })
    toast.success(res.data.holiday > 0 ? `${res.data.holiday} marked holiday.` : `${res.data.absent} marked absent.`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}

</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
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
  cursor: pointer;
}
.tab--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-primary-contrast);
}
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
}
.page__hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin: var(--spacing-xs) 0 0;
}
.muted {
  color: var(--color-text-muted);
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
}
.st--on {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-primary-contrast);
}
.save-bar {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--spacing-md);
}
.pick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-sm);
  margin: var(--spacing-md) 0;
}
.pick-grid label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.roster-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-md);
}
.roster-back {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 6px var(--spacing-sm);
  font-family: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.roster-back:hover {
  color: var(--color-text);
}
.roster-chips {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}
.roster-chip {
  padding: 4px var(--spacing-sm);
  font-size: var(--font-size-sm);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}
.roster-chip--date {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  font-weight: var(--font-weight-medium);
}
.roster-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-md);
}
.scan-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}
.scan-input {
  flex: 1;
  font-family: monospace;
}
.tap-ok {
  color: var(--color-success, #15803d);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.time {
  max-width: 120px;
}
.time:disabled {
  opacity: 0.4;
}
.row-actions {
  text-align: right;
  white-space: nowrap;
}
.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  white-space: nowrap;
}
.count-btn {
  background: none;
  border: none;
  padding: 2px 8px;
  font: inherit;
  font-weight: 700;
  border-radius: var(--radius-full);
  cursor: pointer;
}
.count-btn:hover {
  text-decoration: underline;
}
.count-btn--present {
  color: var(--color-success, green);
}
.count-btn--absent {
  color: var(--color-danger);
}
.count-btn--late {
  color: var(--color-warning, #b45309);
}
.count-btn--leave {
  color: var(--color-text-muted);
}
.percent {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.percent__bar {
  display: inline-block;
  width: 120px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-surface-alt);
  overflow: hidden;
}
.percent__fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--color-primary);
}
.percent__fill--high {
  background: var(--color-success);
}
.percent__fill--mid {
  background: var(--color-warning);
}
.percent__fill--low {
  background: var(--color-danger);
}
.percent__value {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.page > *:not(:last-child) {
  margin-bottom: var(--spacing-md);
}
</style>
