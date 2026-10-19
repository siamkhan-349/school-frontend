import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/lib/api/apiClient'

/**
 * School (tenant) config — live backend only.
 * Single source for module-gating + session.
 */
export const useSchoolStore = defineStore('school', () => {
  const enabledModules = ref<string[]>([])
  const suspended = ref(false)
  const loaded = ref(false)
  /**
   * Institute-wide exam entry switch (super-admin).
   * - `admin`   classic: admin fills bars + marks.
   * - `teacher` shell create: admin makes the exam, teachers fill their
   *             subject bars + marks.
   * - `marks`   admin fills every subject bar; teachers enter marks only.
   */
  const examEntryMode = ref<'admin' | 'teacher' | 'marks'>('admin')
  /**
   * Exam routine builder style (super-admin).
   * `false` standard: one subject per sitting.
   * `true` combined: a sitting may cover several subjects (oral/mixed exams).
   */
  const examCombinedSitting = ref(false)
  /**
   * Per-person staff timing (super-admin, Payroll card).
   * `false` the school start counts for every staff member; `true` each
   * teacher's own base time counts for late (set on their profile).
   */
  const staffOwnTimes = ref(false)
  const hasModule = computed(() => (key: string) => enabledModules.value.includes(key))
  /**
   * Effective entry mode — teacher-side modes pause while Teachers & Staff
   * is off (subject ownership lives on its teacher records); exams behave as
   * admin mode until it is back on. The backend enforces the same fallback.
   */
  const effectiveExamEntryMode = computed<'admin' | 'teacher' | 'marks'>(() =>
    hasModule.value('staff') ? examEntryMode.value : 'admin',
  )
  /** Shell mode: teachers own the subject setup too. */
  const teacherExamEntry = computed(() => effectiveExamEntryMode.value === 'teacher')
  /** Marks-only mode: admin does the setup, teachers just enter marks. */
  const teacherMarksOnly = computed(() => effectiveExamEntryMode.value === 'marks')
  /** Any teacher-side exam access at all (nav + teacher panel queries). */
  const teacherExamAccess = computed(() => effectiveExamEntryMode.value !== 'admin')

  async function fetchEnabledModules(force = false): Promise<void> {
    if (loaded.value && !force) return
    const res = await apiClient.get<{ modules: string[]; examEntryMode?: 'admin' | 'teacher' | 'marks'; examCombinedSitting?: boolean; staffOwnTimes?: boolean }>('/school/modules')
    enabledModules.value = res.data.modules
    // H16a semantics: an existing subscription with an empty list means every
    // module is off ("suspended"). The router turns this into /suspended —
    // login and the super-admin workspaces stay reachable.
    suspended.value = Array.isArray(res.data.modules) && res.data.modules.length === 0
    examEntryMode.value = res.data.examEntryMode ?? 'admin'
    examCombinedSitting.value = Boolean(res.data.examCombinedSitting)
    staffOwnTimes.value = Boolean(res.data.staffOwnTimes)
    loaded.value = true
  }

  function reset(): void {
    enabledModules.value = []
    suspended.value = false
    examEntryMode.value = 'admin'
    examCombinedSitting.value = false
    staffOwnTimes.value = false
    loaded.value = false
  }

  return { enabledModules, suspended, loaded, examEntryMode, examCombinedSitting, staffOwnTimes, teacherExamEntry, teacherMarksOnly, teacherExamAccess, hasModule, fetchEnabledModules, refresh: () => fetchEnabledModules(true), reset }
})
