<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Card IDs</h1>
        <p class="page__hint">Issue RFID/ID cards to students — attendance is taken with these cards on the reader. Track who has one and who is still missing.</p>
      </div>
    </div>

    <div class="chips">
      <span class="chip">
        <AppSkeleton v-if="assignedLoading" variant="chip" :width="'88px'" />
        <template v-else>{{ assignedCount }} assigned</template>
      </span>
      <span class="chip chip--warn">
        <AppSkeleton v-if="missingLoading" variant="chip" :width="'88px'" />
        <template v-else>{{ unassignedCount }} missing</template>
      </span>
    </div>

    <AppCard>
      <FilterPanel>
        <input v-model="filters.search" class="app-input__control" placeholder="Search name / roll / card…" />
        <select v-model="filters.classId" class="app-input__control">
          <option value="">All classes</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
        </select>
        <select v-model="filters.hasCard" class="app-input__control">
          <option value="">All students</option>
          <option value="yes">Card assigned</option>
          <option value="no">Card missing</option>
        </select>
      </FilterPanel>

      <AppSkeleton v-if="isLoading" variant="table" :rows="8" :cols="5" />
      <p v-else-if="isError" class="error">Failed to load students.</p>
      <div v-else class="table-block" :class="{ 'is-fetching': isFetching && !isLoading }">
      <table class="table">
        <thead>
          <tr><th>Name</th><th>Roll</th><th>Class</th><th>Card ID</th><th></th></tr>
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
            <td>
              <span :class="['cardid', { 'cardid--missing': !s.cardId }]">
                {{ s.cardId || '— missing' }}
              </span>
            </td>
            <td class="row-actions-cell">
              <span class="row-actions">
                <button class="link-btn" type="button" @click="startEdit(s)">{{ s.cardId ? 'Edit' : 'Assign' }}</button>
                <button
                  v-if="s.cardId"
                  class="link-btn link-btn--danger"
                  type="button"
                  :disabled="savingId === s.id"
                  @click="removeCard(s.id, s.name)"
                >
                  <AppSpinner v-if="savingId === s.id" size="sm" label="Working" />
                  <template v-else>Remove</template>
                </button>
              </span>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="5" class="muted">No students match.</td>
          </tr>
        </tbody>
      </table>
      </div>

      <AppPagination v-model:page="page" v-model:per-page="perPage" :total="total" :busy="isFetching" />
    </AppCard>

    <Teleport to="body">
      <div v-if="modalStudent" class="modal-backdrop" @click.self="cancelEdit">
        <div class="modal" role="dialog" aria-modal="true">
          <h3 class="modal__title">{{ modalStudent.cardId ? 'Edit card' : 'Assign card' }}</h3>
          <p class="modal__sub">{{ modalStudent.name }} · Roll {{ modalStudent.roll }} · {{ classLabel(modalStudent.classId) }}</p>
          <label>Card ID
            <input
              ref="cardInput"
              v-model="editValue"
              class="app-input__control"
              placeholder="e.g. RFID card number"
              @keyup.enter="saveCard"
              @keyup.escape="cancelEdit"
            />
          </label>
          <p v-if="formError" class="error">{{ formError }}</p>
          <div class="modal__actions">
            <AppButton variant="ghost" type="button" @click="cancelEdit">Cancel</AppButton>
            <AppButton type="button" :loading="saving" @click="saveCard">Save</AppButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, useTemplateRef, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import StudentAvatar from '@/components/common/StudentAvatar.vue'
import { useClasses, useStudents, useUpdateStudent } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import type { Student } from '@/types/models'

const toast = useToast()
const filters = reactive({ search: '', classId: '', hasCard: '' })
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
  classId: filters.classId || undefined,
  hasCard: filters.hasCard || undefined,
  page: page.value,
  perPage: perPage.value,
}))

const { data, isLoading, isFetching, isError } = useStudents(params)
const rows = computed(() => data.value?.data.items ?? [])
const total = computed(() => data.value?.data.pagination.total ?? 0)

// Summary chips need both sides regardless of the active filter.
const { data: assignedData, isLoading: assignedLoading } = useStudents({ hasCard: 'yes', perPage: 1 })
const { data: missingData, isLoading: missingLoading } = useStudents({ hasCard: 'no', perPage: 1 })
const assignedCount = computed(() => assignedData.value?.data.pagination.total ?? 0)
const unassignedCount = computed(() => missingData.value?.data.pagination.total ?? 0)

const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])
const classLabel = (id: string): string => classes.value.find((c) => c.id === id)?.label ?? id

const modalStudent = ref<Student | null>(null)
const editValue = ref('')
const cardInput = useTemplateRef<HTMLInputElement>('cardInput')
// Modal opens → focus the input at once, so a card-reader scan (or typing)
// lands straight in the box with no extra click. Enter saves (see template).
watch(modalStudent, (s) => {
  if (!s) return
  nextTick(() => {
    cardInput.value?.focus()
    cardInput.value?.select()
  })
})
const saving = ref(false)
const savingId = ref('')
const formError = ref('')
const { mutateAsync: updateStudent } = useUpdateStudent()

function startEdit(s: Student): void {
  formError.value = ''
  modalStudent.value = s
  editValue.value = s.cardId ?? ''
}

function cancelEdit(): void {
  modalStudent.value = null
  editValue.value = ''
  formError.value = ''
}

async function saveCard(): Promise<void> {
  const s = modalStudent.value
  if (!s || saving.value) return
  formError.value = ''
  saving.value = true
  try {
    await updateStudent({ id: s.id, input: { cardId: editValue.value.trim() } })
    toast.success(editValue.value.trim() ? 'Card assigned' : 'Card removed')
    modalStudent.value = null
    editValue.value = ''
  } catch (e) {
    // Duplicate card numbers are rejected by the API (one card, one student).
    const data = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
    const fieldError = data?.errors?.cardId?.[0] ?? data?.errors?.card_id?.[0] ?? ''
    formError.value = fieldError || (e instanceof Error ? e.message : 'Save failed')
  } finally {
    saving.value = false
  }
}

async function removeCard(id: string, name: string): Promise<void> {
  formError.value = ''
  savingId.value = id
  try {
    await updateStudent({ id, input: { cardId: '' } })
    toast.success(`Card removed from "${name}"`)
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    savingId.value = ''
  }
}
</script>

<style scoped>
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}
.page__hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.chips {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}
.chip {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  font-size: var(--font-size-xs);
}
.chip--warn {
  background: var(--color-warning-light, var(--color-primary-light));
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
/* Outer block lives on a wrapper (border-collapse + radius on the table
   itself leaves cell-border seams when a row grows in edit mode). */
.table-block {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow-x: auto;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  table-layout: fixed;
  /* Locked columns (64+92+220+168) must leave the name column room —
     below 760px the fixed layout collapsed the name to ~0px. */
  min-width: 760px;
}
.table th,
.table td {
  text-align: left;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}
.table thead th {
  background: var(--color-surface-alt);
  font-weight: var(--font-weight-semibold);
  border-bottom: 1px solid var(--color-border);
}
.table tbody tr:last-child td {
  border-bottom: none;
}
/* Locked widths so Assign/Edit never pushes columns around. */
.table th:nth-child(2),
.table td:nth-child(2) {
  width: 64px;
}
.table th:nth-child(3),
.table td:nth-child(3) {
  width: 92px;
}
.table th:nth-child(4),
.table td:nth-child(4) {
  width: 220px;
}
.table th:nth-child(5),
.table td:nth-child(5) {
  width: 168px;
}
.table td:nth-child(1) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.cardid--missing {
  color: var(--color-warning, var(--color-danger));
  font-weight: var(--font-weight-medium);
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
.link-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.link-btn--danger {
  color: var(--color-danger);
}
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
  width: min(400px, 100%);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.modal__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin: 0;
}
.modal__sub {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin: 0;
}
.modal label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}
</style>
