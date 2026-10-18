<template>
  <div class="page">
    <RouterLink to="/admin/academics" class="back">‹ All classes</RouterLink>
    <p v-if="classesLoading" class="muted">Loading…</p>
    <p v-else-if="!schoolClass" class="error">Class not found.</p>
    <template v-else>
      <div class="hero">
        <div>
          <div class="title-row">
            <h1 v-if="!editingName" class="page__title">{{ schoolClass.label }}</h1>
            <span v-else class="title-edit">
              <input
                v-model="nameInput"
                class="app-input__control"
                placeholder="Class name"
                @keyup.enter="saveName"
                @keyup.esc="cancelName"
              />
              <AppButton type="button" :disabled="savingName" @click="saveName">{{ savingName ? 'Saving…' : 'Save' }}</AppButton>
              <AppButton variant="ghost" type="button" @click="cancelName">Cancel</AppButton>
            </span>
            <button v-if="!editingName" class="name-edit-btn" type="button" title="Edit class name" @click="startNameEdit">✎</button>
          </div>
          <p class="muted">
            {{ departments.length }} department{{ departments.length === 1 ? '' : 's' }} ·
            {{ subjects.length }} subject{{ subjects.length === 1 ? '' : 's' }} ·
            {{ sections.length }} section{{ sections.length === 1 ? '' : 's' }}
          </p>
        </div>
        <div class="hero-side">
          <label class="order-field" title="Ladder position — PG=1, Nursery=2, KG=3, Class 1=4 …">
            Order
            <input v-model.number="orderInput" type="number" min="0" class="app-input__control" @change="saveOrder" />
          </label>
          <label class="order-field" title="Class hours — late cutoff for this class's attendance taps and limit for its class routine periods. Blank = school-wide timings.">
            Hours
            <span class="hours-inputs">
              <input v-model="hoursStart" type="time" class="app-input__control" @change="saveHours" />
              <span class="muted">–</span>
              <input v-model="hoursEnd" type="time" class="app-input__control" @change="saveHours" />
            </span>
          </label>
          <em v-if="schoolClass.hasDepartments" class="badge">departments on</em>
        </div>
      </div>

      <div class="grid">
        <AppCard title="Departments">
          <label class="check"><input v-model="deptToggle" type="checkbox" /> This class has departments (Science / Arts / Commerce…)</label>
          <template v-if="schoolClass.hasDepartments">
            <ul class="list">
              <li v-for="d in departments" :key="d.id" class="list__row">
                <span>{{ d.label }}</span>
                <button class="link-danger" type="button" @click="askDeleteDepartment(d.id, d.label)">Remove</button>
              </li>
            </ul>
            <p v-if="!departments.length" class="muted">No departments yet — add Science, Arts, Commerce…</p>
            <form class="inline-form" @submit.prevent="addDepartment">
              <input v-model="departmentLabel" class="app-input__control" placeholder="e.g. Science" required />
              <AppButton type="submit" :disabled="creatingDepartment">Add</AppButton>
            </form>
          </template>
        </AppCard>

        <AppCard title="Subjects">
          <h4 v-if="hasDeptRows" class="block-title">Common — every department (Bangla, English, Mathematics…)</h4>
          <ul class="list">
            <li v-for="s in commonSubjects" :key="s.id" class="list__row">
              <span>{{ s.label }} <em v-if="!s.classId" class="muted">· General</em></span>
              <button class="link-danger" type="button" @click="removeSubject(s.id)">Remove</button>
            </li>
          </ul>
          <p v-if="!commonSubjects.length" class="muted">No {{ hasDeptRows ? 'common ' : '' }}subjects yet.</p>

          <template v-for="d in departments" :key="d.id">
            <h4 class="block-title">{{ d.label }} only <em class="muted">· {{ deptSubjects(d.id).length }}</em></h4>
            <ul class="list">
              <li v-for="s in deptSubjects(d.id)" :key="s.id" class="list__row">
                <span>{{ s.label }}</span>
                <button class="link-danger" type="button" @click="removeSubject(s.id)">Remove</button>
              </li>
            </ul>
            <p v-if="!deptSubjects(d.id).length" class="muted">No {{ d.label }} subjects yet — e.g. {{ deptExample(d.label) }}.</p>
          </template>

          <form class="inline-form" @submit.prevent="addSubject">
            <input v-model="subjectLabel" class="app-input__control" placeholder="e.g. Bangla" required />
            <select v-if="hasDeptRows" v-model="subjectTarget" class="app-input__control">
              <option value="common">Common — all departments</option>
              <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.label }} only</option>
            </select>
            <AppButton type="submit" :disabled="creatingSubject">Add</AppButton>
          </form>
          <div v-if="otherClasses.length" class="copy-row">
            <span class="muted">Copy from</span>
            <select v-model="copySourceClassId" class="app-input__control">
              <option v-for="c in otherClasses" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
            <AppButton variant="ghost" type="button" :disabled="copying || !copySourceClassId" @click="copySubjects">
              {{ copying ? 'Copying…' : 'Copy' }}
            </AppButton>
          </div>
        </AppCard>
      </div>

      <AppCard title="Sections">
        <ul class="list">
          <li v-for="s in sections" :key="s.id" class="list__row">
            <span>{{ s.label }}</span>
            <button class="link-danger" type="button" @click="askDeleteSection(s.id, s.label)">Remove</button>
          </li>
        </ul>
        <p v-if="!sections.length" class="muted">No sections yet — add the ones this class runs (e.g. A, B).</p>
        <form class="inline-form" @submit.prevent="addSection">
          <input v-model="sectionLabel" class="app-input__control" placeholder="Section name (e.g. Rose or 1st Shift)" required />
          <AppButton type="submit" :disabled="creatingSection">Add</AppButton>
        </form>
      </AppCard>

      <div class="danger-zone">
        <AppButton variant="ghost" type="button" @click="askDeleteClass">Delete this class</AppButton>
      </div>
    </template>

    <AppConfirmDialog
      :open="confirm.open"
      :message="confirm.message"
      :busy="confirmBusy"
      @cancel="confirm.open = false"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import {
  useClasses,
  useCreateDepartment,
  useCreateSection,
  useCreateSubject,
  useDeleteClass,
  useDeleteDepartment,
  useDeleteSection,
  useDeleteSubject,
  useDepartments,
  useSections,
  useSubjects,
  useUpdateClass,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import type { Subject } from '@/types/models'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const classId = computed(() => String(route.params.classId ?? ''))

const { data: classData, isLoading: classesLoading } = useClasses()
const schoolClass = computed(() => classData.value?.data.find((c) => c.id === classId.value))

// Scoped queries follow the route id (keys evaluate eagerly, but classId is
// route-derived and available during setup — no TDZ risk).
const { data: departmentData } = useDepartments(() => classId.value || undefined)
const departments = computed(() => departmentData.value?.data ?? [])
/** Department UI (groups, target dropdown) only makes sense when rows exist. */
const hasDeptRows = computed(() => departments.value.length > 0)
const { data: allDeptData } = useDepartments(undefined)
const otherClasses = computed(() =>
  (classData.value?.data ?? [])
    .filter((c) => c.id !== classId.value)
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })),
)
const { data: subjectData } = useSubjects(undefined)
const allSubjects = computed(() => subjectData.value?.data ?? [])
const subjects = computed(() =>
  allSubjects.value.filter((s) => s.classId === classId.value || s.classId === null),
)
/** No department = taught to every department of the class. */
const commonSubjects = computed(() => subjects.value.filter((s) => !s.departmentId))
function deptSubjects(departmentId: string): Subject[] {
  return subjects.value.filter((s) => s.departmentId === departmentId)
}
/** Hint text per group so the admin knows what belongs where. */
function deptExample(label: string): string {
  const l = label.toLowerCase()
  if (l.includes('scien')) return 'Physics, Chemistry'
  if (l.includes('commerce') || l.includes('business')) return 'Accounting, Finance'
  if (l.includes('art') || l.includes('human')) return 'History, Geography'
  return 'group subjects'
}
const { data: sectionData } = useSections(() => classId.value || undefined)
const sections = computed(() => sectionData.value?.data ?? [])

const departmentLabel = ref('')
const subjectLabel = ref('')
/** Where the new subject goes: 'common' (whole class) or a department id. */
const subjectTarget = ref('common')
const sectionLabel = ref('')
const orderInput = ref<number | string>('')
watch(schoolClass, (c) => { orderInput.value = c?.sortOrder ?? 0 }, { immediate: true })

const hoursStart = ref('')
const hoursEnd = ref('')
watch(schoolClass, (c) => {
  hoursStart.value = c?.startTime ?? ''
  hoursEnd.value = c?.endTime ?? ''
}, { immediate: true })

const editingName = ref(false)
const nameInput = ref('')
const savingName = ref(false)

function startNameEdit(): void {
  nameInput.value = schoolClass.value?.label ?? ''
  editingName.value = true
}

function cancelName(): void {
  editingName.value = false
}

async function saveName(): Promise<void> {
  const label = nameInput.value.trim()
  const current = schoolClass.value?.label ?? ''
  if (!label) {
    toast.error('Class name is required.')
    return
  }
  if (label === current) {
    editingName.value = false
    return
  }
  savingName.value = true
  try {
    await updateClass({ id: classId.value, input: { label } })
    toast.success('Class name updated')
    editingName.value = false
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  } finally {
    savingName.value = false
  }
}

const { mutateAsync: updateClass } = useUpdateClass()
const { mutateAsync: deleteClass } = useDeleteClass()
const { mutateAsync: createDepartment, isPending: creatingDepartment } = useCreateDepartment()
const { mutateAsync: deleteDepartment } = useDeleteDepartment()
const { mutateAsync: createSubject, isPending: creatingSubject } = useCreateSubject()
const { mutateAsync: deleteSubject } = useDeleteSubject()
const { mutateAsync: createSection, isPending: creatingSection } = useCreateSection()
const { mutateAsync: deleteSection } = useDeleteSection()

async function saveOrder(): Promise<void> {
  const current = schoolClass.value?.sortOrder ?? 0
  if (orderInput.value === '' || orderInput.value === null) {
    orderInput.value = current
    return
  }
  const value = Number(orderInput.value)
  if (!Number.isInteger(value) || value < 0) {
    toast.error('Order must be a whole number (0 or more).')
    orderInput.value = current
    return
  }
  if (value === current) return
  try {
    await updateClass({ id: classId.value, input: { sortOrder: value } })
    toast.success('Order updated')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
    orderInput.value = current
  }
}

async function saveHours(): Promise<void> {
  const c = schoolClass.value
  if (!c) return
  if (hoursStart.value && hoursEnd.value && hoursEnd.value <= hoursStart.value) {
    toast.error('End time must be after start time.')
    hoursEnd.value = c.endTime
    return
  }
  if (hoursStart.value === c.startTime && hoursEnd.value === c.endTime) return
  try {
    await updateClass({ id: classId.value, input: { startTime: hoursStart.value, endTime: hoursEnd.value } })
    toast.success('Class hours updated')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
    hoursStart.value = c.startTime
    hoursEnd.value = c.endTime
  }
}

async function addSection(): Promise<void> {
  try {
    await createSection({ classId: classId.value, label: sectionLabel.value.trim() })
    sectionLabel.value = ''
    toast.success('Section created')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}

const deptToggle = computed({
  get: () => schoolClass.value?.hasDepartments ?? false,
  set: async (on: boolean) => {
    if (!classId.value) return
    try {
      await updateClass({ id: classId.value, input: { hasDepartments: on } })
      toast.success(on ? 'Departments enabled for this class' : 'Departments disabled for this class')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  },
})

async function addDepartment(): Promise<void> {
  try {
    await createDepartment({ classId: classId.value, label: departmentLabel.value.trim() })
    departmentLabel.value = ''
    toast.success('Department created')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}

async function addSubject(): Promise<void> {
  try {
    const target = subjectTarget.value
    await createSubject({
      classId: classId.value || null,
      label: subjectLabel.value.trim(),
      departmentId: target !== 'common' ? target : null,
    })
    subjectLabel.value = ''
    toast.success('Subject created')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}

async function removeSubject(id: string): Promise<void> {
  try {
    await deleteSubject(id)
    toast.success('Subject removed')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}

const copySourceClassId = ref('')
const copying = ref(false)

/**
 * Copy another class's subjects here. Common subjects come as common;
 * department subjects map by department NAME (Class 9-Science → Class
 * 10-Science). A subject is skipped when this class already has the same
 * label in the same slot, or when no matching department exists here.
 */
async function copySubjects(): Promise<void> {
  const srcId = copySourceClassId.value
  if (!srcId || !classId.value || copying.value) return
  copying.value = true
  try {
    const norm = (v: string): string => v.trim().toLowerCase()
    const srcRows = allSubjects.value.filter((s) => s.classId === srcId)
    const have = new Set(
      subjects.value.map((s) => `${norm(s.label)}|${s.departmentId ?? ''}`),
    )
    const srcDeptName = new Map(
      (allDeptData.value?.data ?? []).map((d) => [d.id, d.label] as const),
    )
    const targetDeptId = new Map(
      departments.value.map((d) => [norm(d.label), d.id] as const),
    )
    let done = 0
    let skipped = 0
    for (const s of srcRows) {
      let depId: string | null = null
      if (s.departmentId) {
        const name = srcDeptName.get(s.departmentId)
        const match = name ? targetDeptId.get(norm(name)) : undefined
        if (!match) {
          skipped += 1
          continue
        }
        depId = match
      }
      if (have.has(`${norm(s.label)}|${depId ?? ''}`)) continue
      try {
        await createSubject({ classId: classId.value, label: s.label.trim(), departmentId: depId })
        have.add(`${norm(s.label)}|${depId ?? ''}`)
        done += 1
      } catch {
        skipped += 1
      }
    }
    if (!done && !skipped) toast.success('Nothing to copy')
    else if (done && !skipped) toast.success(`${done} subject${done > 1 ? 's' : ''} copied`)
    else if (done) toast.success(`${done} copied, ${skipped} skipped (already here or no matching department)`)
    else toast.error('Nothing copied — subjects already exist here or departments do not match')
  } finally {
    copying.value = false
  }
}

const confirm = ref({ open: false, kind: '' as 'department' | 'class' | 'section' | '', id: '', message: '' })
const confirmBusy = ref(false)

function askDeleteDepartment(id: string, label: string): void {
  confirm.value = { open: true, kind: 'department', id, message: `Delete department "${label}"?` }
}

function askDeleteSection(id: string, label: string): void {
  confirm.value = {
    open: true,
    kind: 'section',
    id,
    message: `Remove section "${label}"? Sections holding students cannot be removed.`,
  }
}

function askDeleteClass(): void {
  if (!schoolClass.value) return
  confirm.value = {
    open: true,
    kind: 'class',
    id: schoolClass.value.id,
    message: `Delete class "${schoolClass.value.label}"? Its sections and departments go with it. Classes with students cannot be deleted.`,
  }
}

async function doDelete(): Promise<void> {
  confirmBusy.value = true
  try {
    if (confirm.value.kind === 'class') {
      await deleteClass(confirm.value.id)
      toast.success('Class removed')
      confirm.value.open = false
      await router.push('/admin/academics')
    } else if (confirm.value.kind === 'section') {
      await deleteSection(confirm.value.id)
      toast.success('Section removed')
      confirm.value.open = false
    } else {
      await deleteDepartment(confirm.value.id)
      toast.success('Removed')
      confirm.value.open = false
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  } finally {
    confirmBusy.value = false
  }
}
</script>

<style scoped>
.back {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
}
.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  margin: var(--spacing-sm) 0 var(--spacing-lg);
}
.hero-side {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}
.order-field {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}
.order-field .app-input__control {
  width: 72px;
}
.hours-inputs {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}
.hours-inputs .app-input__control {
  width: 104px;
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}
.title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.title-edit {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}
.title-edit .app-input__control {
  width: 220px;
}
.name-edit-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: var(--font-size-md);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
}
.name-edit-btn:hover {
  color: var(--color-primary);
  background: var(--color-primary-light);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
}
.badge {
  font-style: normal;
  font-size: var(--font-size-xs);
  background: var(--color-primary-light);
  border-radius: var(--radius-full);
  padding: 2px var(--spacing-sm);
  white-space: nowrap;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-md);
  align-items: start;
  margin-bottom: var(--spacing-md);
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
.inline-form {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  align-items: center;
}
.inline-form .app-input__control {
  flex: 1;
}
.check {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  white-space: nowrap;
  margin: var(--spacing-sm) 0;
}
.link-danger {
  background: none;
  border: none;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.copy-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-sm);
}
.copy-row .app-input__control {
  flex: 1;
}
.danger-zone {
  margin-top: var(--spacing-lg);
  display: flex;
  justify-content: flex-end;
}
</style>
