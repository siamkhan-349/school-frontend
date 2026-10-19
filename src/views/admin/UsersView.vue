<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Users</h1>
        <p class="muted">Teacher, accountant and parent logins — panels open from here.</p>
      </div>
      <AppButton @click="openNew">+ New User</AppButton>
    </div>

    <AppCard>
      <div class="chips-row">
        <button
          v-for="c in roleChips"
          :key="c.key"
          type="button"
          class="chip-btn"
          :class="{ 'chip-btn--active': roleFilter === c.key }"
          @click="roleFilter = c.key"
        >{{ c.label }}</button>
      </div>
      <FilterPanel>
        <input v-model="search" class="app-input__control" placeholder="Search name / username / phone…" />
        <select v-model="statusFilter" class="app-input__control">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </FilterPanel>
      <AppSkeleton v-if="isLoading" variant="table" :rows="8" :cols="8" />
      <div v-else class="table-scroll">
        <table class="table">
          <thead>
            <tr><th>Name</th><th>Username</th><th>Phone</th><th>Role</th><th>Linked</th><th>Status</th><th>Last login</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="u in paged" :key="u.id" :class="{ 'row--off': u.status !== 'active' }">
              <td>{{ u.name }}</td>
              <td>{{ u.username }}</td>
              <td>{{ u.phone || '—' }}</td>
              <td><span class="pill" :class="`pill--${u.role}`">{{ roleLabel(u.role) }}</span></td>
              <td>{{ linkedLabel(u) }}</td>
              <td>
                <span class="pill" :class="u.status === 'active' ? 'pill--sent' : 'pill--pending'">{{ u.status }}</span>
              </td>
              <td>{{ u.lastLogin || '—' }}</td>
              <td class="row-actions-cell">
                <span class="row-actions">
                  <button class="link-btn" type="button" :disabled="togglingId === u.id" @click="toggleStatus(u)">
                    <AppSpinner v-if="togglingId === u.id" size="sm" label="Working" />
                    <template v-else>{{ u.status === 'active' ? 'Deactivate' : 'Activate' }}</template>
                  </button>
                  <button class="link-btn" type="button" @click="openEdit(u)">Edit</button>
                  <button class="link-btn link-btn--danger" type="button" @click="askDelete(u)">Delete</button>
                </span>
              </td>
            </tr>
            <tr v-if="paged.length === 0">
              <td colspan="8" class="muted">No users match.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppPagination v-model:page="page" v-model:per-page="perPage" :total="filtered.length" />
    </AppCard>

    <Teleport to="body">
      <div v-if="form.open" class="modal-backdrop" @click.self="form.open = false">
        <div class="modal">
          <h3 class="modal__title">{{ form.id ? 'Edit User' : 'New User' }}</h3>
          <form class="form" @submit.prevent="save">
            <div v-if="form.role === 'teacher'" class="kids kids--top">
              <span class="kids__label">Linked teacher/staff profile (required — opens their panel)</span>
              <template v-if="school.hasModule('staff')">
                <input v-model="teacherSearch" class="app-input__control" placeholder="Type name / phone / designation…" />
                <ul v-if="teacherSearch.trim() && !form.teacherId" class="roster__list">
                  <li v-for="t in teacherMatches.slice(0, 20)" :key="t.id" class="roster__row">
                    <button type="button" class="link-btn" @click="selectTeacher(t)">
                      {{ t.name }} · {{ t.designation || (t.kind === 'staff' ? 'Staff' : 'Teacher') }} <span class="muted">· {{ t.phone || 'no phone' }}</span>
                    </button>
                  </li>
                  <li v-if="teacherMatches.length === 0" class="roster__row muted">No match.</li>
                </ul>
                <p v-if="selectedTeacher" class="kids__picked">
                  Linked: <strong>{{ selectedTeacher.name }}</strong>
                  <span class="pill" :class="selectedTeacher.kind === 'staff' ? 'pill--accountant' : 'pill--teacher'">{{ selectedTeacher.kind === 'staff' ? 'Staff' : 'Teacher' }}</span>
                  <span class="muted">· {{ selectedTeacher.designation || '—' }}</span>
                  <button type="button" class="link-btn link-btn--danger" @click="clearTeacher">Unlink</button>
                </p>
                <p v-else class="muted">Not linked — linking is required for teacher logins.</p>
              </template>
              <p v-else class="muted">Editing keeps the current link — managing links needs the Teachers &amp; Staff module.</p>
            </div>
            <div class="form-row">
              <label>Name<input v-model="form.name" class="app-input__control" required placeholder="e.g. Rahim Uddin" /></label>
              <label>Username (login id)<input v-model="form.username" class="app-input__control" required :disabled="!!form.id" placeholder="e.g. rahim123" /></label>
            </div>
            <div class="form-row">
              <label>Phone<input v-model="form.phone" class="app-input__control" placeholder="01XXXXXXXXX" /></label>
              <label>Role
                <select v-model="form.role" class="app-input__control">
                  <option v-for="o in roleChoices" :key="o.value" :value="o.value">{{ o.label }}</option>
                  <!-- Editing an old login whose panel module is off: keep its role shown. -->
                  <option v-if="!roleChoices.some((o) => o.value === form.role)" :value="form.role">{{ roleLabel(form.role) }}</option>
                </select>
              </label>
            </div>
            <PasswordInput v-model="form.password" :label="form.id ? 'New password (blank = keep old)' : 'Password'" :required="!form.id" :minlength="6" autocomplete="new-password" placeholder="Min 6 characters" />
            <div v-if="form.role === 'parent'" class="kids">
              <span class="kids__label">Linked children (parent sees only these)</span>
              <p v-if="linkedKids.length" class="kids__picked">
                <span v-for="k in linkedKids" :key="k.id" class="kids__chip">
                  {{ k.name }} · Roll {{ k.roll }}
                  <button type="button" class="link-btn link-btn--danger" @click="toggleKid(k.id, false)">✕</button>
                </span>
              </p>
              <input v-model="kidSearch" class="app-input__control" placeholder="Type name / roll to search…" />
              <ul v-if="kidSearch.trim()" class="roster__list">
                <li v-for="s in kidMatches.slice(0, 20)" :key="s.id" class="roster__row">
                  <label class="roster__check">
                    <input
                      type="checkbox"
                      :checked="form.children.includes(s.id)"
                      @change="toggleKid(s.id, ($event.target as HTMLInputElement).checked)"
                    />
                    <span>{{ s.name }} <span class="muted">· Roll {{ s.roll }}</span></span>
                  </label>
                </li>
                <li v-if="kidMatches.length === 0" class="roster__row muted">No match.</li>
              </ul>
              <p v-else class="muted">Type above to search students — nothing loads until you search.</p>
              <p class="muted">{{ form.children.length }} linked</p>
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="form-actions">
              <AppButton variant="ghost" type="button" @click="form.open = false">Cancel</AppButton>
              <AppButton type="submit" :loading="saving">{{ form.id ? 'Save' : 'Create' }}</AppButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

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
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import PasswordInput from '@/components/common/PasswordInput.vue'
import { usePagedList } from '@/composables/usePagedList'
import {
  useCreateAppUser,
  useDeleteAppUser,
  useAppUsers,
  useStudents,
  useTeachers,
  useUpdateAppUser,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { useSchoolStore } from '@/stores/school'
import type { AppUser, AppUserRole } from '@/types/models'

const toast = useToast()
const school = useSchoolStore()
const roleChips = [
  { key: '', label: 'All' },
  { key: 'teacher', label: 'Teachers / Staff' },
  { key: 'accountant', label: 'Accountants' },
  { key: 'parent', label: 'Parents' },
]
const roleFilter = ref('')
const statusFilter = ref('')
const search = ref('')
const params = computed(() => ({
  role: roleFilter.value || undefined,
  status: statusFilter.value || undefined,
  search: search.value.trim() || undefined,
}))
const { data, isLoading } = useAppUsers(params)
const users = computed(() => data.value?.data ?? [])
const filtered = computed(() => users.value)
const { page, perPage } = usePagedList(10)
watch([roleFilter, statusFilter, search], () => {
  page.value = 1
})
const paged = computed(() => {
  const start = (page.value - 1) * perPage.value
  return filtered.value.slice(start, start + perPage.value)
})

/** Panels whose module is off cannot be used — hide their role option when
 * creating a login. Editing keeps an existing login's own role selectable. */
const roleChoices = computed(() => {
  const opts: { value: AppUserRole; label: string }[] = []
  // Teacher logins link a staff profile — offer the role only while both
  // modules it needs are on.
  if (school.hasModule('teacher') && school.hasModule('staff')) opts.push({ value: 'teacher', label: 'Teacher / Staff' })
  if (school.hasModule('accountant')) opts.push({ value: 'accountant', label: 'Accountant' })
  if (school.hasModule('parent')) opts.push({ value: 'parent', label: 'Parent' })
  return opts
})

function roleLabel(role: string): string {
  if (role === 'teacher') return 'Teacher / Staff'
  if (role === 'accountant') return 'Accountant'
  if (role === 'parent') return 'Parent'
  return role
}
function linkedLabel(u: AppUser): string {
  if (u.role === 'parent') {
    if (u.children.length === 0) return 'none (sees nothing)'
    return u.children.map((c) => c.name).join(', ')
  }
  if (u.role === 'teacher') {
    if (!u.teacherId) return 'not linked'
    const t = allTeachers.value.find((x) => x.id === u.teacherId)
    if (!t) return 'profile linked'
    const kind = (t.kind || 'teacher') === 'staff' ? 'Staff' : 'Teacher'
    return `${t.name} · ${kind}`
  }
  return '—'
}

const { data: studentsData } = useStudents({ perPage: 500 })
const students = computed(() => studentsData.value?.data.items ?? [])
const { data: teachersData } = useTeachers({ perPage: 500 }, () => school.hasModule('staff'))
const allTeachers = computed(() => teachersData.value?.data.items ?? [])
const kidSearch = ref('')
const teacherSearch = ref('')
const teacherMatches = computed(() => {
  const q = teacherSearch.value.trim().toLowerCase()
  if (!q) return allTeachers.value.slice(0, 20)
  return allTeachers.value.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      (t.phone ?? '').toLowerCase().includes(q) ||
      (t.designation ?? '').toLowerCase().includes(q),
  )
})
const selectedTeacher = computed(() => allTeachers.value.find((t) => t.id === form.teacherId))
function selectTeacher(t: { id: string; name: string; phone: string }): void {
  form.teacherId = t.id
  teacherSearch.value = ''
  if (!form.name.trim()) form.name = t.name
  if (!form.phone.trim()) form.phone = t.phone ?? ''
}
function clearTeacher(): void {
  form.teacherId = ''
}
const kidMatches = computed(() => {
  const q = kidSearch.value.trim().toLowerCase()
  if (!q) return []
  return students.value.filter(
    (s) => s.name.toLowerCase().includes(q) || String(s.roll ?? '').includes(q),
  )
})
const linkedKids = computed(() => students.value.filter((s) => form.children.includes(s.id)))

const form = reactive({
  open: false,
  id: '',
  name: '',
  username: '',
  phone: '',
  role: 'teacher' as AppUserRole,
  password: '',
  children: [] as string[],
  teacherId: '',
})
const formError = ref('')
const saving = ref(false)
const togglingId = ref<string | null>(null)
const { mutateAsync: createUser } = useCreateAppUser()
const { mutateAsync: updateUser } = useUpdateAppUser()

function openNew(): void {
  form.id = ''
  form.name = ''
  form.username = ''
  form.phone = ''
  form.role = roleChoices.value[0]?.value ?? 'parent'
  form.password = ''
  form.children = []
  form.teacherId = ''
  kidSearch.value = ''
  teacherSearch.value = ''
  formError.value = ''
  form.open = true
}
function openEdit(u: AppUser): void {
  form.id = u.id
  form.name = u.name
  form.username = u.username
  form.phone = u.phone
  form.role = (['teacher', 'accountant', 'parent'].includes(u.role) ? u.role : 'parent') as AppUserRole
  form.password = ''
  form.children = (u.children ?? []).map((c) => c.id)
  form.teacherId = u.teacherId ?? ''
  kidSearch.value = ''
  teacherSearch.value = ''
  formError.value = ''
  form.open = true
}
function toggleKid(id: string, checked: boolean): void {
  form.children = checked ? [...form.children, id] : form.children.filter((x) => x !== id)
}
async function save(): Promise<void> {
  formError.value = ''
  if (form.role === 'teacher' && !form.teacherId) {
    formError.value = 'Link a teacher/staff profile first — search above and pick one.'
    return
  }
  if (form.role === 'parent' && form.children.length === 0) {
    formError.value = 'Link at least one child — a parent with no child sees nothing.'
    return
  }
  saving.value = true
  try {
    if (form.id) {
      await updateUser({
        id: form.id,
        input: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
          ...(form.role === 'parent' ? { children: form.children.map((id) => ({ id })) } : {}),
          ...(form.role === 'teacher' ? { teacherId: form.teacherId } : {}),
        },
      })
      toast.success('User updated')
    } else {
      await createUser({
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        phone: form.phone.trim(),
        role: form.role,
        password: form.password,
        children: form.role === 'parent' ? form.children.map((id) => ({ id })) : [],
        ...(form.role === 'teacher' ? { teacherId: form.teacherId || undefined } : {}),
      })
      toast.success('User created — they can now sign in to their panel')
    }
    form.open = false
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

async function toggleStatus(u: AppUser): Promise<void> {
  togglingId.value = u.id
  try {
    await updateUser({
      id: u.id,
      input: { status: u.status === 'active' ? 'inactive' : 'active' },
    })
    toast.success(u.status === 'active' ? 'User deactivated' : 'User activated')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  } finally {
    togglingId.value = null
  }
}

const confirm = ref({ open: false, id: '', message: '' })
const { mutateAsync: deleteUser, isPending: deleting } = useDeleteAppUser()
function askDelete(u: AppUser): void {
  confirm.value = { open: true, id: u.id, message: `Delete login "${u.name}" (${u.username})? Their panel access ends immediately.` }
}
async function doDelete(): Promise<void> {
  try {
    await deleteUser(confirm.value.id)
    toast.success('User removed')
    confirm.value.open = false
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}
</script>

<style scoped>
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: 0;
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
}
.chip-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-full);
  padding: 4px var(--spacing-md);
  font-size: var(--font-size-xs);
  cursor: pointer;
}
.chip-btn--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-primary-contrast);
  font-weight: var(--font-weight-semibold);
}
.table-scroll {
  overflow-x: auto;
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
  white-space: nowrap;
}
.row--off {
  opacity: 0.6;
}
.row-actions-cell {
  text-align: right;
}
.row-actions {
  display: inline-flex;
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
.link-btn--danger {
  color: var(--color-danger);
}
.pill {
  display: inline-block;
  padding: 1px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: capitalize;
}
.pill--teacher {
  background: var(--color-primary-light);
  color: var(--color-primary-active, var(--color-primary));
}
.pill--accountant {
  background: var(--color-warning-light);
  color: var(--color-warning);
}
.pill--parent {
  background: var(--color-success-light);
  color: var(--color-success);
}
.pill--sent {
  background: var(--color-success-light);
  color: var(--color-success);
}
.pill--pending {
  background: var(--color-warning-light);
  color: var(--color-warning);
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
  width: min(560px, 100%);
  max-height: 90vh;
  max-height: 90dvh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.modal__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin: 0;
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.form label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
}
@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}
.kids {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.kids--top {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-primary-light);
}
.kids__label {
  font-size: var(--font-size-sm);
}
.kids__picked {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  flex-wrap: wrap;
}
.kids__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: 2px var(--spacing-sm);
  background: var(--color-surface);
}.roster__list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.roster__row {
  padding: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.roster__check {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  min-height: 32px;
}
.roster__check input {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
}
</style>
