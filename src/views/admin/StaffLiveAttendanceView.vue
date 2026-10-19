<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Staff Live Attendance</h1>
        <p class="muted">Card / finger reader — staff attendance only; present/absent days feed the payroll sheet. Today: {{ today }}</p>
      </div>
      <AppButton variant="ghost" type="button" @click="router.push('/admin/teachers')">Teachers & Staff</AppButton>
    </div>

    <AppCard>
      <form class="scan-row" @submit.prevent="submitScan">
        <input
          ref="scanInput"
          v-model="scanBox"
          class="app-input__control scan-box"
          placeholder="Scan card or finger ID…"
          autocomplete="off"
        />
        <AppButton type="submit" :disabled="!scanBox.trim()" :loading="punching">Punch</AppButton>
      </form>
      <p class="hint">The reader types like a keyboard — this page just needs to stay open, no box focus needed.</p>
      <p v-if="lastTap.ok" class="tap-ok">{{ lastTap.ok }}</p>
      <p v-if="lastTap.err" class="error">{{ lastTap.err }}</p>
    </AppCard>

    <AppCard v-if="detail" class="tap-card">
      <template v-if="detail.ok">
        <p class="profile__name">{{ detail.teacher.name }}</p>
        <p class="muted">{{ detail.teacher.designation || detail.teacher.kind }}</p>
        <div class="time-row">
          <div class="time-card"><span class="time-card__label">Entry</span><strong>{{ detail.entryTime || '—' }}</strong></div>
          <div class="time-card"><span class="time-card__label">Exit</span><strong>{{ detail.exitTime || '—' }}</strong></div>
          <div class="time-card"><span class="time-card__label">Status</span><strong>{{ detail.status }}</strong></div>
        </div>
      </template>
      <template v-else>
        <p class="profile__name">Card not recognized</p>
        <p v-if="detail.cardId" class="mono muted">ID {{ detail.cardId }}</p>
        <p class="error">{{ detail.error }}</p>
      </template>
    </AppCard>

    <AppCard>
      <h3 class="card-title">Tapped today (<AppSkeleton v-if="isLoading" variant="chip" :width="'28px'" /><template v-else>{{ tappedToday.length }}</template>)</h3>
      <AppSkeleton v-if="isLoading" variant="table" :rows="8" :cols="5" />
      <p v-else-if="!tappedToday.length" class="muted">Nobody tapped yet today.</p>
      <table v-else class="table">
        <thead>
          <tr><th>Name</th><th>Type</th><th>Entry</th><th>Exit</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in tappedToday" :key="r.teacherId">
            <td>{{ r.name }}</td>
            <td>{{ r.kind }}</td>
            <td>{{ r.entryTime || '—' }}</td>
            <td>{{ r.exitTime || '—' }}</td>
            <td>{{ r.status }}</td>
          </tr>
        </tbody>
      </table>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import { useStaffAttendance, useTeachers } from '@/composables/useQueries'
import { lastStaffTap, lastStaffTapDetail, useStaffScanner } from '@/composables/useStaffScanner'

const router = useRouter()
const today = new Date().toISOString().slice(0, 10)

const scanBox = ref('')
const scanInput = ref<HTMLInputElement | null>(null)
const { punch } = useStaffScanner()
const lastTap = lastStaffTap
const detail = lastStaffTapDetail

const punching = ref(false)
async function submitScan(): Promise<void> {
  punching.value = true
  try {
    await punch(scanBox.value)
  } finally {
    punching.value = false
  }
  scanBox.value = ''
  scanInput.value?.focus()
}

const params = computed(() => ({ page: 1, perPage: 500 }))
const { data: teacherData } = useTeachers(params)
const { data: attData, isLoading } = useStaffAttendance(() => today)

const tappedToday = computed(() => {
  const marks = attData.value?.data ?? []
  const names = new Map((teacherData.value?.data.items ?? []).map((t) => [t.id, t]))
  return marks
    .filter((m) => m.entryTime)
    .map((m) => {
      const t = names.get(m.teacherId)
      return {
        teacherId: m.teacherId,
        name: t?.name ?? m.teacherId,
        kind: t?.kind === 'staff' ? 'Staff' : 'Teacher',
        entryTime: m.entryTime ?? '',
        exitTime: m.exitTime ?? '',
        status: m.status,
      }
    })
    .sort((a, b) => (b.entryTime ?? '').localeCompare(a.entryTime ?? ''))
})
</script>

<style scoped>
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-lg);
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
.tap-ok {
  color: var(--color-success, green);
  font-weight: var(--font-weight-semibold);
}
.scan-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}
.scan-box {
  font-size: var(--font-size-lg);
  padding: var(--spacing-md);
}
.hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-top: var(--spacing-xs);
}
.tap-card {
  margin-top: var(--spacing-lg);
}
.profile__name {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}
.time-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}
.time-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.time-card__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
}
.mono {
  font-family: ui-monospace, monospace;
}
.card-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-md);
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
</style>
