<template>
  <div class="page">
    <h1 class="page__title">Module Management</h1>
    <p class="page__lead">
      Super-admin only. Core ships with every school and stays locked — it carries the platform,
      students, academic setup and free SMS. Toggle the add-ons to lock/unlock them for the whole
      school: locked modules hide instantly from the sidebar and routes. Portal modules gate the
      role logins themselves — a locked panel cannot sign in at all, and new accounts of that
      role are refused. Admins cannot change any of these.
    </p>

    <div v-if="isLoading" class="module-grid">
      <AppSkeleton v-for="n in 7" :key="n" variant="card" />
    </div>
    <template v-else>
      <section v-for="group in groups" :key="group.title" class="module-group">
        <h2 class="module-group__title">{{ group.title }}</h2>
        <div class="module-grid">
          <article
            v-for="m in group.items"
            :key="m.key"
            class="module-card"
            :class="{ 'module-card--off': !enabledSet.has(m.key) }"
          >
            <header class="module-card__head">
              <h3 class="module-card__name">{{ m.label }}</h3>
              <span class="chip" :class="{ 'chip--off': !enabledSet.has(m.key) }">
                {{ enabledSet.has(m.key) ? 'enabled' : 'disabled' }}
              </span>
            </header>
            <p class="module-card__desc">{{ m.description }}</p>
            <ul class="module-card__features">
              <li v-for="feature in m.features" :key="feature">{{ feature }}</li>
            </ul>
            <p v-if="m.note" class="module-card__note">{{ m.note }}</p>
            <footer class="module-card__foot">
              <span v-if="m.locked" class="module-card__lock">
                <Lock :size="14" aria-hidden="true" />
                Always on — locked
              </span>
              <div v-else class="module-card__actions">
                <AppButton
                  :variant="enabledSet.has(m.key) ? 'ghost' : 'primary'"
                  :disabled="saving"
                  @click="toggle(m.key)"
                >
                  {{ enabledSet.has(m.key) ? 'Disable' : 'Enable' }}
                </AppButton>
                <button
                  v-if="m.key === 'exam_result'"
                  type="button"
                  class="link-btn"
                  @click="openExamConfig"
                >Exam settings</button>
                <button
                  v-if="m.key === 'attendance'"
                  type="button"
                  class="link-btn"
                  @click="openCardSettings"
                >Card settings</button>
                <button
                  v-if="m.key === 'payroll'"
                  type="button"
                  class="link-btn"
                  @click="openStaffLate"
                >Late settings</button>
              </div>
            </footer>
          </article>
        </div>
      </section>
    </template>

    <Teleport to="body">
      <div v-if="examConfigOpen" class="modal-backdrop" @click.self="examConfigOpen = false">
        <div class="modal">
          <h3 class="modal__title">Exam settings</h3>
          <form class="form" @submit.prevent="saveExamSettings">
            <label>Exam entry mode
              <select v-model="examEntryMode" class="app-input__control">
                <option value="admin">Admin fills everything (classic)</option>
                <option value="teacher" :disabled="!school.hasModule('staff')">Teachers fill their own subjects</option>
                <option value="marks" :disabled="!school.hasModule('staff')">Admin fills subjects, teachers enter marks</option>
              </select>
            </label>
            <p class="modal__hint">
              Teacher mode: the admin creates only the exam shell (name, date, class, section) and each
              subject's assigned teacher fills its category, marks bars and student marks from the teacher
              panel. Marks-only mode: the admin fills every subject's category and marks bars, and each
              subject's teacher enters only the student marks. An exam with subjects still waiting cannot
              be published.
            </p>
            <p v-if="!school.hasModule('staff')" class="modal__warn">
              Teacher modes need the Teachers &amp; Staff module — turn it on from People add-ons.
              Exams currently behave as admin mode.
            </p>

            <hr class="modal__divider" />

            <label>Result SMS mode
              <select v-model="resultSmsMode" class="app-input__control">
                <option value="after_publish">After publish</option>
                <option value="per_student">Per student</option>
              </select>
            </label>
            <p class="modal__hint">
              After publish — the result SMS goes out when the result is published (the safe default;
              nothing can go out early). Per student — texts each student as their result is finalized.
            </p>

            <hr class="modal__divider" />

            <label class="switch-row">
              <span class="switch-row__text">
                <span class="switch-row__title">Combined exam sittings</span>
                <span class="switch-row__hint">
                  One sitting may cover several subjects (off = the standard one subject per sitting;
                  the exam routine builder follows this)
                </span>
              </span>
              <span class="switch">
                <input v-model="examCombinedSitting" type="checkbox" />
                <span class="switch__track" aria-hidden="true"></span>
              </span>
            </label>

            <div class="form-actions">
              <AppButton variant="ghost" type="button" :disabled="savingSettings" @click="examConfigOpen = false">Cancel</AppButton>
              <AppButton type="submit" :loading="savingSettings">Save</AppButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="cardSettingsOpen" class="modal-backdrop" @click.self="cardSettingsOpen = false">
        <div class="modal">
          <h3 class="modal__title">Card-punch settings</h3>
          <form class="form" @submit.prevent="saveCardSettings">
            <p class="modal__hint">
              Gate card-punch behaviour: the guardian SMS sent on each punch, and how long a
              freshly issued card needs before its taps are accepted.
            </p>
            <label class="switch-row">
              <span class="switch-row__text">
                <span class="switch-row__title">Entry SMS</span>
                <span class="switch-row__hint">Guardian gets present + entry time on card punch</span>
              </span>
              <span class="switch">
                <input v-model="entrySmsEnabled" type="checkbox" />
                <span class="switch__track" aria-hidden="true"></span>
              </span>
            </label>
            <label class="switch-row">
              <span class="switch-row__text">
                <span class="switch-row__title">Exit SMS</span>
                <span class="switch-row__hint">Guardian gets exit time on exit punch</span>
              </span>
              <span class="switch">
                <input v-model="exitSmsEnabled" type="checkbox" />
                <span class="switch__track" aria-hidden="true"></span>
              </span>
            </label>
            <hr class="modal__divider" />

            <label>Card cooldown (minutes after issue before taps work, 0 = off)
              <input v-model.number="cardCooldownMinutes" type="number" min="0" class="app-input__control" />
            </label>
            <p class="modal__hint">
              A freshly issued card stays in processing for this long — taps inside the window are
              refused, never recorded. 0 turns the wait off.
            </p>

            <hr class="modal__divider" />

            <label>Late after (minutes past start)
              <input v-model.number="lateMinutes" type="number" min="0" max="240" class="app-input__control" />
            </label>
            <p class="modal__hint">
              A student tap at/after the start plus these minutes is late. Each class counts from
              its own start time (a 09:00 class with 15 is late from 09:15); 0 = late right at the
              start. A class can override this on its own page.
            </p>

            <div class="form-actions">
              <AppButton variant="ghost" type="button" :disabled="savingSettings" @click="cardSettingsOpen = false">Cancel</AppButton>
              <AppButton type="submit" :loading="savingSettings">Save</AppButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="staffLateOpen" class="modal-backdrop" @click.self="staffLateOpen = false">
        <div class="modal">
          <h3 class="modal__title">Staff late settings</h3>
          <form class="form" @submit.prevent="saveStaffLate">
            <p class="modal__hint">
              Staff attendance lives under Payroll, and a teacher's late time does not have to
              match the students' — this rule is its own.
            </p>
            <label class="switch-row">
              <span class="switch-row__text">
                <span class="switch-row__title">Per-person timing</span>
                <span class="switch-row__hint">Each teacher's own entry/exit time counts (set on their profile). Off = the school hours count for everyone</span>
              </span>
              <span class="switch">
                <input v-model="staffOwnTimes" type="checkbox" />
                <span class="switch__track" aria-hidden="true"></span>
              </span>
            </label>
            <hr class="modal__divider" />

            <label>Late after (minutes past start)
              <input v-model.number="staffLateMinutes" type="number" min="0" max="240" class="app-input__control" />
            </label>
            <p class="modal__hint">
              A staff card tap at/after the start plus these minutes counts late on the payroll
              sheet; 0 = late right at the start. The start is the school start — or the person's
              own base time while per-person timing is on.
            </p>
            <div class="form-actions">
              <AppButton variant="ghost" type="button" :disabled="savingSettings" @click="staffLateOpen = false">Cancel</AppButton>
              <AppButton type="submit" :loading="savingSettings">Save</AppButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Lock } from 'lucide-vue-next'
import AppButton from '@/components/common/AppButton.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import { MODULE_CATALOG, enabledDependentsOf, type ModuleCatalogEntry, type ModuleKey } from '@/constants/modules'
import { useModules, useSettings, useUpdateModules, useUpdateSettings } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { useSchoolStore } from '@/stores/school'

const toast = useToast()
const school = useSchoolStore()
// Entitlements endpoint (/coaching/modules) — writes are super-admin only.
const { data, isLoading } = useModules()
const { mutateAsync: updateModules, isPending: saving } = useUpdateModules()
const enabledSet = ref<Set<string>>(new Set())

const GROUP_TITLES: Record<string, string> = {
  Core: 'Base — always on',
  Academics: 'Academics add-ons',
  People: 'People add-ons',
  Finance: 'Finance add-ons',
  Communication: 'Communication add-ons',
  Portal: 'Portal add-ons',
  System: 'System add-ons',
}

// Sections follow catalog order (base first), then first-seen category order.
const groups = computed(() => {
  const order: string[] = []
  const byCategory = new Map<string, ModuleCatalogEntry[]>()
  for (const m of MODULE_CATALOG) {
    if (!byCategory.has(m.category)) {
      byCategory.set(m.category, [])
      order.push(m.category)
    }
    byCategory.get(m.category)?.push(m)
  }
  return order.map((category) => ({
    title: GROUP_TITLES[category] ?? category,
    items: byCategory.get(category) ?? [],
  }))
})

watch(
  data,
  (res) => {
    if (res?.data) enabledSet.value = new Set(res.data.enabledModules)
  },
  { immediate: true },
)

// Exam module settings (entry mode, result SMS mode, combined sittings) are
// configured from the Exam & Result card, the way every module card owns its
// own options: the footer link opens a small dialog, so the card grid keeps
// its standard layout — no card grows taller than the row it sits in.
const { data: settingsData } = useSettings()
const { mutateAsync: updateSettings, isPending: savingSettings } = useUpdateSettings()
const examConfigOpen = ref(false)
const examEntryMode = ref<'admin' | 'teacher' | 'marks'>('admin')
const resultSmsMode = ref<'after_publish' | 'per_student'>('after_publish')
const examCombinedSitting = ref(false)
watch(
  settingsData,
  (res) => {
    if (res?.data) {
      examEntryMode.value = res.data.examEntryMode ?? 'admin'
      resultSmsMode.value = res.data.resultSmsMode ?? 'after_publish'
      examCombinedSitting.value = Boolean(res.data.examCombinedSitting)
    }
  },
  { immediate: true },
)
const EXAM_MODE_LABELS: Record<'admin' | 'teacher' | 'marks', string> = {
  admin: 'Admin fills everything',
  teacher: 'Teachers fill their own subjects',
  marks: 'Admin fills subjects, teachers enter marks',
}
function openExamConfig(): void {
  // Start from the saved values so Cancel discards abandoned picks.
  examEntryMode.value = settingsData.value?.data.examEntryMode ?? 'admin'
  resultSmsMode.value = settingsData.value?.data.resultSmsMode ?? 'after_publish'
  examCombinedSitting.value = Boolean(settingsData.value?.data.examCombinedSitting)
  examConfigOpen.value = true
}
async function saveExamSettings(): Promise<void> {
  const mode = examEntryMode.value
  try {
    await updateSettings({
      examEntryMode: mode,
      resultSmsMode: resultSmsMode.value,
      examCombinedSitting: examCombinedSitting.value,
    })
    await school.refresh()
    examConfigOpen.value = false
    toast.success(`Exam settings saved — ${EXAM_MODE_LABELS[mode]}`)
  } catch {
    toast.error('Exam settings update failed')
  }
}

// Card-punch settings — the Attendance module owns the student card reader
// (cards are issued under its gate and the tap endpoint enforces the
// cooldown and the late rule), so its options live here.
const cardSettingsOpen = ref(false)
const entrySmsEnabled = ref(false)
const exitSmsEnabled = ref(false)
const cardCooldownMinutes = ref(1)
const lateMinutes = ref(0)
watch(
  settingsData,
  (res) => {
    if (res?.data) {
      entrySmsEnabled.value = Boolean(res.data.entrySmsEnabled)
      exitSmsEnabled.value = Boolean(res.data.exitSmsEnabled)
      cardCooldownMinutes.value = Number(res.data.cardCooldownMinutes ?? 1) || 0
      lateMinutes.value = Number(res.data.lateMinutes ?? 0) || 0
    }
  },
  { immediate: true },
)
function openCardSettings(): void {
  entrySmsEnabled.value = Boolean(settingsData.value?.data.entrySmsEnabled)
  exitSmsEnabled.value = Boolean(settingsData.value?.data.exitSmsEnabled)
  cardCooldownMinutes.value = Number(settingsData.value?.data.cardCooldownMinutes ?? 1) || 0
  lateMinutes.value = Number(settingsData.value?.data.lateMinutes ?? 0) || 0
  cardSettingsOpen.value = true
}
async function saveCardSettings(): Promise<void> {
  const entry = entrySmsEnabled.value
  const exit = exitSmsEnabled.value
  const cooldown = Number(cardCooldownMinutes.value) || 0
  const late = Number(lateMinutes.value) || 0
  try {
    await updateSettings({
      entrySmsEnabled: entry,
      exitSmsEnabled: exit,
      cardCooldownMinutes: cooldown,
      lateMinutes: late,
    })
    cardSettingsOpen.value = false
    toast.success('Card settings saved')
  } catch {
    toast.error('Card settings update failed')
  }
}

// Staff late rule — Payroll owns staff attendance, so its grace minutes and
// the per-person timing toggle live there and stay independent of the
// student rule.
const staffLateOpen = ref(false)
const staffLateMinutes = ref(0)
const staffOwnTimes = ref(false)
watch(
  settingsData,
  (res) => {
    if (res?.data) {
      staffLateMinutes.value = Number(res.data.staffLateMinutes ?? 0) || 0
      staffOwnTimes.value = Boolean(res.data.staffOwnTimes)
    }
  },
  { immediate: true },
)
function openStaffLate(): void {
  staffLateMinutes.value = Number(settingsData.value?.data.staffLateMinutes ?? 0) || 0
  staffOwnTimes.value = Boolean(settingsData.value?.data.staffOwnTimes)
  staffLateOpen.value = true
}
async function saveStaffLate(): Promise<void> {
  const minutes = Number(staffLateMinutes.value) || 0
  const ownTimes = staffOwnTimes.value
  try {
    await updateSettings({ staffLateMinutes: minutes, staffOwnTimes: ownTimes })
    await school.refresh()
    staffLateOpen.value = false
    toast.success(
      ownTimes
        ? `Per-person timing on — late after the person's base time + ${minutes} min`
        : `Staff late rule saved — late after ${minutes} min`,
    )
  } catch {
    toast.error('Staff late rule update failed')
  }
}

const labelOf = (key: string): string =>
  MODULE_CATALOG.find((m) => m.key === key)?.label ?? key

async function toggle(key: ModuleKey): Promise<void> {
  const next = new Set(enabledSet.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  const before = enabledSet.value
  enabledSet.value = next
  try {
    const res = await updateModules([...next])
    // The resolver returns the final list — dependencies can pull keys back on.
    const final = new Set(res.data?.enabledModules ?? [...next])
    enabledSet.value = final
    await school.refresh()
    if (final.has(key) === next.has(key)) {
      // Enabling a module can pull its own dependencies on with it.
      const pulled = next.has(key) ? [...final].filter((k) => !next.has(k)) : []
      if (pulled.length) {
        toast.success(`Module enabled — ${pulled.map(labelOf).join(', ')} turned on with it`)
      } else {
        toast.success(`Module ${next.has(key) ? 'enabled' : 'disabled'}`)
      }
    } else {
      // Disable refused — name the enabled modules that depend on this one so
      // it is clear what must be switched off first.
      const keepers = enabledDependentsOf(key, (k) => final.has(k)).map(labelOf)
      toast.error(
        keepers.length
          ? `Kept on — ${keepers.length === 1 ? `${keepers[0]} needs it` : `${keepers.join(', ')} need it`}`
          : 'Kept on — another enabled module needs it',
      )
    }
  } catch {
    enabledSet.value = before
    toast.error('Update failed')
  }
}
</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-sm);
}
.page__lead {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  max-width: 860px;
  margin-bottom: var(--spacing-xl);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.module-group {
  margin-bottom: var(--spacing-xl);
}
.module-group__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-md);
}
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--spacing-md);
}
.module-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
.module-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}
.module-card__name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.module-card__desc {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
}
.module-card__features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.module-card__features li {
  display: flex;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
.module-card__features li::before {
  content: '';
  flex: none;
  width: 5px;
  height: 5px;
  margin-top: 8px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
}
.module-card__note {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  font-style: italic;
  line-height: var(--line-height-normal);
}
.module-card__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}
.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  padding: 0;
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
  max-height: calc(100dvh - 2 * var(--spacing-lg));
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.modal__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.modal__divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: var(--spacing-xs) 0;
}
.modal__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}
.modal__warn {
  font-size: var(--font-size-sm);
  color: var(--color-warning);
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
.form label.switch-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  cursor: pointer;
}
.switch-row__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.switch-row__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.switch-row__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: var(--line-height-normal);
}
.switch {
  position: relative;
  display: inline-flex;
  width: 42px;
  height: 24px;
  flex-shrink: 0;
}
.switch input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  margin: 0;
  cursor: pointer;
}
.switch__track {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-full);
  background: var(--color-border);
  transition: background var(--transition-fast);
  pointer-events: none;
}
.switch__track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.25);
  transition: transform var(--transition-fast);
}
.switch input:checked + .switch__track {
  background: var(--color-primary);
}
.switch input:checked + .switch__track::after {
  transform: translateX(18px);
}
.switch input:focus-visible + .switch__track {
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}
.module-card--off .module-card__features {
  opacity: 0.55;
}
.module-card__foot {
  margin-top: auto;
  padding-top: var(--spacing-sm);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}
.module-card__lock {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.chip {
  display: inline-block;
  flex: none;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--color-success-light);
  color: var(--color-success);
  font-size: var(--font-size-xs);
}
.chip--off {
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
}
</style>
