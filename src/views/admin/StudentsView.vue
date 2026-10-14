<template>
  <div class="page">
    <div class="page__head">
      <h1 class="page__title">Students</h1>
      <div class="page__actions">
        <AppButton variant="ghost" type="button" :disabled="exporting || total === 0" @click="exportCsv">{{ exporting ? 'Loading…' : 'CSV' }}</AppButton>
        <AppButton variant="ghost" type="button" :disabled="exporting || total === 0" @click="exportPdf">{{ exporting ? 'Loading…' : 'PDF' }}</AppButton>
        <AppButton @click="goAdmit">+ Admit Student</AppButton>
      </div>
    </div>

    <AppCard>
      <FilterPanel>
        <input v-model="filters.search" class="app-input__control" placeholder="Search name / roll / card…" />
        <select v-model="filters.gender" class="app-input__control">
          <option value="">All genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <select v-model="filters.classId" class="app-input__control">
          <option value="">All classes</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
        </select>
        <select v-model="filters.sectionId" class="app-input__control" :disabled="!filters.classId">
          <option value="">All sections</option>
          <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select>
        <select
          v-if="filterClass?.hasDepartments"
          v-model="filters.departmentId"
          class="app-input__control"
        >
          <option value="">All departments</option>
          <option v-for="d in filterDepartments" :key="d.id" :value="d.id">{{ d.label }}</option>
        </select>
      </FilterPanel>

      <p v-if="isLoading" class="muted">Loading…</p>
      <p v-else-if="isError" class="error">Failed to load students.</p>
      <div v-else class="table-scroll">
      <table class="table">
        <thead>
          <tr><th>Name</th><th>Roll</th><th>Class</th><th>Dept</th><th>Due (৳)</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="s in rows" :key="s.id">
            <td>
              <span class="name-cell">
                <StudentAvatar :photo-url="s.photoUrl" :name="s.name" :gender="s.gender" :size="32" />
                <RouterLink :to="`/admin/students/${s.id}`" class="link">{{ s.name }}</RouterLink>
              </span>
            </td>
            <td>{{ s.roll }}</td>
            <td>{{ classLabel(s.classId) }}</td>
            <td>{{ deptLabel(s.departmentId) }}</td>
            <td>{{ s.dueAmount }}</td>
            <td><span class="chip">{{ s.status }}</span></td>
            <td class="row-actions-cell">
              <span class="row-actions">
                <button class="link-btn" type="button" @click="goDetails(s.id)">Details</button>
                <button class="link-btn" type="button" @click="goEdit(s.id)">Edit</button>
                <button class="link-btn link-btn--danger" type="button" @click="askDelete(s.id, s.name)">Delete</button>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      <AppPagination v-model:page="page" v-model:per-page="perPage" :total="total" />
    </AppCard>

    <!-- Edit lives on its own page: /admin/students/:id/edit -->

    <AppConfirmDialog
      :open="confirm.open"
      :message="confirm.message"
      :busy="deleting"
      @cancel="confirm.open = false"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import StudentAvatar from '@/components/common/StudentAvatar.vue'
import {
  useClasses,
  useDeleteStudent,
  useDepartments,
  useSections,
  useSettings,
  useStudents,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { downloadCsv, studentsPdf } from '@/utils/pdf'
import { studentService } from '@/services'
import type { Student } from '@/types/models'

const toast = useToast()
const filters = reactive({ search: '', gender: '', classId: '', sectionId: '', departmentId: '' })
const page = ref(1)
const perPage = ref(10)
watch(filters, () => {
  page.value = 1
})
watch(perPage, () => {
  page.value = 1
})

const params = computed(() => ({
  search: filters.search || undefined,
  gender: filters.gender || undefined,
  classId: filters.classId || undefined,
  sectionId: filters.sectionId || undefined,
  departmentId: filters.departmentId || undefined,
  page: page.value,
  perPage: perPage.value,
}))

const { data, isLoading, isError } = useStudents(params)
const rows = computed(() => data.value?.data.items ?? [])
const total = computed(() => data.value?.data.pagination.total ?? 0)

const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])
const classLabel = (id: string): string => classes.value.find((c) => c.id === id)?.label ?? id

const { data: sectionData } = useSections(() => filters.classId || undefined)
const sections = computed(() => sectionData.value?.data ?? [])
watch(() => filters.classId, () => {
  filters.sectionId = ''
  filters.departmentId = ''
})

const filterClass = computed(() => classes.value.find((c) => c.id === filters.classId))
const { data: filterDeptData } = useDepartments(() => filters.classId || undefined)
const filterDepartments = computed(() => filterDeptData.value?.data ?? [])
const { data: allDeptData } = useDepartments(undefined)
const deptLabel = (id: string | null): string =>
  id ? (allDeptData.value?.data.find((d) => d.id === id)?.label ?? '—') : '—'

const router = useRouter()

function goAdmit(): void {
  router.push('/admin/students/new')
}

function goDetails(id: string): void {
  router.push(`/admin/students/${id}`)
}

function goEdit(id: string): void {
  router.push(`/admin/students/${id}/edit`)
}

// ---------- export (full filtered list, backend caps at 500) ----------
const { data: settingsData } = useSettings()
const schoolName = computed(() => settingsData.value?.data.schoolName || 'School')
const exporting = ref(false)

async function fetchAllFiltered(): Promise<Student[]> {
  const res = await studentService.list({
    search: filters.search || undefined,
    gender: filters.gender || undefined,
    classId: filters.classId || undefined,
    sectionId: filters.sectionId || undefined,
    departmentId: filters.departmentId || undefined,
    page: 1,
    perPage: 500,
  })
  return res.data.items ?? []
}
function filterNote(): string {
  const parts = [
    filters.classId ? classLabel(filters.classId) : '',
    filters.search ? `search:${filters.search}` : '',
  ].filter(Boolean)
  return parts.join(' ') || 'All students'
}
async function exportCsv(): Promise<void> {
  exporting.value = true
  try {
    const all = await fetchAllFiltered()
    downloadCsv(
      `students-${Date.now()}.csv`,
      ['SL', 'Name', 'Roll', 'Class', 'Dept', 'Phone', 'Guardian', 'Due (Tk)', 'Status'],
      all.map((s, i) => [i + 1, s.name, String(s.roll ?? ''), classLabel(s.classId), deptLabel(s.departmentId), s.phone || '', s.guardianName || '', Number(s.dueAmount) || 0, s.status]),
    )
    toast.success(`${all.length} students exported`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Export failed')
  } finally {
    exporting.value = false
  }
}
async function exportPdf(): Promise<void> {
  exporting.value = true
  try {
    const all = await fetchAllFiltered()
    studentsPdf({
      schoolName: schoolName.value,
      filterNote: filterNote(),
      rows: all.map((s) => ({
        name: s.name,
        roll: String(s.roll ?? ''),
        classLabel: classLabel(s.classId),
        dept: deptLabel(s.departmentId),
        due: Number(s.dueAmount) || 0,
        status: s.status,
      })),
    })
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Export failed')
  } finally {
    exporting.value = false
  }
}

// ---------- delete ----------
const confirm = ref({ open: false, id: '', message: '' })
const deleting = ref(false)
const { mutateAsync: deleteStudent } = useDeleteStudent()

function askDelete(id: string, name: string): void {
  confirm.value = { open: true, id, message: `Remove student "${name}"?` }
}

async function doDelete(): Promise<void> {
  deleting.value = true
  try {
    await deleteStudent(confirm.value.id)
    toast.success('Student removed')
    confirm.value.open = false
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
  align-items: center;
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}
.page__actions {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}
.muted {
  color: var(--color-text-muted);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.table th,
.table td {
  text-align: left;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}
/* Edge cells keep the exact same inset on both sides, and the wrapper
   scrolls instead of spilling past the card on narrow screens. */
.table th:first-child,
.table td:first-child {
  padding-left: var(--spacing-md);
}
.table th:last-child,
.table td:last-child {
  padding-right: var(--spacing-md);
}
.table-scroll {
  overflow-x: auto;
}
.link {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}
.name-cell {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.chip {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  font-size: var(--font-size-xs);
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
  cursor: pointer;
}
.link-btn--danger {
  color: var(--color-danger);
}
</style>
