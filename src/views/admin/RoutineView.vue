<template>
  <div class="page">
    <div class="page__head">
      <h1 class="page__title">Routine</h1>
      <div class="page__actions">
        <AppButton variant="ghost" type="button" :disabled="!visibleRows.length" @click="exportCsv">CSV</AppButton>
        <AppButton variant="ghost" type="button" :disabled="!visibleRows.length" @click="exportPdf">PDF</AppButton>
        <AppButton variant="ghost" type="button" :disabled="!visibleRows.length" @click="printPage">Print</AppButton>
        <AppButton type="button" @click="goAdd">+ Add {{ mode === 'class' ? 'Period' : 'Exam' }}</AppButton>
      </div>
    </div>

    <div class="no-print">
      <div class="mode-row">
        <button :class="['mode-btn', { 'mode-btn--active': mode === 'class' }]" type="button" @click="mode = 'class'">Class Routine</button>
        <button :class="['mode-btn', { 'mode-btn--active': mode === 'exam' }]" type="button" @click="mode = 'exam'">Exam Routine</button>
      </div>

      <AppCard>
        <FilterPanel>
          <select v-model="classId" class="app-input__control">
            <option value="">All classes</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
          <select v-model="sectionLabel" class="app-input__control" title="Shift / section label across classes">
            <option value="">All sections</option>
            <option v-for="label in sectionLabels" :key="label" :value="label">Section {{ label }}</option>
          </select>
          <select v-if="filterClass?.hasDepartments" v-model="departmentId" class="app-input__control">
            <option :value="null">All departments</option>
            <option v-for="d in filterDepartments" :key="d.id" :value="d.id">{{ d.label }}</option>
          </select>
          <select v-model="teacherId" class="app-input__control">
            <option value="">All teachers</option>
            <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
          <select v-model="roomFilter" class="app-input__control">
            <option value="">All rooms</option>
            <option v-for="room in rooms" :key="room" :value="room">{{ room }}</option>
          </select>
          <div class="search-wrap">
            <input
              v-model="search"
              class="app-input__control"
              placeholder="Search subject…"
              @focus="searchFocus = true"
              @blur="closeSuggest"
              @keydown.escape="searchFocus = false"
              @keydown.enter="pickFirstSuggest"
            />
            <ul v-if="searchFocus && suggestions.length" class="suggest">
              <li v-for="s in suggestions" :key="`${s.label}||${s.classId}`">
                <button type="button" @mousedown.prevent="pickSuggest(s.label)">
                  <strong>{{ s.label }}</strong>
                  <span class="muted"> · {{ classLabel(s.classId) }}</span>
                </button>
              </li>
            </ul>
          </div>
        </FilterPanel>

        <p v-if="isLoading && !routines.length" class="muted">Loading…</p>
        <template v-else>
          <!-- Class: weekly grid (day × time slot) so clashes are visible. -->
          <div v-if="mode === 'class'" class="table-scroll">
            <table class="grid">
              <thead>
                <tr><th class="grid__day">Day</th><th v-for="slot in slots" :key="slot">{{ slot }}</th></tr>
              </thead>
              <tbody>
                <tr v-for="day in WEEK_DAYS" :key="day" :class="{ 'row--off': isOffDay(day) }">
                  <td class="grid__day">{{ dayLabel(day) }} <span v-if="isOffDay(day)" class="off-badge">Off</span></td>
                  <td v-for="slot in slots" :key="slot" class="grid__cell">
                    <div v-for="r in cellEntries(day, slot)" :key="r.id" class="cell-entry">
                      <strong>{{ r.subjectLabel }}</strong>
                      <span class="muted">{{ r.teacherName || 'No teacher' }} · {{ r.room || 'No room' }}</span>
                      <span class="muted">{{ classLabel(r.classId) }}</span>
                      <span class="cell-actions">
                        <button class="link-btn" type="button" @click="openEdit(r)">Edit</button>
                        <button class="link-btn link-btn--danger" type="button" @click="askRemove(r.id)">Delete</button>
                      </span>
                    </div>
                    <span v-if="!cellEntries(day, slot).length" class="muted">—</span>
                  </td>
                </tr>
                <tr v-if="!slots.length">
                  <td :colspan="2" class="muted">No periods. Add the first one.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Exam: grouped by exam name + date. -->
          <div v-else>
            <div v-for="group in examGroups" :key="group.key" class="exam-group">
              <h3 class="exam-group__title">{{ group.title }} <span class="muted">· {{ group.date }} ({{ dayLabel(group.day) }})</span></h3>
              <table class="table">
                <thead>
                  <tr><th>Time</th><th>Subjects</th><th>Teachers</th><th>Room</th><th>Class</th><th></th></tr>
                </thead>
                <tbody>
                  <tr v-for="r in group.rows" :key="r.id">
                    <td>{{ r.startTime }}–{{ r.endTime }}</td>
                    <td>{{ subjectText(r) }}</td>
                    <td>{{ teacherText(r) }}</td>
                    <td>{{ r.room || '—' }}</td>
                    <td>{{ classLabel(r.classId) }}</td>
                    <td class="row-actions">
                      <button class="link-btn" type="button" @click="openEdit(r)">Edit</button>
                      <button class="link-btn link-btn--danger" type="button" @click="askRemove(r.id)">Delete</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="!examGroups.length" class="muted">No exams. Add the first one.</p>
          </div>
        </template>
      </AppCard>
    </div>

    <!-- Print sheet: plain row/column tables. -->
    <div class="print-sheet-only">
      <div class="print-sheet">
        <h1>{{ schoolName }}</h1>
        <h2>{{ mode === 'class' ? 'Class Routine' : 'Exam Routine' }}{{ classId ? ` — ${classLabel(classId)}` : '' }}</h2>
        <table>
          <thead>
            <tr><th>Day / Date</th><th>Time</th><th>Subject</th><th>Teacher</th><th>Room</th><th>Class</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in visibleRows" :key="r.id">
              <td>{{ mode === 'exam' && r.date ? `${r.date} (${r.day})` : dayLabel(r.day) }}</td>
              <td>{{ r.startTime }}–{{ r.endTime }}</td>
              <td>{{ subjectText(r) }}</td>
              <td>{{ teacherText(r) }}</td>
              <td>{{ r.room || '—' }}</td>
              <td>{{ classLabel(r.classId) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <AppConfirmDialog
      :open="confirm.open"
      :message="confirm.message"
      :busy="deleting"
      @cancel="confirm.open = false"
      @confirm="doRemove"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import {
  useClasses,
  useDeleteRoutine,
  useDepartments,
  useRoutines,
  useSections,
  useSettings,
  useSubjects,
  useTeachers,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { downloadCsv, routinePdf } from '@/utils/pdf'
import { printWithTitle } from '@/utils/print'
import { WEEK_DAYS, type Routine, type WeekDay } from '@/types/models'

const DAY_LABELS: Record<WeekDay, string> = {
  Sat: 'Saturday', Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday',
  Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday',
}
const dayLabel = (d: WeekDay): string => DAY_LABELS[d] ?? d

const toast = useToast()
const route = useRoute()
const router = useRouter()
const mode = ref<'class' | 'exam'>(route.query.type === 'exam' ? 'exam' : 'class')
const classId = ref('')
// Section = shift label (A = morning, B = day): cross-class, class-er sathe bandha na.
const sectionLabel = ref('')
const departmentId = ref<string | null>(null)
const teacherId = ref('')
const roomFilter = ref('')
const search = ref('')
const searchFocus = ref(false)

// Autocomplete: subject names matching the input, class name soho.
const suggestions = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (q.length < 2) return []
  const seen = new Map<string, { label: string; classId: string }>()
  for (const r of routines.value) {
    const names = [r.subjectLabel, ...(r.subjects ?? [])].map((n) => (n || '').trim()).filter(Boolean)
    for (const label of names) {
      if (!label.toLowerCase().includes(q)) continue
      const key = `${label.toLowerCase()}||${r.classId}`
      if (!seen.has(key)) seen.set(key, { label, classId: r.classId })
      if (seen.size >= 8) return [...seen.values()]
    }
  }
  return [...seen.values()]
})
function pickSuggest(label: string): void {
  search.value = label
  searchFocus.value = false
}
function pickFirstSuggest(): void {
  if (suggestions.value.length > 0) pickSuggest(suggestions.value[0]?.label ?? '')
}
function closeSuggest(): void {
  window.setTimeout(() => {
    searchFocus.value = false
  }, 120)
}

const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])
const classLabel = (id: string): string => classes.value.find((c) => c.id === id)?.label ?? id

const { data: sectionData } = useSections(undefined, true)
const sectionLabelOf = computed(() => {
  const map = new Map<string, string>()
  for (const s of sectionData.value?.data ?? []) map.set(s.id, s.label)
  return map
})
const sectionLabels = computed(() => {
  const set = new Set<string>()
  for (const s of sectionData.value?.data ?? []) {
    const label = (s.label || '').trim()
    if (label) set.add(label)
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
})
watch(classId, () => {
  departmentId.value = null
})

// Department filter (Class 9/10): subject's department decides.
// department null = common subject → sob department e dekhay.
const filterClass = computed(() => classes.value.find((c) => c.id === classId.value))
const { data: filterDeptData } = useDepartments(() => classId.value || undefined)
const filterDepartments = computed(() => filterDeptData.value?.data ?? [])
const { data: filterSubjectData } = useSubjects(() => classId.value || undefined)
const subjectDeptOf = computed(() => {
  const map = new Map<string, string | null>()
  for (const s of filterSubjectData.value?.data ?? []) map.set(s.id, s.departmentId)
  return map
})

const { data, isLoading } = useRoutines(
  () => classId.value || undefined,
  undefined,
  () => mode.value,
)
const { data: teacherData } = useTeachers({ perPage: 500 })
const teachers = computed(() => teacherData.value?.data.items ?? [])
const rooms = computed(() => {
  const set = new Set<string>()
  for (const r of (data.value?.data ?? [])) {
    const room = (r.room || '').trim()
    if (room) set.add(room)
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
})
const routines = computed(() => {
  const rows = data.value?.data ?? []
  const q = search.value.trim().toLowerCase()
  return rows
    .filter((r) => !classId.value || r.classId === classId.value)
    .filter((r) => {
      if (!sectionLabel.value) return true
      // Whole-class period (no section) sob section ei hoy.
      if (!r.sectionId) return true
      return (sectionLabelOf.value.get(r.sectionId) || '').trim() === sectionLabel.value
    })
    .filter((r) => {
      if (departmentId.value == null) return true
      const dept = r.subjectId ? subjectDeptOf.value.get(r.subjectId) : undefined
      return dept == null || dept === departmentId.value
    })
    .filter((r) => !teacherId.value || r.teacherId === teacherId.value || (r.teacherIds ?? []).includes(teacherId.value))
    .filter((r) => !roomFilter.value || (r.room || '').trim() === roomFilter.value)
    .filter((r) => {
      if (!q) return true
      // Subject-only search (exam mode: exam name too, nahole khuje pawa jeto na).
      if (mode.value === 'exam' && r.title.toLowerCase().includes(q)) return true
      return [r.subjectLabel, ...(r.subjects ?? [])].join(' ').toLowerCase().includes(q)
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
})
const visibleRows = computed(() => [...routines.value].sort((a, b) =>
  mode.value === 'exam'
    ? (`${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    : (`${WEEK_DAYS.indexOf(a.day)}${a.startTime}`.localeCompare(`${WEEK_DAYS.indexOf(b.day)}${b.startTime}`)),
))

// Class serial: choto class age (Class 1 → Class 10), label number onujayi.
function classRank(id: string): number {
  const label = classLabel(id)
  const m = /(\d+)/.exec(label)
  if (m) return Number(m[1])
  const idx = classes.value.findIndex((c) => c.id === id)
  return idx === -1 ? 999 : 1000 + idx
}

// Class grid: distinct time slots as columns, sorted by actual start time
// (string sort puts "01:00 PM" before "09:00 AM" — parse to minutes).
function toMinutes(v: string): number {
  const m = /(\d{1,2}):(\d{2})\s*([AP]M)?/i.exec(v || '')
  if (!m) return 0
  let h = Number(m[1]) % 12
  if (m[3] && /pm/i.test(m[3])) h += 12
  return h * 60 + Number(m[2])
}
const slots = computed(() => {
  const set = new Set<string>()
  for (const r of routines.value) set.add(`${r.startTime}–${r.endTime}`)
  return [...set].sort((a, b) => toMinutes(a.split('–')[0] ?? '') - toMinutes(b.split('–')[0] ?? ''))
})
const cellEntries = (day: WeekDay, slot: string): Routine[] =>
  routines.value
    .filter((r) => r.day === day && `${r.startTime}–${r.endTime}` === slot)
    .sort((a, b) => classRank(a.classId) - classRank(b.classId))

// Exam groups: one block per exam name + date.
const examGroups = computed(() => {
  const map = new Map<string, { key: string; title: string; date: string; day: WeekDay; rows: Routine[] }>()
  for (const r of visibleRows.value) {
    const key = `${r.title}||${r.date}`
    let g = map.get(key)
    if (!g) {
      g = { key, title: r.title || 'Untitled exam', date: r.date || '', day: r.day, rows: [] }
      map.set(key, g)
    }
    g.rows.push(r)
  }
  for (const g of map.values()) g.rows.sort((a, b) => classRank(a.classId) - classRank(b.classId))
  return [...map.values()]
})

const subjectText = (r: Routine): string => (r.subjects?.length ? r.subjects.join(', ') : r.subjectLabel)
const teacherText = (r: Routine): string => {
  if (r.teacherName) {
    const extra = (r.teacherIds ?? []).length > 1 ? ` +${(r.teacherIds ?? []).length - 1}` : ''
    return `${r.teacherName}${extra}`
  }
  return '—'
}

// Add / edit live on their own page (form too long for a modal).
function goAdd(): void {
  router.push({ path: '/admin/routine/new', query: { type: mode.value } })
}
function openEdit(r: Routine): void {
  router.push({ path: `/admin/routine/${r.id}/edit`, query: { type: r.routineType } })
}

// ---------- delete ----------
const confirm = ref({ open: false, id: '', message: '' })
const deleting = ref(false)
const { mutateAsync: deleteRoutine } = useDeleteRoutine()
function askRemove(id: string): void {
  confirm.value = { open: true, id, message: 'Delete this routine entry?' }
}
async function doRemove(): Promise<void> {
  deleting.value = true
  try {
    await deleteRoutine(confirm.value.id)
    toast.success('Routine deleted')
    confirm.value.open = false
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  } finally {
    deleting.value = false
  }
}

// Weekly holidays (Settings → Friday etc.): dimmed in grid.
const { data: settingsData } = useSettings()
const offDays = computed<WeekDay[]>(() => {
  const raw = settingsData.value?.data.weeklyHolidays ?? []
  return (WEEK_DAYS as string[]).filter((d) => raw.map((x) => String(x).slice(0, 3)).includes(d)) as WeekDay[]
})
const isOffDay = (day: WeekDay): boolean => offDays.value.includes(day)

// ---------- export ----------
const schoolName = computed(() => settingsData.value?.data.schoolName || 'School')
function exportCsv(): void {
  downloadCsv(
    `routine-${mode.value}-${Date.now()}.csv`,
    ['Day', 'Date', 'Time', 'Subject', 'Teacher', 'Room', 'Class'],
    visibleRows.value.map((r) => [dayLabel(r.day), r.date || '', `${r.startTime}-${r.endTime}`, subjectText(r), teacherText(r), r.room || '', classLabel(r.classId)]),
  )
}
function exportPdf(): void {
  routinePdf({
    schoolName: schoolName.value,
    title: `${mode.value === 'class' ? 'Class Routine' : 'Exam Routine'}${classId.value ? ` — ${classLabel(classId.value)}` : ''}`,
    rows: visibleRows.value.map((r) => ({
      day: mode.value === 'exam' && r.date ? `${r.date} (${r.day})` : dayLabel(r.day),
      time: `${r.startTime}-${r.endTime}`,
      subject: subjectText(r),
      teacher: teacherText(r),
      room: r.room || '—',
      classLabel: classLabel(r.classId),
    })),
  })
}
function printPage(): void {
  printWithTitle(`${schoolName.value} - ${mode.value === 'class' ? 'Class' : 'Exam'} Routine`)
  window.print()
}
</script>

<style scoped>
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}
.page__actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}
.mode-row {
  display: inline-flex;
  gap: 4px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 4px;
  margin-bottom: var(--spacing-md);
}
.mode-btn {
  background: none;
  border: none;
  padding: 6px 16px;
  font: inherit;
  font-size: var(--font-size-sm);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  cursor: pointer;
}
.mode-btn--active {
  background: var(--color-surface);
  color: var(--color-text);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}
.search-wrap {
  position: relative;
  flex: 1;
  min-width: 200px;
}
.suggest {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 40;
  list-style: none;
  margin: 0;
  padding: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}
.suggest button {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: var(--spacing-xs) var(--spacing-sm);
  font: inherit;
  font-size: var(--font-size-sm);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.suggest button:hover {
  background: var(--color-primary-light);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.table-scroll {
  overflow-x: auto;
}
.grid {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.grid th,
.grid td {
  text-align: left;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  vertical-align: top;
}
.grid thead th {
  background: var(--color-surface-alt);
}
.grid__day {
  font-weight: 700;
  white-space: nowrap;
  background: var(--color-surface-alt);
  min-width: 110px;
}
.row--off td {
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
}
.grid__cell {
  min-width: 180px;
}
.off-badge {
  display: inline-block;
  padding: 0 var(--spacing-xs);
  border-radius: var(--radius-full);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-weight: 400;
}
.cell-entry {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--spacing-xs) 0;
  border-bottom: 1px dashed var(--color-border);
}
.cell-entry:last-child {
  border-bottom: none;
}
.cell-actions {
  display: flex;
  gap: var(--spacing-sm);
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
.row-actions {
  text-align: right;
  white-space: nowrap;
}
.link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.link-btn--danger {
  color: var(--color-danger);
}
.exam-group {
  margin-bottom: var(--spacing-lg);
}
.exam-group__title {
  font-size: var(--font-size-base);
  font-weight: 700;
  margin: 0 0 var(--spacing-sm);
}
@media print {
  .page__head,
  .mode-row,
  .no-print .AppCard,
  .cell-actions,
  .row-actions {
    display: none !important;
  }
}
</style>
