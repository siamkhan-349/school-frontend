<template>
  <div class="page">
    <!-- Local tap (this machine): entry/exit AND duplicates show here at once,
         big in the middle — the topbar text is too small to read from afar. -->
    <div v-if="localTap" class="profile" :class="{ 'profile--warn': isDuplicate, 'profile--error': isTapError }">
      <template v-if="localOk">
        <div class="profile__banner" :class="{ 'profile__banner--warn': localOk.tap === 'duplicate', 'profile__banner--late': localOk.status === 'late' }">
          <span v-if="localOk.tap === 'duplicate'">⚠ ALREADY PUNCHED</span>
          <span v-else-if="localOk.tap === 'exit'">✓ EXIT RECORDED</span>
          <span v-else>✓ ENTRY RECORDED</span>
        </div>
        <div class="profile__body">
          <StudentAvatar
            :photo-url="localPhotoUrl"
            :name="localOk.student.name"
            :gender="localGender"
            :size="124"
            class="profile__avatar-img"
          />
          <p class="profile__name">{{ localOk.student.name }}</p>
          <div class="id-row">
            <div class="id-item"><span class="id-item__label">Roll</span><strong class="id-item__value">{{ localOk.student.roll ?? '—' }}</strong></div>
            <div class="id-row__divider"></div>
            <div class="id-item"><span class="id-item__label">Class</span><strong class="id-item__value">{{ localOk.student.classLabel || '—' }}</strong></div>
          </div>
          <div v-if="localOk.entryTime && localOk.exitTime" class="profile__times profile__times--duo">
            <div class="time-card time-card--filled">
              <span class="time-card__icon time-card__icon--in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1 2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg></span>
              <span class="time-card__label">Entry</span>
              <strong class="time-card__value">{{ localOk.entryTime }}</strong>
            </div>
            <div class="time-card time-card--filled">
              <span class="time-card__icon time-card__icon--out"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg></span>
              <span class="time-card__label">Exit</span>
              <strong class="time-card__value">{{ localOk.exitTime }}</strong>
            </div>
          </div>
          <div v-else class="hero-time" :class="{ 'hero-time--out': localOk.tap === 'exit' || (!!localOk.exitTime && !localOk.entryTime) }">
            <span class="hero-time__icon" :class="{ 'hero-time__icon--out': localOk.tap === 'exit' }">
              <svg v-if="localOk.tap === 'exit'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1 2-2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
            </span>
            <span class="hero-time__label">{{ localOk.tap === 'exit' ? 'Exit' : 'Entry' }}</span>
            <strong class="hero-time__value">{{ localOk.tap === 'exit' ? (localOk.exitTime || '–') : (localOk.entryTime || '–') }}</strong>
          </div>
          <p class="profile__foot mono">Card {{ localOk.cardId || '–' }}</p>
        </div>
      </template>
      <template v-else-if="localErr">
        <div class="profile__banner profile__banner--error">✕ {{ localErr.error }}</div>
        <div class="profile__body">
          <span class="profile__avatar profile__avatar--error">?</span>
          <p class="profile__name">Card not recognized</p>
          <p v-if="localErr.cardId" class="profile__foot mono">Card {{ localErr.cardId }}</p>
        </div>
      </template>
    </div>
    <!-- Remote/other-machine punches: fixed box in the middle of the page. -->
    <div v-else-if="shownPunch" class="profile">
      <div class="profile__banner">✓ {{ shownPunch.exitTime ? 'EXIT RECORDED' : 'ENTRY RECORDED' }}</div>
      <div class="profile__body">
        <StudentAvatar
          :photo-url="latestStudent?.data?.photoUrl"
          :name="shownPunch.studentName"
          :gender="latestStudent?.data?.gender"
          :size="124"
          class="profile__avatar-img"
        />
        <p class="profile__name">{{ shownPunch.studentName ?? '—' }}</p>
        <div class="id-row">
          <div class="id-item"><span class="id-item__label">Roll</span><strong class="id-item__value">{{ shownPunch.roll ?? '—' }}</strong></div>
          <div class="id-row__divider"></div>
          <div class="id-item"><span class="id-item__label">Class</span><strong class="id-item__value">{{ shownPunch.classLabel || '—' }}</strong></div>
        </div>
        <div v-if="shownPunch.entryTime && shownPunch.exitTime" class="profile__times profile__times--duo">
          <div class="time-card time-card--filled">
            <span class="time-card__icon time-card__icon--in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg></span>
            <span class="time-card__label">Entry</span>
            <strong class="time-card__value">{{ shownPunch.entryTime }}</strong>
          </div>
          <div class="time-card time-card--filled">
            <span class="time-card__icon time-card__icon--out"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg></span>
            <span class="time-card__label">Exit</span>
            <strong class="time-card__value">{{ shownPunch.exitTime }}</strong>
          </div>
        </div>
        <div v-else class="hero-time">
          <span class="hero-time__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1 2-2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
          </span>
          <span class="hero-time__label">Entry</span>
          <strong class="hero-time__value">{{ shownPunch.entryTime || '–' }}</strong>
        </div>
        <p v-if="profileCard" class="profile__foot mono">Card {{ profileCard }}</p>
      </div>
    </div>
    <div v-else class="profile profile--empty">
      <div class="profile__body">
        <span class="punch-ring"><span class="punch-ring__wave"></span><span class="punch-ring__person"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></span></span>
        <p class="profile__name profile__name--idle">Punch your card</p>
        <p class="profile__clock">{{ clockTime }}</p>
        <p class="profile__date">{{ clockDate }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import StudentAvatar from '@/components/common/StudentAvatar.vue'
import { useRecentAttendance, useStudent } from '@/composables/useQueries'
import { lastTapDetail } from '@/composables/useCardScanner'
import type { StudentAttendance } from '@/types/models'

const now = ref(new Date())
let clockTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  clockTimer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})
const clockTime = computed(() =>
  now.value.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
)
const clockDate = computed(() =>
  now.value.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
)

const { data } = useRecentAttendance(50, 2000)
const rows = computed(() => data.value?.data ?? [])
// Local tap from this machine's reader — shows instantly, including
// duplicates (already punched) and errors, for 5s.
const localTap = ref<typeof lastTapDetail.value>(null)
const localOk = computed(() => (localTap.value && localTap.value.ok ? localTap.value : null))
const localErr = computed(() => (localTap.value && !localTap.value.ok ? localTap.value : null))
const isDuplicate = computed(() => !!localOk.value && localOk.value.tap === 'duplicate')
const isTapError = computed(() => !!localErr.value)
let localTimer: ReturnType<typeof setTimeout> | null = null
watch(lastTapDetail, (d) => {
  localTap.value = d
  if (localTimer) clearTimeout(localTimer)
  if (d) {
    localTimer = setTimeout(() => {
      localTap.value = null
      localTimer = null
    }, 5000)
  }
})
// A fresh punch shows 5s, then the box goes back to waiting. A newer punch
// replaces it at once and restarts the timer.
const seenIds = ref(new Set<string>())
const primed = ref(false)
const shownPunch = ref<StudentAttendance | null>(null)
let clearTimer: ReturnType<typeof setTimeout> | null = null
watch(rows, (list) => {
  if (!primed.value) {
    for (const r of list) seenIds.value.add(r.id)
    primed.value = true
    return
  }
  const fresh = list.filter((r) => !seenIds.value.has(r.id))
  for (const r of list) seenIds.value.add(r.id)
  if (!fresh.length) return
  shownPunch.value = fresh[0] ?? null
  if (clearTimer) clearTimeout(clearTimer)
  clearTimer = setTimeout(() => {
    shownPunch.value = null
    clearTimer = null
  }, 5000)
})
onUnmounted(() => {
  if (localTimer) clearTimeout(localTimer)
  if (clearTimer) clearTimeout(clearTimer)
  if (clockTimer) clearInterval(clockTimer)
})
const latestStudentId = computed(() => shownPunch.value?.studentId ?? '')
const { data: latestStudent } = useStudent(latestStudentId)
const profileCard = computed(() => latestStudent.value?.data.cardId || '')
// Local tapper's record (photo + gender for the big avatar).
const localStudentId = computed(() => localOk.value?.student.id ?? '')
const { data: localStudentData } = useStudent(localStudentId)
const localStudent = computed(() => localStudentData.value?.data)
const localPhotoUrl = computed(() => localStudent.value?.photoUrl || '')
const localGender = computed(() => localStudent.value?.gender || '')
</script>

<style scoped>
/* Middle profile box: one fixed place for whoever punched last. Both
   states share one locked size, so showing a punch never moves the box. */
.page {
  display: flex;
  justify-content: center;
}
.profile {
  width: 100%;
  max-width: 560px;
  min-height: 560px;
  margin: var(--spacing-xl) auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
  text-align: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.profile--empty {
  border-style: dashed;
  box-shadow: none;
}
.profile--warn {
  border-color: var(--color-warning, #b45309);
  border-width: 2px;
}
.profile--error {
  border-color: var(--color-danger, #dc2626);
  border-width: 2px;
}
/* Top status strip fills the empty head space — readable from afar. */
.profile__banner {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--font-size-lg);
  font-weight: 800;
  background: var(--color-success-light, #dcfce7);
  color: var(--color-success, #166534);
  border-bottom: 1px solid var(--color-border);
}
.profile__banner--warn {
  background: var(--color-warning-light, #fef3c7);
  color: #92400e;
}
.profile__banner--late {
  background: var(--color-warning-light, #fef3c7);
  color: #92400e;
}
.profile__banner--error {
  background: #fee2e2;
  color: var(--color-danger, #dc2626);
}
.profile__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: calc(var(--spacing-lg) * 1.4) var(--spacing-lg);
}
.profile__msg {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary, inherit);
  margin: var(--spacing-sm) 0 0;
}
.profile__msg--error {
  color: var(--color-danger, #dc2626);
}
.profile__avatar {
  width: 124px;
  height: 124px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark, var(--color-primary)));
  color: var(--color-primary-contrast);
  font-size: 3.6rem;
  font-weight: 800;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
  border: 4px solid var(--color-primary-light);
}
.profile__avatar--error {
  background: #fee2e2;
  color: var(--color-danger, #dc2626);
  border-color: #fecaca;
}
.profile__avatar-img {
  border-width: 4px;
  border-color: var(--color-primary-light);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
}
.profile__name {
  font-size: 2.1rem;
  font-weight: 800;
  margin: 0;
  line-height: 1.15;
  overflow-wrap: anywhere;
}
.profile__name--idle {
  color: var(--color-text-secondary);
  font-weight: 700;
}
.profile__clock {
  font-size: 2.4rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  margin: 0;
  line-height: 1;
}
.profile__date {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin: 0;
}
.id-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-lg);
  width: 100%;
  max-width: 440px;
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: 16px;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
}
.id-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 110px;
}
.id-item__label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.id-item__value {
  font-size: 1.4rem;
  font-weight: 800;
  line-height: 1.1;
}
.id-row__divider {
  width: 1px;
  align-self: stretch;
  background: var(--color-border);
}
/* Single big time — used when only Entry exists (no empty Exit dash). */
.hero-time {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  max-width: 440px;
  padding: var(--spacing-lg);
  border-radius: 18px;
  background: var(--color-success-light, #dcfce7);
  border: 1px solid var(--color-success, #166534);
}
.hero-time--out {
  background: #fee2e2;
  border-color: var(--color-danger, #dc2626);
}
.hero-time__icon {
  width: 52px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-success, #166534);
}
.hero-time__icon--out {
  color: var(--color-danger, #dc2626);
}
.hero-time__icon svg {
  width: 26px;
  height: 26px;
}
.hero-time__label {
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.75;
}
.hero-time__value {
  font-size: 3.2rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.profile__meta {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin: 0;
}
.profile__times {
  display: grid;
  gap: var(--spacing-md);
  width: 100%;
  margin-top: var(--spacing-sm);
}
.profile__times--duo {
  grid-template-columns: 1fr 1fr;
  max-width: 440px;
}
@media (max-width: 480px) {
  .profile__times--duo {
    grid-template-columns: 1fr;
  }
  .id-row {
    gap: var(--spacing-md);
  }
  .id-item {
    min-width: 0;
  }
}
.time-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--spacing-lg) var(--spacing-md);
  border-radius: 16px;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
}
.time-card--filled {
  background: var(--color-surface);
  border-color: var(--color-primary-light);
  box-shadow: var(--shadow-sm, 0 1px 3px rgb(0 0 0 / 0.08));
}
.time-card__icon {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  margin-bottom: 2px;
}
.time-card__icon svg {
  width: 22px;
  height: 22px;
}
.time-card__icon--in {
  background: var(--color-success-light, #dcfce7);
  color: var(--color-success, #166534);
}
.time-card__icon--out {
  background: #fee2e2;
  color: var(--color-danger, #dc2626);
}
.time-card__label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.time-card__value {
  font-size: 2rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.profile__foot {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin: var(--spacing-xs) 0 0;
  letter-spacing: 0.04em;
}
/* Idle decoration — no extra text, just a soft pulsing badge. */
.punch-ring {
  position: relative;
  width: 120px;
  height: 120px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.punch-ring__person {
  width: 72px;
  height: 72px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  z-index: 1;
}
.punch-ring__person svg {
  width: 36px;
  height: 36px;
}
.punch-ring__wave {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  animation: ring-pulse 2s ease-out infinite;
}
@keyframes ring-pulse {
  0% { transform: scale(0.85); opacity: 0.9; }
  70% { transform: scale(1.08); opacity: 0.25; }
  100% { transform: scale(1.08); opacity: 0; }
}
.att-pill {
  padding: 2px var(--spacing-md);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  text-transform: capitalize;
  background: var(--color-surface-alt);
  color: var(--color-text-secondary);
  white-space: nowrap;
}
.att-pill--present {
  background: var(--color-success-light, #dcfce7);
  color: var(--color-success, #166534);
}
.att-pill--late {
  background: var(--color-warning-light, #fef3c7);
  color: var(--color-warning, #b45309);
}
.att-pill--warn {
  background: var(--color-warning-light, #fef3c7);
  color: var(--color-warning, #92400e);
}
.mono {
  font-variant-numeric: tabular-nums;
}
</style>
