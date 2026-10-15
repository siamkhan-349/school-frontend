<template>
  <div class="page">
    <div class="page__head">
      <div>
        <button class="link-btn" type="button" @click="goBack">← Attendance</button>
        <h1 class="page__title">{{ pageTitle }}</h1>
        <p class="page__hint">{{ dayRows.length }} records · click a tab to switch status</p>
      </div>
      <div class="page__actions">
        <AppButton variant="ghost" type="button" :disabled="filtered.length === 0" @click="exportCsv">CSV</AppButton>
        <AppButton variant="ghost" type="button" :disabled="filtered.length === 0" @click="exportPdf">PDF</AppButton>
        <AppButton
          v-if="status === 'absent' || status === 'late'"
          type="button"
          :disabled="filtered.length === 0"
          @click="askDaySms"
        >SMS Guardians ({{ filtered.length }})</AppButton>
      </div>
    </div>

    <AppCard>
      <div class="tabs">
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          :class="['tab', `tab--${t.key}`, { 'tab--active': status === t.key }]"
          @click="status = t.key"
        >
          {{ t.label }} ({{ counts[t.key] }})
        </button>
      </div>
      <FilterPanel>
        <input v-model="search" class="app-input__control" placeholder="Search name / roll…" />
      </FilterPanel>
      <p v-if="isLoading && dayRows.length === 0" class="muted">Loading day sheet…</p>
      <p v-else-if="isError" class="error">Failed to load. <button class="link-btn" type="button" @click="refetch">Retry</button></p>
      <table v-else class="table">
        <thead>
          <tr><th>SL</th><th>Student</th><th>Roll</th><th>Class</th><th>Entry</th><th>Exit</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="(s, i) in paged" :key="s.studentId">
            <td>{{ (page - 1) * perPage + i + 1 }}</td>
            <td>{{ s.studentName }}</td>
            <td>{{ s.roll ?? '—' }}</td>
            <td>{{ s.classLabel || '—' }}</td>
            <td>{{ s.entryTime || '—' }}</td>
            <td>{{ s.exitTime || '—' }}</td>
            <td class="row-actions">
              <RouterLink :to="{ path: `/admin/attendance/student/${s.studentId}`, query: { name: s.studentName ?? '' } }" class="link-btn">Details</RouterLink>
            </td>
          </tr>
          <tr v-if="paged.length === 0">
            <td colspan="7" class="muted">No records in this list.</td>
          </tr>
        </tbody>
      </table>
      <AppPagination v-model:page="page" v-model:per-page="perPage" :total="filtered.length" />
    </AppCard>

    <AppConfirmDialog
      :open="smsConfirm.open"
      :title="status === 'late' ? 'Late SMS?' : 'Absent SMS?'"
      :message="smsConfirm.message"
      confirm-text="Send SMS"
      confirm-variant="primary"
      :busy="sendingSms"
      @cancel="smsConfirm.open = false"
      @confirm="doDaySms"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import { useAttendanceDay, useSendBulkSms, useSettings, useSmsTemplates } from '@/composables/useQueries'
import { usePagedList } from '@/composables/usePagedList'
import { useToast } from '@/composables/useToast'
import { attendanceDayPdf, downloadCsv } from '@/utils/pdf'

type StatusKey = 'present' | 'absent' | 'late' | 'leave'
const tabs: { key: StatusKey; label: string }[] = [
  { key: 'present', label: 'Present' },
  { key: 'absent', label: 'Absent' },
  { key: 'late', label: 'Late' },
  { key: 'leave', label: 'Leave' },
]

const route = useRoute()
const router = useRouter()
const date = computed(() => String(route.params.date || ''))
const status = ref<StatusKey>(
  (['present', 'absent', 'late', 'leave'] as StatusKey[]).includes(route.query.status as StatusKey)
    ? (route.query.status as StatusKey)
    : 'present',
)

const { data, isLoading, isError, refetch } = useAttendanceDay(date)
const dayRows = computed(() => data.value?.data ?? [])
const counts = computed<Record<StatusKey, number>>(() => ({
  present: dayRows.value.filter((r) => r.status === 'present').length,
  absent: dayRows.value.filter((r) => r.status === 'absent').length,
  late: dayRows.value.filter((r) => r.status === 'late').length,
  leave: dayRows.value.filter((r) => r.status === 'leave' || r.status === 'holiday').length,
}))
const filtered = computed(() => {
  const base = status.value === 'leave'
    ? dayRows.value.filter((r) => r.status === 'leave' || r.status === 'holiday')
    : dayRows.value.filter((r) => r.status === status.value)
  const q = search.value.trim().toLowerCase()
  if (!q) return base
  return base.filter(
    (r) => (r.studentName || '').toLowerCase().includes(q) || String(r.roll ?? '').includes(q),
  )
})

const search = ref('')
const { page, perPage } = usePagedList(10)
watch([status, search, date], () => {
  page.value = 1
})
const paged = computed(() => {
  const start = (page.value - 1) * perPage.value
  return filtered.value.slice(start, start + perPage.value)
})

const pageTitle = computed(() => `${date.value} — ${tabs.find((t) => t.key === status.value)?.label}`)
function goBack(): void {
  router.push('/admin/attendance')
}

const { data: settingsData } = useSettings()
const schoolName = computed(() => settingsData.value?.data.schoolName || 'School')

// Absent + Late tab: oi date er student der guardian ke SMS.
// Absent → Absent Alert template (absentDate auto-filled). Late → late minutes
// computed from entry time, each person messaged with their own time.
const toast = useToast()
const { data: tplData } = useSmsTemplates()
const attendanceTemplates = computed(() => (tplData.value?.data ?? []).filter((t) => t.type === 'attendance'))
// Absent Alert vs Late Alert — matched by name (both are attendance type).
const absentTemplate = computed(
  () => attendanceTemplates.value.find((t) => /absent/i.test(t.name)) ?? attendanceTemplates.value[0],
)
const lateTemplate = computed(() => attendanceTemplates.value.find((t) => /late/i.test(t.name)))
const { mutateAsync: sendBulk, isPending: sendingSms } = useSendBulkSms()
const smsConfirm = ref({ open: false, message: '' })
const schoolStart = computed(() => settingsData.value?.data.schoolStartTime || '')

function toMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || '')
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}
function lateMinutesOf(entryTime: string): number | null {
  const start = toMinutes(schoolStart.value)
  const entry = toMinutes(entryTime)
  if (start == null || entry == null) return null
  return Math.max(0, entry - start)
}

function askDaySms(): void {
  const label = status.value === 'late' ? 'late' : 'absent'
  smsConfirm.value = {
    open: true,
    message: `${date.value} — send SMS to guardians of ${filtered.value.length} ${label} students?`,
  }
}
async function doDaySms(): Promise<void> {
  // Formats come only from super-admin SMS Control — no hardcoded fallback.
  // If the template was deleted, sending is blocked with directions on where to recreate it.
  const isLate = status.value === 'late'
  const tpl = isLate ? lateTemplate.value : absentTemplate.value
  if (!tpl) {
    toast.error(
      isLate
        ? 'No Late Alert template — ask a super admin to create it on the SMS Control page.'
        : 'No Absent Alert template — ask a super admin to create it on the SMS Control page.',
    )
    return
  }
  try {
    const res = await sendBulk({
      templateId: tpl.id,
      recipients: filtered.value.map((s) => ({
        recipientId: s.studentId,
        recipientType: 'guardian',
        variables: isLate
          ? {
              lateMinutes: String(lateMinutesOf(s.entryTime || '') ?? ''),
              entryTime: s.entryTime || '',
            }
          : undefined,
      })),
      variables: { absentDate: date.value },
    })
    smsConfirm.value.open = false
    const failed = res.data.failed ?? []
    toast.success(
      res.data.sent > 0 ? `${res.data.sent} SMS sent` : 'No one could be reached (no phone numbers)',
    )
    if (failed.length > 0) toast.error(`${failed.length} have no phone number`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}
function exportCsv(): void {
  downloadCsv(
    `attendance-${date.value}-${status.value}.csv`,
    ['SL', 'Student', 'Roll', 'Class', 'Entry', 'Exit'],
    filtered.value.map((s, i) => [i + 1, s.studentName || '', String(s.roll ?? ''), s.classLabel || '', s.entryTime || '', s.exitTime || '']),
  )
}
function exportPdf(): void {
  attendanceDayPdf({
    schoolName: schoolName.value,
    date: date.value,
    status: tabs.find((t) => t.key === status.value)?.label ?? status.value,
    rows: filtered.value.map((s) => ({
      name: s.studentName || '',
      roll: String(s.roll ?? ''),
      classLabel: s.classLabel || '',
      entry: s.entryTime || '',
      exit: s.exitTime || '',
    })),
  })
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
  margin: var(--spacing-xs) 0;
}
.page__hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin: 0;
}
.page__actions {
  display: flex;
  gap: var(--spacing-sm);
}
.link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.tabs {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-md);
}
.tab {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: var(--radius-full);
  padding: 6px 14px;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
}
.tab--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}
.tab--present:not(.tab--active) {
  color: var(--color-success, green);
}
.tab--absent:not(.tab--active) {
  color: var(--color-danger);
}
.tab--late:not(.tab--active) {
  color: var(--color-warning, #b45309);
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
.muted {
  color: var(--color-text-muted);
}
.error {
  color: var(--color-danger);
}
</style>
