<template>
  <div class="page">
    <div class="page__head">
      <h1 class="page__title">Notice & Events</h1>
      <AppButton @click="form.open = true">+ New Notice</AppButton>
    </div>

    <AppCard>
      <p v-if="isLoading" class="muted">Loading…</p>
      <ul v-else class="events">
        <li v-for="e in events" :key="e.id" class="event">
          <div>
            <strong>{{ e.title }}</strong>
            <span class="chip" :class="`chip--${e.status}`">{{ e.status }}</span>
            <span class="muted"> · {{ e.type }} · {{ e.audience }} · {{ e.eventDate }}</span>
            <p class="muted">{{ e.description }}</p>
          </div>
          <div class="row-actions">
            <button v-if="e.status === 'draft'" class="link-btn" type="button" @click="setStatus(e.id, 'published')">
              Publish
            </button>
            <button v-if="e.status === 'published'" class="link-btn" type="button" @click="setStatus(e.id, 'archived')">
              Archive
            </button>
            <button class="link-btn link-btn--danger" type="button" @click="remove(e.id)">Delete</button>
          </div>
        </li>
      </ul>
      <p v-if="!isLoading && events.length === 0" class="muted">No notices yet.</p>
    </AppCard>

    <Teleport to="body">
      <div v-if="form.open" class="modal-backdrop" @click.self="form.open = false">
        <div class="modal">
          <h3 class="modal__title">New Notice</h3>
          <form class="form" @submit.prevent="save">
            <label>Title<input v-model="form.title" class="app-input__control" required /></label>
            <label>Description<textarea v-model="form.description" class="app-input__control" rows="3" /></label>
            <label>Date<input v-model="form.eventDate" type="date" class="app-input__control" required /></label>
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
                  <option value="students">Students</option>
                  <option value="teachers">Teachers</option>
                  <option value="parents">Parents</option>
                </select>
              </label>
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="form-actions">
              <AppButton variant="ghost" type="button" @click="form.open = false">Cancel</AppButton>
              <AppButton type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Create' }}</AppButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import { useCreateEvent, useDeleteEvent, useEvents, useEventStatus } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import type { SchoolEvent } from '@/types/models'

const toast = useToast()
const { data, isLoading } = useEvents()
const events = computed(() => data.value?.data ?? [])

const today = (): string => new Date().toISOString().slice(0, 10)
const form = reactive({
  open: false,
  title: '',
  description: '',
  eventDate: today(),
  type: 'notice' as SchoolEvent['type'],
  audience: 'all' as SchoolEvent['audience'],
})
const formError = ref('')
const saving = ref(false)
const { mutateAsync: createEvent } = useCreateEvent()

async function save(): Promise<void> {
  formError.value = ''
  saving.value = true
  try {
    await createEvent({
      title: form.title.trim(),
      description: form.description.trim(),
      eventDate: form.eventDate,
      type: form.type,
      audience: form.audience,
    })
    toast.success('Notice created as draft')
    form.open = false
    form.title = ''
    form.description = ''
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

const { mutateAsync: changeStatus } = useEventStatus()
async function setStatus(id: string, status: SchoolEvent['status']): Promise<void> {
  try {
    await changeStatus({ id, status })
    toast.success(`Notice ${status}`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}

const { mutateAsync: deleteEvent } = useDeleteEvent()
async function remove(id: string): Promise<void> {
  try {
    await deleteEvent(id)
    toast.success('Notice removed')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
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
  gap: var(--spacing-md);
  padding: var(--spacing-md) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
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
.row-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}
.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
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
}
.modal__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-md);
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
}
</style>
