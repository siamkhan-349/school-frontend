<template>
  <div class="page">
    <div class="page__head">
      <h1 class="page__title">Exams</h1>
      <AppButton @click="goNew">+ New Exam</AppButton>
    </div>

    <AppCard>
      <FilterPanel>
        <select v-model="classId" class="app-input__control">
          <option value="">All classes</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
        </select>
      </FilterPanel>

      <p v-if="isLoading" class="muted">Loading…</p>
      <table v-else class="table">
        <thead>
          <tr><th>Name</th><th>Date</th><th>Class</th><th>Full/Pass</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="e in rows" :key="e.id">
            <td><RouterLink :to="`/admin/exams/${e.id}`" class="link">{{ e.name }}</RouterLink></td>
            <td>{{ e.examDate }}</td>
            <td>{{ classLabel(e.classId) }}</td>
            <td>{{ e.fullMarks }}/{{ e.passMarks }}</td>
            <td><span class="chip" :class="`chip--${e.status}`">{{ e.status }}</span></td>
            <td class="row-actions-cell">
              <span class="row-actions">
              <button v-if="e.status !== 'published'" class="link-btn" type="button" @click="setStatus(e.id, 'published')">
                Publish
              </button>
              <button v-else class="link-btn" type="button" @click="setStatus(e.id, 'active')">
                Unpublish
              </button>
              <button class="link-btn link-btn--danger" type="button" @click="askDelete(e.id, e.name)">
                Delete
              </button>
              </span>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="6" class="muted">No exams yet.</td>
          </tr>
        </tbody>
      </table>

      <AppPagination v-model:page="page" v-model:per-page="perPage" :total="total" />
    </AppCard>

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
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import {
  useClasses,
  useDeleteExam,
  useExams,
  useExamStatus,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import type { ExamStatus } from '@/types/models'

const toast = useToast()
const router = useRouter()
function goNew(): void {
  router.push('/admin/exams/new')
}
const classId = ref('')
const page = ref(1)
const perPage = ref(10)
watch(classId, () => {
  page.value = 1
})
watch(perPage, () => {
  page.value = 1
})

const params = computed(() => ({
  classId: classId.value || undefined,
  page: page.value,
  perPage: perPage.value,
}))
const { data, isLoading } = useExams(params)
const rows = computed(() => data.value?.data.items ?? [])
const total = computed(() => data.value?.data.pagination.total ?? 0)

const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])
const classLabel = (id: string): string => classes.value.find((c) => c.id === id)?.label ?? id

const { mutateAsync: changeStatus } = useExamStatus()
const { mutateAsync: deleteExam } = useDeleteExam()

async function setStatus(id: string, status: ExamStatus): Promise<void> {
  try {
    await changeStatus({ id, status })
    toast.success(status === 'published' ? 'Result published — parents can now see it' : 'Exam updated')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}

const confirm = ref({ open: false, id: '', message: '' })
const deleting = ref(false)

function askDelete(id: string, name: string): void {
  confirm.value = { open: true, id, message: `Delete exam "${name}" and all its marks?` }
}

async function doDelete(): Promise<void> {
  deleting.value = true
  try {
    await deleteExam(confirm.value.id)
    toast.success('Exam removed')
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
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
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
.link {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}
.chip {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  font-size: var(--font-size-xs);
  text-transform: capitalize;
}
.chip--published {
  background: var(--color-success-light);
  color: var(--color-success);
}
.chip--draft {
  background: var(--color-warning-light);
  color: var(--color-warning);
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
