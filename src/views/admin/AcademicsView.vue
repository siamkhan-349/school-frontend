<template>
  <div class="page">
    <h1 class="page__title">Academic Setup</h1>
    <p class="page__hint">Classes are defined once and shared by every session — a new year never duplicates them. Open a class to manage its departments and subjects inside.</p>

    <div class="top-grid">
      <AppCard>
        <div class="card-head">
          <h3 class="card-head__title">Sessions</h3>
          <AppButton @click="openSessionAdd">+ Add Session</AppButton>
        </div>
        <AppSkeleton v-if="sessionsLoading" variant="list" :rows="3" />
        <ul v-else class="list">
          <li v-for="s in sessions" :key="s.id" class="list__row">
            <span>{{ s.label }}</span>
            <span class="row-btns">
              <button class="link-btn" type="button" @click="openSessionEdit(s)">Edit</button>
              <button class="link-btn link-btn--danger" type="button" @click="askDeleteSession(s.id, s.label)">Remove</button>
            </span>
          </li>
        </ul>
      </AppCard>

      <AppCard v-if="school.hasModule('payment')">
        <div class="card-head">
          <h3 class="card-head__title">Fees</h3>
        </div>
        <p class="muted">Fees are named per class now — set them from Fee Management.</p>
        <AppButton variant="ghost" type="button" @click="goFees">Open Fee Management →</AppButton>
      </AppCard>
    </div>

    <AppCard>
      <div class="card-head">
        <h3 class="card-head__title">Classes</h3>
        <AppButton @click="goAddClass">+ Add Class</AppButton>
      </div>
      <AppSkeleton v-if="classesLoading" variant="table" :rows="6" :cols="6" />
      <p v-else-if="!allClasses.length" class="muted">No classes yet — use + Add Class to create the first one.</p>
      <template v-else>
        <p class="drag-hint muted">Drag a row to reorder the ladder — drop it on the bottom strip to send it last.</p>
        <table class="table">
          <thead>
            <tr><th>Order</th><th>Class</th><th>Subjects</th><th>Sections</th><th>Departments</th><th></th></tr>
          </thead>
          <tbody>
            <tr
              v-for="(c, i) in allClasses"
              :key="c.id"
              class="table__row"
              draggable="true"
              :class="{ 'is-dragging': dragId === c.id, 'is-drop-target': dragOverIndex === i }"
              @click="openClass(c.id)"
              @dragstart="onDragStart(c, $event)"
              @dragover.prevent="onDragOver(i)"
              @drop.prevent="onDrop(i)"
              @dragend="onDragEnd"
            >
              <td class="muted">{{ c.sortOrder }}</td>
              <td><strong>{{ c.label }}</strong> <em v-if="c.hasDepartments" class="badge">dept</em></td>
              <td>{{ subjectCount(c.id) }}</td>
              <td class="muted">{{ sectionNames(c.id) }}</td>
              <td class="muted">{{ c.hasDepartments ? deptNames(c.id) : '—' }}</td>
              <td class="row-actions"><button class="link-btn" type="button" @click.stop="openClass(c.id)">Manage →</button></td>
            </tr>
            <tr
              v-if="dragId"
              class="table__drop-end"
              :class="{ 'is-drop-target': dragOverEnd }"
              @dragover.prevent="onDragOverEnd"
              @drop.prevent="onDropEnd"
            >
              <td colspan="6">Drop here to send the class to the bottom</td>
            </tr>
          </tbody>
        </table>
      </template>
    </AppCard>

    <!-- Add / edit session modal -->
    <Teleport to="body">
      <div v-if="showSessionModal" class="modal-backdrop" @click.self="showSessionModal = false">
        <div class="modal">
          <h3 class="modal__title">{{ editingSessionId ? 'Edit Session' : 'Add Session' }}</h3>
          <form class="modal__form" @submit.prevent="saveSession">
            <label>Session label<input v-model="sessionLabel" class="app-input__control" placeholder="e.g. 2027" required /></label>
            <label>Start date<input v-model="sessionStart" type="date" class="app-input__control" /></label>
            <label>End date<input v-model="sessionEnd" type="date" class="app-input__control" /></label>
            <div class="form-actions">
              <AppButton variant="ghost" type="button" @click="showSessionModal = false">Cancel</AppButton>
              <AppButton type="submit" :loading="savingSession">{{ editingSessionId ? 'Save' : 'Add' }}</AppButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <AppConfirmDialog
      :open="confirm.open"
      :message="confirm.message"
      :busy="confirmBusy"
      @cancel="confirm.open = false"
      @confirm="doDeleteSession"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import {
  useClasses,
  useCreateSession,
  useDeleteSession,
  useDepartments,
  useReorderClasses,
  useSections,
  useSessions,
  useSubjects,
  useUpdateSession,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { useSchoolStore } from '@/stores/school'
import type { AcademicSession, SchoolClass } from '@/types/models'

const school = useSchoolStore()
const toast = useToast()
const router = useRouter()
const { data: sessionData, isLoading: sessionsLoading } = useSessions()
const { data: classData, isLoading: classesLoading } = useClasses()
const { data: allSectionData } = useSections(undefined)
const { data: subjectData } = useSubjects(undefined)
const { data: allDeptData } = useDepartments(undefined)

const sessions = computed(() => sessionData.value?.data ?? [])
// Ladder order first (PG=1 … Class 10), numeric label tiebreak so
// "Class 10" comes after "Class 9", not after "Class 1".
const allClasses = computed(() =>
  [...(classData.value?.data ?? [])].sort((a, b) =>
    a.sortOrder - b.sortOrder
    || a.label.localeCompare(b.label, undefined, { numeric: true }),
  ),
)
const allSections = computed(() => allSectionData.value?.data ?? [])
const allSubjects = computed(() => subjectData.value?.data ?? [])
const allDepartments = computed(() => allDeptData.value?.data ?? [])

function sectionNames(classId: string): string {
  const labels = allSections.value.filter((s) => s.classId === classId).map((s) => s.label)
  return labels.length ? labels.join(', ') : '—'
}
function subjectCount(classId: string): number {
  return allSubjects.value.filter((s) => s.classId === classId).length
}
function deptNames(classId: string): string {
  const labels = allDepartments.value.filter((d) => d.classId === classId).map((d) => d.label)
  return labels.length ? labels.join(', ') : '—'
}
function openClass(id: string): void {
  router.push(`/admin/academics/${id}`)
}

const sessionLabel = ref('')
const sessionStart = ref('')
const sessionEnd = ref('')
const showSessionModal = ref(false)
const editingSessionId = ref('')

const { mutateAsync: createSession } = useCreateSession()
const { mutateAsync: updateSession } = useUpdateSession()
const { mutateAsync: deleteSession } = useDeleteSession()
const { mutateAsync: reorderClasses } = useReorderClasses()

const dragId = ref('')
const dragOverIndex = ref<number | null>(null)
const dragOverEnd = ref(false)
const reordering = ref(false)

function onDragStart(c: SchoolClass, e: DragEvent): void {
  dragId.value = c.id
  e.dataTransfer?.setData('text/plain', c.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(i: number): void {
  dragOverIndex.value = i
  dragOverEnd.value = false
}

function onDragOverEnd(): void {
  dragOverEnd.value = true
  dragOverIndex.value = null
}

function onDragEnd(): void {
  dragId.value = ''
  dragOverIndex.value = null
  dragOverEnd.value = false
}

async function submitOrder(ids: string[]): Promise<void> {
  if (reordering.value) return
  reordering.value = true
  try {
    await reorderClasses(ids)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Reorder failed')
  } finally {
    reordering.value = false
  }
}

function onDrop(i: number): void {
  const from = allClasses.value.findIndex((c) => c.id === dragId.value)
  onDragEnd()
  if (from === -1 || from === i || reordering.value) return
  const list = [...allClasses.value]
  const moved = list.splice(from, 1)[0]
  if (!moved) return
  list.splice(from < i ? i - 1 : i, 0, moved)
  void submitOrder(list.map((c) => c.id))
}

function onDropEnd(): void {
  const from = allClasses.value.findIndex((c) => c.id === dragId.value)
  onDragEnd()
  if (from === -1 || from === allClasses.value.length - 1 || reordering.value) return
  const list = [...allClasses.value]
  const moved = list.splice(from, 1)[0]
  if (!moved) return
  list.push(moved)
  void submitOrder(list.map((c) => c.id))
}

function goFees(): void {
  router.push('/admin/fees')
}

function goAddClass(): void {
  router.push('/admin/academics/new')
}

const savingSession = ref(false)

function openSessionAdd(): void {
  editingSessionId.value = ''
  sessionLabel.value = ''
  sessionStart.value = ''
  sessionEnd.value = ''
  showSessionModal.value = true
}

function openSessionEdit(s: AcademicSession): void {
  editingSessionId.value = s.id
  sessionLabel.value = s.label
  sessionStart.value = s.startDate || ''
  sessionEnd.value = s.endDate || ''
  showSessionModal.value = true
}

async function saveSession(): Promise<void> {
  savingSession.value = true
  try {
    const label = sessionLabel.value.trim()
    if (editingSessionId.value) {
      await updateSession({
        id: editingSessionId.value,
        input: {
          label,
          startDate: sessionStart.value || null,
          endDate: sessionEnd.value || null,
        },
      })
      toast.success('Session updated')
    } else {
      await createSession({
        label,
        startDate: sessionStart.value || `${label}-01-01`,
        endDate: sessionEnd.value || `${label}-12-31`,
      })
      toast.success('Session created — classes carry over automatically, nothing to re-create')
    }
    showSessionModal.value = false
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  } finally {
    savingSession.value = false
  }
}

const confirm = ref({ open: false, kind: '' as 'session' | '', id: '', message: '' })
const confirmBusy = ref(false)

function askDeleteSession(id: string, label: string): void {
  confirm.value = { open: true, kind: 'session', id, message: `Delete session "${label}"?` }
}

async function doDeleteSession(): Promise<void> {
  confirmBusy.value = true
  try {
    await deleteSession(confirm.value.id)
    toast.success('Session removed')
    confirm.value.open = false
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  } finally {
    confirmBusy.value = false
  }
}
</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-xs);
}
.page__hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-lg);
}
.top-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-md);
  align-items: start;
  margin-bottom: var(--spacing-lg);
}
.list {
  list-style: none;
  padding: 0;
  margin: var(--spacing-sm) 0;
  display: flex;
  flex-direction: column;
}
.list__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.badge {
  font-style: normal;
  font-size: var(--font-size-xs);
  background: var(--color-primary-light);
  border-radius: var(--radius-full);
  padding: 2px var(--spacing-sm);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.inline-form {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  align-items: center;
}
.inline-form .app-input__control {
  flex: 1;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}
.card-head__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
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
  width: min(420px, 100%);
}
.modal__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-md);
}
.modal__form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.modal__form label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}
.check {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  white-space: nowrap;
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
.table__row {
  cursor: pointer;
}
.table__row:hover {
  background: var(--color-surface-alt);
}
.row-actions {
  text-align: right;
}
.drag-hint {
  font-size: var(--font-size-sm);
  margin: 0 0 8px;
}
.table__row[draggable='true'] {
  cursor: grab;
}
.table__row.is-dragging {
  opacity: 0.4;
}
.table__row.is-drop-target {
  box-shadow: inset 0 2px 0 var(--color-primary);
}
.table__drop-end td {
  padding: 6px 12px;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  text-align: center;
}
.table__drop-end.is-drop-target td {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}
.link-btn--danger {
  color: var(--color-danger);
  font-weight: var(--font-weight-normal);
}
.row-btns {
  display: flex;
  gap: var(--spacing-sm);
}

</style>
