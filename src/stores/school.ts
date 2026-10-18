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
  /** Shell mode: teachers own the subject setup too. */
  const teacherExamEntry = computed(() => examEntryMode.value === 'teacher')
  /** Marks-only mode: admin does the setup, teachers just enter marks. */
  const teacherMarksOnly = computed(() => examEntryMode.value === 'marks')
  /** Any teacher-side exam access at all (nav + teacher panel queries). */
  const teacherExamAccess = computed(() => examEntryMode.value !== 'admin')

  const hasModule = computed(() => (key: string) => enabledModules.value.includes(key))

  async function fetchEnabledModules(force = false): Promise<void> {
    if (loaded.value && !force) return
    const res = await apiClient.get<{ modules: string[]; examEntryMode?: 'admin' | 'teacher' | 'marks'; examCombinedSitting?: boolean }>('/school/modules')
    enabledModules.value = res.data.modules
    examEntryMode.value = res.data.examEntryMode ?? 'admin'
    examCombinedSitting.value = Boolean(res.data.examCombinedSitting)
    loaded.value = true
  }

  function reset(): void {
    enabledModules.value = []
    suspended.value = false
    examEntryMode.value = 'admin'
    examCombinedSitting.value = false
    loaded.value = false
  }

  return { enabledModules, suspended, loaded, examEntryMode, examCombinedSitting, teacherExamEntry, teacherMarksOnly, teacherExamAccess, hasModule, fetchEnabledModules, refresh: () => fetchEnabledModules(true), reset }
})
