<template>
  <div class="page">
    <div class="page__head">
      <h1 class="page__title">Notice & Events</h1>
      <AppButton @click="openNew">+ New Notice</AppButton>
    </div>

    <AppCard>
      <FilterPanel>
        <input v-model="search" class="app-input__control" placeholder="Search title / description…" />
        <select v-model="statusFilter" class="app-input__control">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select v-model="audienceFilter" class="app-input__control">
          <option value="">All audiences</option>
          <option value="all">All</option>
          <option value="teachers">Teachers</option>
          <option value="parents">Parents</option>
        </select>
      </FilterPanel>
      <AppSkeleton v-if="isLoading" variant="list" :rows="3" />
      <ul v-else class="events">
        <li v-for="e in paged" :key="e.id" class="event">
          <div>
            <strong>{{ e.title }}</strong>
            <span class="chip" :class="`chip--${e.status}`">{{ e.status }}</span>
            <span class="muted"> · {{ e.type }} · {{ e.audience }} · {{ e.eventDate }}</span>
            <span v-if="e.location" class="muted"> · {{ e.location }}</span>
            <p class="muted">{{ e.description }}</p>
          </div>
          <div class="row-actions">
            <button v-if="e.status === 'draft'" class="link-btn" type="button" @click="askPublish(e)">
              Publish
            </button>
            <button v-if="e.status === 'published'" class="link-btn" type="button" :disabled="rowBusyId === e.id" @click="setStatus(e.id, 'archived')">
              <AppSpinner v-if="rowBusyId === e.id" size="sm" label="Working" />
              <template v-else>Archive</template>
            </button>
            <button v-if="e.status === 'archived'" class="link-btn" type="button" :disabled="rowBusyId === e.id" @click="setStatus(e.id, 'draft')">
              <AppSpinner v-if="rowBusyId === e.id" size="sm" label="Working" />
              <template v-else>Restore</template>
            </button>
            <button class="link-btn" type="button" @click="openEdit(e)">Edit</button>
            <button class="link-btn link-btn--danger" type="button" @click="askDelete(e.id, e.title)">
              Delete
            </button>
          </div>
        </li>
      </ul>
      <p v-if="!isLoading && paged.length === 0" class="muted">No notices match.</p>
      <AppPagination v-model:page="page" v-model:per-page="perPage" :total="filtered.length" />
    </AppCard>

    <Teleport to="body">
      <div v-if="form.open" class="modal-backdrop" @click.self="form.open = false">
        <div class="modal">
          <h3 class="modal__title">{{ form.id ? 'Edit Notice' : 'New Notice' }}</h3>
          <form class="form" @submit.prevent="save">
            <label>Title<input v-model="form.title" class="app-input__control" required /></label>
            <label>Description<textarea v-model="form.description" class="app-input__control" rows="3" /></label>
            <div class="form-row">
              <label>Date<input v-model="form.eventDate" type="date" class="app-input__control" required /></label>
              <label>Location<input v-model="form.location" class="app-input__control" placeholder="Hall / Room…" /></label>
            </div>
            <div class="form-row">
              <label>Type
                <select v-model="form.type" class="app-input__control">
                  <option value="notice">Notice</option>
                  <option value="news">News</option>
                  <option value="event">Event</option>
                  <option value="exam">Exam</option>
                  <option value="meeting">Meeting</option>
                </select>
              </label>
              <label>Audience
                <select v-model="form.audience" class="app-input__control">
                  <option value="all">All</option>
                  <option v-if="school.hasModule('staff')" value="teachers">Teachers</option>
                  <option value="parents">Parents</option>
                </select>
              </label>
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

    <Teleport to="body">
      <div v-if="pubAsk.open" class="modal-backdrop" @click.self="pubAsk.open = false">
        <div class="modal">
          <h3 class="modal__title">Publish "{{ pubAsk.title }}"?</h3>
          <p class="modal__hint">Notify the audience by SMS as well? (Guardians for students/parents{{ school.hasModule('staff') ? ', teachers for teachers' : '' }}.)</p>
          <p v-if="pubAsk.audience === 'teachers' && !school.hasModule('staff')" class="muted">
            Teachers audience needs the Teachers &amp; Staff module — SMS is off; publish only.
          </p>
          <div class="form-actions">
            <AppButton variant="ghost" :disabled="publishing" @click="pubAsk.open = false">Cancel</AppButton>
            <AppButton variant="ghost" :loading="publishing" @click="doPublish(false)">
              Publish only
            </AppButton>
            <AppButton :loading="publishing" :disabled="pubAsk.audience === 'teachers' && !school.hasModule('staff')" @click="doPublish(true)">
              Publish with SMS
            </AppButton>
          </div>
        </div>
      </div>
    </Teleport>
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
import { usePagedList } from '@/composables/usePagedList'
import {
  useCreateEvent,
  useDeleteEvent,
  useEvents,
  useEventStatus,
  useSendBulkSms,
  useSmsTemplates,
  useStudents,
  useTeachers,
  useUpdateEvent,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { useSchoolStore } from '@/stores/school'
import type { SchoolEvent } from '@/types/models'

const toast = useToast()
const school = useSchoolStore()
const { data, isLoading } = useEvents()
const events = computed(() => data.value?.data ?? [])

const search = ref('')
const statusFilter = ref('')
const audienceFilter = ref('')
const { page, perPage } = usePagedList(10)
watch([search, statusFilter, audienceFilter], () => {
  page.value = 1
})
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return events.value.filter(
    (e) =>
      (!statusFilter.value || e.status === statusFilter.value) &&
      (!audienceFilter.value || e.audience === audienceFilter.value) &&
      (!q ||
        e.title.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q)),
  )
})
const paged = computed(() => {
  const start = (page.value - 1) * perPage.value
  return filtered.value.slice(start, start + perPage.value)
})

const today = (): string => new Date().toISOString().slice(0, 10)
const form = reactive({
  open: false,
  id: '',
  title: '',
  description: '',
  eventDate: today(),
  location: '',
  type: 'notice' as SchoolEvent['type'],
  audience: 'all' as SchoolEvent['audience'],
})
function openNew(): void {
  form.id = ''
  form.title = ''
  form.description = ''
  form.eventDate = today()
  form.location = ''
  form.type = 'notice'
  form.audience = 'all'
  form.open = true
}
function openEdit(e: SchoolEvent): void {
  form.id = e.id
  form.title = e.title
  form.description = e.description
  form.eventDate = e.eventDate
  form.location = e.location ?? ''
  form.type = e.type
  form.audience = e.audience
  form.open = true
}
const formError = ref('')
const saving = ref(false)
const { mutateAsync: createEvent } = useCreateEvent()
const { mutateAsync: updateEvent } = useUpdateEvent()

async function save(): Promise<void> {
  formError.value = ''
  saving.value = true
  try {
    const input = {
      title: form.title.trim(),
      description: form.description.trim(),
      eventDate: form.eventDate,
      type: form.type,
      audience: form.audience,
      location: form.location.trim(),
    }
    if (form.id) {
      await updateEvent({ id: form.id, input })
      toast.success('Notice updated')
    } else {
      await createEvent(input)
      toast.success('Notice created as draft')
    }
    form.open = false
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

const { mutateAsync: changeStatus } = useEventStatus()
const rowBusyId = ref<string | null>(null)
async function setStatus(id: string, status: SchoolEvent['status']): Promise<void> {
  rowBusyId.value = id
  try {
    await changeStatus({ id, status })
    toast.success(`Notice ${status}`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  } finally {
    rowBusyId.value = null
  }
}

const confirm = ref({ open: false, id: '', message: '' })
const { mutateAsync: deleteEvent, isPending: deleting } = useDeleteEvent()
function askDelete(id: string, title: string): void {
  confirm.value = { open: true, id, message: `Delete notice "${title}"?` }
}
async function doDelete(): Promise<void> {
  try {
    await deleteEvent(confirm.value.id)
    toast.success('Notice removed')
    confirm.value.open = false
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}

// Publish with optional SMS notify (guardians for students/parents, teachers for teachers).
const { data: tplData } = useSmsTemplates()
const noticeTemplate = computed(() => (tplData.value?.data ?? []).find((t) => t.name === 'Notice Published'))
const { data: studentsData } = useStudents({ perPage: 500 })
const studentIds = computed(() => (studentsData.value?.data.items ?? []).map((s) => s.id))
const { data: teachersData } = useTeachers({ perPage: 500 }, () => school.hasModule('staff'))
const teacherPhones = computed(() =>
  ((teachersData.value?.data.items ?? []) as { id: string; phone: string }[])
    .filter((t) => (t.phone || '').trim())
    .map((t) => ({ recipientId: t.id, recipientType: 'teacher', phone: t.phone })),
)
const pubAsk = ref({ open: false, id: '', title: '', audience: 'all' as SchoolEvent['audience'], eventDate: '', description: '' })
const publishing = ref(false)
const { mutateAsync: sendBulk } = useSendBulkSms()
function askPublish(e: SchoolEvent): void {
  pubAsk.value = {
    open: true, id: e.id, title: e.title, audience: e.audience,
    eventDate: e.eventDate, description: e.description,
  }
}
async function doPublish(withSms: boolean): Promise<void> {
  const { id, title, audience, eventDate, description } = pubAsk.value
  publishing.value = true
  try {
    await changeStatus({ id, status: 'published' })
    pubAsk.value.open = false
    if (!withSms) {
      toast.success('Notice published')
      return
    }
    if (!noticeTemplate.value) {
      toast.error('Published, but no Notice Published template — ask a super admin to create it on SMS Control.')
      return
    }
    const recipients: { recipientId: string; recipientType: string; phone?: string }[] =
      audience === 'teachers'
        ? [...teacherPhones.value]
        : studentIds.value.map((sid) => ({ recipientId: sid, recipientType: 'guardian' }))
    if (audience === 'all') recipients.push(...teacherPhones.value)
    const res = await sendBulk({
      templateId: noticeTemplate.value.id,
      recipients,
      variables: { noticeTitle: title, eventDate, noticeDetail: (description || '').slice(0, 100) },
    })
    const failed = res.data.failed ?? []
    toast.success(
      res.data.sent > 0
        ? `Published + ${res.data.sent} SMS sent${failed.length > 0 ? ` · ${failed.length} failed (no phone)` : ''}`
        : 'Published, but no SMS went out (no phone numbers)',
    )
    if (failed.length > 0) toast.error(`${failed.length} have no phone number`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  } finally {
    publishing.value = false
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
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.events {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}
.event {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  padding: var(--spacing-md) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.event > div:first-child {
  min-width: 0;
  overflow-wrap: anywhere;
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
.chip--archived {
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}
.row-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  padding: 0;
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
  width: min(520px, 100%);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.modal__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.modal__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
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
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}
</style>
