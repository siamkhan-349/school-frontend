<template>
  <div class="page">
    <div class="page__head">
      <h1 class="page__title">My Leaves</h1>
      <AppButton :disabled="!teacher" @click="form.open = true">+ Apply Leave</AppButton>
    </div>
    <div v-if="meLoading" class="sk-stack">
      <AppSkeleton variant="card" />
      <AppSkeleton variant="card" />
    </div>
    <p v-else-if="!teacher" class="error">
      No teacher/staff profile is linked to this login. Ask the admin to link one from Users.
    </p>
    <AppCard v-else>
      <AppSkeleton v-if="leavesLoading" variant="table" :rows="6" :cols="6" />
      <div v-else class="table-scroll">
        <table class="table">
          <thead>
            <tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Note</th></tr>
          </thead>
          <tbody>
            <tr v-for="l in myLeaves" :key="l.id">
              <td>{{ l.type }}</td>
              <td>{{ l.startDate }}</td>
              <td>{{ l.endDate }}</td>
              <td>{{ l.days }}</td>
              <td>
                <span class="pill" :class="`pill--${l.status}`">{{ l.status }}</span>
              </td>
              <td>{{ l.note || '—' }}</td>
            </tr>
            <tr v-if="myLeaves.length === 0">
              <td colspan="6" class="muted">No leave applications yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>

    <Teleport to="body">
      <div v-if="form.open" class="modal-backdrop" @click.self="form.open = false">
        <div class="modal">
          <h3 class="modal__title">Apply for Leave</h3>
          <form class="form" @submit.prevent="apply">
            <div class="form-row">
              <label>Type
                <select v-model="form.type" class="app-input__control">
                  <option value="casual">Casual</option>
                  <option value="sick">Sick</option>
                  <option value="annual">Annual</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <div class="form-row">
              <label>From<input v-model="form.startDate" type="date" class="app-input__control" required /></label>
              <label>To<input v-model="form.endDate" type="date" class="app-input__control" required /></label>
            </div>
            <label>Note<textarea v-model="form.note" class="app-input__control" rows="2" /></label>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="form-actions">
              <AppButton variant="ghost" type="button" @click="form.open = false">Cancel</AppButton>
              <AppButton type="submit" :loading="applying">Apply</AppButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import { useApplyLeave, useLeaves, useMyTeacher } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const { data: meData, isLoading: meLoading } = useMyTeacher()
const teacher = computed(() => meData.value?.data)
const teacherId = computed(() => teacher.value?.id ?? '')

const { data: leavesData, isLoading: leavesLoading } = useLeaves()
const myLeaves = computed(() =>
  (leavesData.value?.data ?? []).filter((l) => l.teacherId === teacherId.value),
)

const form = reactive({ open: false, type: 'casual', startDate: '', endDate: '', note: '' })
const formError = ref('')
const { mutateAsync: applyLeave, isPending: applying } = useApplyLeave()
async function apply(): Promise<void> {
  formError.value = ''
  try {
    await applyLeave({
      teacherId: teacherId.value,
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      note: form.note.trim(),
    })
    toast.success('Leave application sent for approval')
    form.open = false
    form.startDate = ''
    form.endDate = ''
    form.note = ''
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Failed'
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
.pill {
  display: inline-block;
  padding: 1px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: capitalize;
}
.pill--pending {
  background: var(--color-warning-light);
  color: var(--color-warning);
}
.pill--approved {
  background: var(--color-success-light);
  color: var(--color-success);
}
.pill--rejected {
  background: var(--color-danger-light);
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
  overflow-y: auto;
}
.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-lg);
  width: min(520px, 100%);
  max-height: min(85vh, 640px);
  max-height: min(85dvh, 640px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.modal__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin: 0;
  overflow-wrap: anywhere;
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
