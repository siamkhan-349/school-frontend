<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Promote Students</h1>
        <p class="page__hint">Move a whole class to the next year — assigns new rolls, applies fee structure, records history.</p>
      </div>
      <AppButton variant="ghost" type="button" @click="goBack">← Back</AppButton>
    </div>

    <div v-if="classesLoading" class="sk-stack">
      <AppSkeleton variant="card" />
      <AppSkeleton variant="card" />
    </div>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else>
      <!-- Step indicator -->
      <div class="wizard-steps">
        <div class="wizard-step" :class="{ active: step >= 1, done: step > 1 }">
          <span class="wizard-step__num">1</span>
          <span class="wizard-step__label">Source & Target</span>
        </div>
        <div class="wizard-step" :class="{ active: step >= 2, done: step > 2 }">
          <span class="wizard-step__num">2</span>
          <span class="wizard-step__label">Students & Mapping</span>
        </div>
        <div class="wizard-step" :class="{ active: step >= 3, done: step > 3 }">
          <span class="wizard-step__num">3</span>
          <span class="wizard-step__label">Options & Preview</span>
        </div>
        <div class="wizard-step" :class="{ active: step >= 4 }">
          <span class="wizard-step__num">4</span>
          <span class="wizard-step__label">Confirm</span>
        </div>
      </div>

      <!-- Step 1: Class selection -->
      <AppCard v-if="step === 1" title="Step 1 — Choose classes">
        <div class="form-grid">
          <label>From Class (Current Year)*
            <select v-model="form.fromUnitId" class="app-input__control" @change="loadFromClassStudents">
              <option value="">Select current class</option>
              <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
            <span v-if="errors.fromUnitId" class="field-error">{{ errors.fromUnitId }}</span>
          </label>
          <label>To Class (Next Year)*
            <select v-model="form.toUnitId" class="app-input__control" @change="loadToClassDetails">
              <option value="">Select next class</option>
              <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
            <span v-if="errors.toUnitId" class="field-error">{{ errors.toUnitId }}</span>
          </label>
        </div>
        
        <div class="form-actions">
          <AppButton type="button" @click="goBack">Cancel</AppButton>
          <AppButton type="button" :disabled="!form.fromUnitId || !form.toUnitId || form.fromUnitId === form.toUnitId" @click="step = 2">Next →</AppButton>
        </div>
      </AppCard>

      <!-- Step 2: Student selection + section/dept mapping -->
      <AppCard v-if="step === 2" :title="step2Title">
        <div v-if="fromStudentsLoading" class="sk-stack">
          <AppSkeleton variant="table" :rows="10" :cols="4" />
        </div>
        <p v-else-if="!filteredFromStudents.length" class="muted">No students in the selected class.</p>
        <template v-else>
          <!-- Single student mode: simple, focused UI -->
          <div v-if="isSingleStudent" class="single-student-promo">
            <div class="student-info-card">
              <h4>{{ singleStudent.name }}</h4>
              <div class="student-meta">
                <span><strong>Roll:</strong> {{ singleStudent.roll ?? '—' }}</span>
                <span v-if="singleStudent.sectionId"><strong>Current Section:</strong> {{ currentSectionLabel }}</span>
                <span v-if="singleStudent.departmentId"><strong>Current Dept:</strong> {{ currentDepartmentLabel }}</span>
              </div>
            </div>

            <div class="form-grid" v-if="toSections.length">
              <label>Target Section *
                <select v-model="sectionMapValue" class="app-input__control" required>
                  <option value="">Select section</option>
                  <option v-for="ts in toSections" :key="ts.id" :value="ts.id">{{ ts.label }}</option>
                </select>
              </label>
            </div>

            <div class="form-grid" v-if="toDepartments.length">
              <label>Target Department *
                <select v-model="departmentMapValue" class="app-input__control" required>
                  <option value="">Select department</option>
                  <option v-for="td in toDepartments" :key="td.id" :value="td.id">{{ td.label }}</option>
                </select>
              </label>
            </div>

            <p v-if="!toSections.length && !toDepartments.length" class="muted">
              Target class has no sections or departments — student will be assigned without them.
            </p>
          </div>

          <!-- Bulk mode: table with checkboxes + full mapping grids -->
          <div v-else>
            <div class="table-scroll">
              <table class="table">
                <thead>
                  <tr>
                    <th style="width: 40px;"><input type="checkbox" v-model="selectAll" @change="toggleAll" /></th>
                    <th>Name</th>
                    <th>Roll</th>
                    <th>Current Section</th>
                    <th>Current Dept</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in filteredFromStudents" :key="s.id">
                    <td><input type="checkbox" v-model="form.studentIds" :value="s.id" /></td>
                    <td>{{ s.name }}</td>
                    <td>{{ s.roll ?? '—' }}</td>
                    <td>{{ s.sectionLabel ?? '—' }}</td>
                    <td>{{ s.departmentLabel ?? '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="muted"><strong>{{ form.studentIds!.length }}</strong> of {{ filteredFromStudents.length }} selected.</p>

            <!-- Section mapping -->
            <div class="mapping-section" v-if="fromSections.length && toSections.length">
              <h4>Section Mapping</h4>
              <p class="muted">Map each source section to a target section. Unmapped students go to the default target section.</p>
              <div class="mapping-grid">
                <div v-for="fs in fromSections" :key="fs.id" class="mapping-row">
                  <label class="mapping-label">{{ fs.label }} →</label>
                  <select v-model="form.sectionMap[fs.id]" class="app-input__control">
                    <option value="">(default)</option>
                    <option v-for="ts in toSections" :key="ts.id" :value="ts.id">{{ ts.label }}</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Department mapping -->
            <div class="mapping-section" v-if="fromDepartments.length && toDepartments.length">
              <h4>Department Mapping</h4>
              <p class="muted">Map each source department to a target department.</p>
              <div class="mapping-grid">
                <div v-for="fd in fromDepartments" :key="fd.id" class="mapping-row">
                  <label class="mapping-label">{{ fd.label }} →</label>
                  <select v-model="form.departmentMap[fd.id]" class="app-input__control">
                    <option value="">(default)</option>
                    <option v-for="td in toDepartments" :key="td.id" :value="td.id">{{ td.label }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <AppButton variant="ghost" type="button" @click="step = 1">← Back</AppButton>
            <AppButton type="button" :disabled="!form.studentIds!.length" @click="step = 3">Next →</AppButton>
          </div>
        </template>
      </AppCard>

      <!-- Step 3: Options & Preview -->
      <AppCard v-if="step === 3" title="Step 3 — Roll, Fees & Preview">
        <div class="form-grid">
          <label>Roll Assignment Strategy*
            <select v-model="form.rollStrategy" class="app-input__control" @change="generatePreview">
              <option value="merit">Merit-based (last exam results)</option>
              <option value="manual">Manual (admin enters rolls)</option>
            </select>
          </label>
          <label>Fee Handling*
            <select v-model="form.feeHandling" class="app-input__control" @change="onFeeHandlingChange">
              <option value="new_structure">Apply new class fee structure</option>
              <option value="carry_forward">Carry forward current balance (total/paid/due)</option>
            </select>
          </label>
          <label>Promotion Date*
            <input v-model="form.promotionDate" type="date" class="app-input__control" />
          </label>
        </div>

        <div class="form-grid">
          <label>Notes (optional)
            <textarea v-model="form.notes" rows="3" class="app-input__control" placeholder="e.g. Annual promotion 2026"></textarea>
          </label>
        </div>

        <!-- Manual roll input (only when manual strategy selected) -->
        <div v-if="form.rollStrategy === 'manual'" class="manual-roll-input">
          <h4>Enter Roll Numbers</h4>
          <p class="muted">Set the roll number for each student in the target class.</p>
          <div class="table-scroll">
            <table class="table">
              <thead>
                <tr><th>Name</th><th>From Roll</th><th>Target Roll *</th></tr>
              </thead>
              <tbody>
                <tr v-for="s in manualRollStudents" :key="s.id">
                  <td>{{ s.name }}</td>
                  <td>{{ s.roll ?? '—' }}</td>
                  <td>
                    <input type="number" v-model.number="manualRolls[s.id]" min="1" class="app-input__control" style="width: 100px;" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Fee breakdown (only for new_structure mode) -->
        <div v-if="form.feeHandling === 'new_structure' && toFeeCatalog.length" class="fee-breakdown">
          <h4>Fee Breakdown <span class="muted">(click card to select/deselect, adjust amounts if needed)</span></h4>
          <div class="fee-cards-grid">
            <div
              v-for="fee in toFeeCatalog"
              :key="fee.id"
              class="fee-card"
              :class="{ 'fee-card--selected': selectedFeeIds.includes(fee.id) }"
              @click="toggleFee(fee.id)"
            >
              <div class="fee-card__header">
                <span class="fee-name">{{ fee.name }}</span>
                <span v-if="fee.cycleDays > 0" class="fee-cycle">{{ fee.cycleDays }} days</span>
              </div>
              <div class="fee-card__amount">
                <input
                  type="number"
                  :value="feeOverrides[fee.id] !== undefined ? feeOverrides[fee.id] : fee.amount"
                  @input="updateFeeOverride(fee.id, $event)"
                  @click.stop
                  min="0"
                  step="1"
                  class="app-input__control"
                  style="width: 100px;"
                />
                <span class="currency">Tk</span>
              </div>
            </div>
          </div>
          <div class="fee-total-row">
            <strong>Selected Total: Tk {{ selectedFeeTotal }}</strong>
          </div>
        </div>

        <!-- Preview table -->
        <h4>Preview (first 20)</h4>
        <div v-if="previewLoading" class="sk-stack">
          <AppSkeleton variant="table" :rows="5" :cols="7" />
        </div>
        <div v-else-if="preview.length === 0" class="muted">No preview available — check student selection.</div>
        <template v-else>
          <div class="table-scroll">
            <table class="table">
              <thead>
                <tr><th>Name</th><th>From Roll</th><th>To Roll</th><th>To Section</th><th>To Dept</th><th>Fee Items</th><th>Fee Total</th></tr>
              </thead>
              <tbody>
                <tr v-for="p in preview" :key="p.studentId">
                  <td>{{ p.name }}</td>
                  <td>{{ p.fromRoll ?? '—' }}</td>
                  <td><strong>{{ p.toRoll }}</strong></td>
                  <td>{{ p.toSection ?? '—' }}</td>
                  <td>{{ p.toDepartment ?? '—' }}</td>
                  <td class="fee-items-cell">
                    <span v-for="item in p.feeItems" :key="item.id" class="fee-tag">{{ item.name }}: Tk {{ item.amount }}</span>
                    <span v-if="!p.feeItems.length" class="muted">—</span>
                  </td>
                  <td><strong>Tk {{ p.feeTotal }}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <div class="form-actions">
          <AppButton variant="ghost" type="button" @click="step = 2">← Back</AppButton>
          <AppButton type="button" :disabled="!validateStep3()" @click="step = 4">Next →</AppButton>
        </div>
      </AppCard>

      <!-- Step 4: Confirm & Run -->
      <AppCard v-if="step === 4" title="Step 4 — Confirm & Run">
        <div class="confirm-summary">
          <h4>Ready to promote</h4>
          <ul>
            <li><strong>{{ form.studentIds.length }}</strong> student(s)</li>
            <li>From: <strong>{{ fromClassLabel }}</strong></li>
            <li>To: <strong>{{ toClassLabel }}</strong></li>
            <li>Roll: <strong>{{ rollStrategyLabel }}</strong></li>
            <li>Fees: <strong>{{ feeHandlingLabel }}</strong></li>
            <li>Date: <strong>{{ form.promotionDate }}</strong></li>
          </ul>
          <p class="muted">This will update student records, reassign subjects, and create promotion history. This action cannot be undone.</p>
        </div>
        <div class="form-actions">
          <AppButton variant="ghost" type="button" @click="step = 3">← Back</AppButton>
          <AppButton type="button" :loading="promoting" @click="runPromotion">Promote Now</AppButton>
        </div>
      </AppCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import { useClasses, useBulkPromoteStudents } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { useSchoolStore } from '@/stores/school'
import { studentService, academicService, paymentService } from '@/services'
import type { StudentPromotionInput, StudentPromotionItem, StudentPromotionResponse, SchoolClass } from '@/types/models'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const school = useSchoolStore()

// ---- Step state ----
const step = ref(1)
function goBack(): void { router.push('/admin/students') }

// Handle query params for single student promotion
const queryStudentId = computed(() => route.query.studentId as string | undefined)
const queryClassId = computed(() => route.query.classId as string | undefined)

// ---- Form ----
const form = reactive<StudentPromotionInput>({
  fromUnitId: '',
  toUnitId: '',
  sectionMap: {},
  departmentMap: {},
  studentIds: [],
  rollStrategy: 'merit',
  feeHandling: 'new_structure',
  promotionDate: new Date().toISOString().slice(0, 10),
  notes: '',
})

const errors = reactive<Record<string, string>>({})

// Fee amount overrides (for manual adjustment in new_structure mode)
const feeOverrides = reactive<Record<string, number>>({})

// Manual roll input storage (for manual strategy)
const manualRolls = reactive<Record<string, number>>({})

// Students available for manual roll entry
const manualRollStudents = computed(() => {
  if (!form.studentIds.length) return []
  return fromStudents.value.filter(s => form.studentIds.includes(s.id))
})

// ---- Class data ----
const { data: classData, isLoading: classesLoading } = useClasses()
const classes = computed<SchoolClass[]>(() => classData.value?.data ?? [])

const fromClass = computed(() => classes.value.find(c => c.id === form.fromUnitId))
const toClass = computed(() => classes.value.find(c => c.id === form.toUnitId))

const fromClassLabel = computed(() => fromClass.value?.label ?? '')
const toClassLabel = computed(() => toClass.value?.label ?? '')

// From class students
const fromStudents = ref<any[]>([])
const fromStudentsLoading = ref(false)
const fromStudentsCount = ref<number | undefined>()
const fromSections = ref<any[]>([])
const fromDepartments = ref<any[]>([])

// To class sections/depts
const toSections = ref<any[]>([])
const toDepartments = ref<any[]>([])
const toClassFeeInfo = ref('')

// Preview
type PreviewItem = StudentPromotionItem & { feeTotal: number; feeItems: any[] }
const preview = ref<PreviewItem[]>([])
const previewLoading = ref(false)

// Fee catalog & selection
const toFeeCatalog = ref<any[]>([])
const selectedFeeIds = ref<string[]>([])

const selectAll = ref(false)
const filteredFromStudents = computed(() => fromStudents.value)

const isSingleStudent = computed(() => form.studentIds.length === 1 && !!queryStudentId.value)
const singleStudent = computed(() => fromStudents.value.find(s => s.id === queryStudentId.value) ?? filteredFromStudents.value[0])

// Current section/dept labels (looked up from loaded sections/departments)
const currentSectionLabel = computed(() => {
  if (!singleStudent.value?.sectionId) return '—'
  return fromSections.value.find(s => s.id === singleStudent.value.sectionId)?.label ?? '—'
})
const currentDepartmentLabel = computed(() => {
  if (!singleStudent.value?.departmentId) return '—'
  return fromDepartments.value.find(d => d.id === singleStudent.value.departmentId)?.label ?? '—'
})

// Section/Department mapping v-model wrappers that pre-select matching target by label
const sectionMapValue = computed({
  get() {
    const s = singleStudent.value
    if (!s?.sectionId) return ''
    // Try to find target section with same label
    const fromSec = fromSections.value.find(x => x.id === s.sectionId)
    if (fromSec) {
      const match = toSections.value.find(ts => ts.label === fromSec.label)
      if (match) return match.id
    }
    // Fallback: first target section
    return toSections.value[0]?.id ?? ''
  },
  set(val) {
    if (singleStudent.value?.sectionId) {
      form.sectionMap[singleStudent.value.sectionId] = val
    }
  },
})

const departmentMapValue = computed({
  get() {
    const s = singleStudent.value
    if (!s?.departmentId) return ''
    // Try to find target department with same label
    const fromDept = fromDepartments.value.find(x => x.id === s.departmentId)
    if (fromDept) {
      const match = toDepartments.value.find(td => td.label === fromDept.label)
      if (match) return match.id
    }
    // Fallback: first target department
    return toDepartments.value[0]?.id ?? ''
  },
  set(val) {
    if (singleStudent.value?.departmentId) {
      form.departmentMap[singleStudent.value.departmentId] = val
    }
  },
})

// Dynamic step 2 title: only show Section/Department if source class has them
const step2Title = computed(() => {
  const parts = ['Students']
  if (fromSections.value.length > 0) parts.push('Section')
  if (fromDepartments.value.length > 0) parts.push('Department')
  return `Step 2 — ${parts.join(' & ')} mapping`
})

const promoting = ref(false)

// Watch rollStrategy to initialize manual rolls
watch(() => form.rollStrategy, (newVal) => {
  if (newVal === 'manual') {
    // Initialize manual rolls with current roll or sequential
    const students = manualRollStudents.value
    for (const s of students) {
      if (!(s.id in manualRolls)) {
        manualRolls[s.id] = typeof s.roll === 'number' ? s.roll : 0
      }
    }
  }
}, { immediate: false })

// ---- Initialize from query params (single student promotion) ----
onMounted(async () => {
  if (queryStudentId.value && queryClassId.value) {
    form.fromUnitId = queryClassId.value
    form.studentIds = [queryStudentId.value]
    // Load students but stay on Step 1 (pre-filled, editable)
    await loadFromClassStudents()
    // step stays at 1 — user can review/change before proceeding
  }
})

// ---- Loaders ----
async function loadFromClassStudents(): Promise<void> {
  if (!form.fromUnitId) return
  
  const isSingleStudent = !!queryStudentId.value
  const targetStudentId = queryStudentId.value
  
  form.studentIds = []
  selectAll.value = false
  fromStudents.value = []
  fromStudentsLoading.value = true
  try {
    const res = await studentService.list({ classId: form.fromUnitId, perPage: 5000 })
    let allStudents = res.data?.items ?? []
    
    // If single student promotion, filter to only that student
    if (isSingleStudent && targetStudentId) {
      allStudents = allStudents.filter(s => s.id === targetStudentId)
    }
    
    fromStudents.value = allStudents
    fromStudentsCount.value = fromStudents.value.length
    
    // Select the student(s)
    form.studentIds = fromStudents.value.map(s => s.id)
    selectAll.value = fromStudents.value.length > 0
    
    // Load sections/depts
    await loadFromClassMeta()
    // Load to class meta
    await loadToClassDetails()
    // Generate preview
    await generatePreview()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load students'
  } finally {
    fromStudentsLoading.value = false
  }
}

async function loadFromClassMeta(): Promise<void> {
  if (!form.fromUnitId) return
  try {
    const [secRes, deptRes] = await Promise.all([
      academicService.sections(form.fromUnitId),
      academicService.departments(form.fromUnitId),
    ])
    fromSections.value = secRes.data ?? []
    fromDepartments.value = deptRes.data ?? []
  } catch {}
}

async function loadToClassDetails(): Promise<void> {
  if (!form.toUnitId) return
  try {
    const [secRes, deptRes, feeRes] = await Promise.all([
      academicService.sections(form.toUnitId),
      academicService.departments(form.toUnitId),
      paymentService.feeCatalog(form.toUnitId, undefined, undefined, true),
    ])
    toSections.value = secRes.data ?? []
    toDepartments.value = deptRes.data ?? []
    toFeeCatalog.value = feeRes.data ?? []
    // Auto-select all fee items by default
    selectedFeeIds.value = toFeeCatalog.value.map(f => f.id)
    const total = toFeeCatalog.value.reduce((sum: number, f: any) => sum + (f.amount || 0), 0)
    toClassFeeInfo.value = total > 0 ? `Fee structure total: Tk ${total.toLocaleString()}` : 'No fee structure defined'
    await generatePreview()
  } catch {}
}

async function generatePreview(): Promise<void> {
  if (!form.fromUnitId || !form.toUnitId || !form.studentIds.length) {
    preview.value = []
    return
  }
  previewLoading.value = true
  try {
    const selectedStudents = fromStudents.value.filter(s => form.studentIds.includes(s.id))
    const secMap = form.sectionMap
    const deptMap = form.departmentMap

    // Compute max roll in target class
    const targetRes = await studentService.list({ classId: form.toUnitId, perPage: 5000 })
    const targetStudents = targetRes.data?.items ?? []
    let maxRoll = 0
    for (const ts of targetStudents) {
      const r = typeof ts.roll === 'number' ? ts.roll : parseInt(String(ts.roll ?? '0'), 10)
      if (r > maxRoll) maxRoll = r
    }

    // Calculate fee total based on selected fee items (for new_structure mode)
    const selectedFeeItems = toFeeCatalog.value.filter(f => selectedFeeIds.value.includes(f.id))
    const feeTotal = selectedFeeItems.reduce((sum: number, f: any) => sum + (f.amount || 0), 0)

    const previewItems: Array<StudentPromotionItem & { feeTotal: number; feeItems: typeof selectedFeeItems }> = []
    for (const s of selectedStudents) {
      const fromSecId = s.sectionId
      const toSecId = secMap[fromSecId] || (toSections.value[0]?.id || null)
      const toSec = toSections.value.find(x => x.id === toSecId)
      const fromDeptId = s.departmentId
      const toDeptId = deptMap[fromDeptId] || null
      const toDept = toDepartments.value.find(x => x.id === toDeptId)

      let toRoll: number
      if (form.rollStrategy === 'merit') {
        // Preview merit rolls - use the precomputed merit logic
        // We need to simulate the merit ranking
        // For preview, just show sequential from maxRoll for simplicity
        maxRoll += 1
        toRoll = maxRoll
      } else if (form.rollStrategy === 'manual') {
        // For manual, show the entered roll or fallback
        const manualRoll = manualRolls[s.id]
        if (manualRoll && manualRoll > 0) {
          toRoll = manualRoll
        } else {
          maxRoll += 1
          toRoll = maxRoll
        }
      } else {
        // fallback to auto
        maxRoll += 1
        toRoll = maxRoll
      }

      // Calculate fee items with overrides
      let studentFeeItems = selectedFeeItems
      let studentFeeTotal = 0
      if (form.feeHandling === 'new_structure') {
        studentFeeItems = selectedFeeItems.map(item => {
          const override = feeOverrides[item.id]
          return {
            ...item,
            amount: override !== undefined ? override : item.amount,
          }
        })
        studentFeeTotal = studentFeeItems.reduce((sum, item) => sum + (item.amount || 0), 0)
      } else {
        // carry_forward
        studentFeeTotal = s.totalAmount || 0
        studentFeeItems = []
      }

      previewItems.push({
        studentId: s.id,
        name: s.name,
        fromRoll: s.roll ?? null,
        toRoll,
        toSection: toSec?.label ?? null,
        toDepartment: toDept?.label ?? null,
        feeTotal: studentFeeTotal,
        feeItems: studentFeeItems,
      })
    }
    preview.value = previewItems.slice(0, 20)
  } catch (e) {
    console.error('Preview error', e)
    preview.value = []
  } finally {
    previewLoading.value = false
  }
}

function toggleAll(): void {
  if (selectAll.value) {
    form.studentIds = filteredFromStudents.value.map(s => s.id)
  } else {
    form.studentIds = []
  }
}

function onFeeHandlingChange(): void {
  generatePreview()
}

function toggleFee(feeId: string): void {
  const idx = selectedFeeIds.value.indexOf(feeId)
  if (idx === -1) {
    selectedFeeIds.value.push(feeId)
  } else {
    selectedFeeIds.value.splice(idx, 1)
    // Clear override when unselected
    delete feeOverrides[feeId]
  }
  generatePreview()
}

function updateFeeOverride(feeId: string, event: Event): void {
  const input = event.target as HTMLInputElement
  const value = input.value.trim()
  if (value === '') {
    delete feeOverrides[feeId]
  } else {
    const num = Number(value)
    if (!isNaN(num) && num >= 0) {
      feeOverrides[feeId] = num
    }
  }
  generatePreview()
}

function validateStep3(): boolean {
  if (!form.promotionDate) return false
  return true
}

const rollStrategyLabel = computed(() => {
  if (form.rollStrategy === 'merit') return 'Merit-based (last exam results)'
  return 'Manual (admin enters rolls)'
})

const feeHandlingLabel = computed(() => {
  if (form.feeHandling === 'new_structure') return 'New class fee structure'
  return 'Carry forward balance'
})

const selectedFeeTotal = computed(() => {
  return toFeeCatalog.value
    .filter(f => selectedFeeIds.value.includes(f.id))
    .reduce((sum: number, f: any) => {
      const override = feeOverrides[f.id]
      return sum + (override !== undefined ? override : (f.amount || 0))
    }, 0)
})

// ---- Mutation ----
const { mutateAsync: bulkPromote, isPending } = useBulkPromoteStudents()
watch(isPending, v => { promoting.value = v })

async function runPromotion(): Promise<void> {
  try {
    const payload: any = {
      ...form,
      selectedFeeIds: form.feeHandling === 'new_structure' ? selectedFeeIds.value : undefined,
    }
    // Include manual rolls if manual strategy
    if (form.rollStrategy === 'manual') {
      payload.manualRolls = manualRolls
    }
    // Include fee overrides if new_structure mode
    if (form.feeHandling === 'new_structure') {
      payload.feeOverrides = feeOverrides
    }
    const res = await bulkPromote(payload)
    toast.success(res.message)
    router.push('/admin/students')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Promotion failed')
  }
}

const error = ref('')
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
.page__hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.field-error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

/* Wizard steps */
.wizard-steps {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--color-surface-alt);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.wizard-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  position: relative;
  color: var(--color-text-muted);
}
.wizard-step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 14px;
  right: -50%;
  width: 100%;
  height: 2px;
  background: var(--color-border);
  z-index: 0;
}
.wizard-step.done::after {
  background: var(--color-primary);
}
.wizard-step__num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-border);
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
  z-index: 1;
  transition: all var(--transition-fast);
}
.wizard-step.active .wizard-step__num {
  background: var(--color-primary);
  color: var(--color-primary-contrast);
}
.wizard-step.done .wizard-step__num {
  background: var(--color-success);
  color: white;
}
.wizard-step__label {
  font-size: var(--font-size-xs);
  text-align: center;
  white-space: nowrap;
}
.wizard-step.active .wizard-step__label {
  color: var(--color-text);
  font-weight: var(--font-weight-medium);
}

/* Form */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
.form-grid label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

/* Table */
.table-scroll {
  overflow-x: auto;
  margin: var(--spacing-md) 0;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.table th, .table td {
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}
.table th {
  background: var(--color-surface-alt);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}

/* Mapping */
.mapping-section {
  margin: var(--spacing-lg) 0;
  padding: var(--spacing-md);
  background: var(--color-surface-alt);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.mapping-section h4 {
  margin: 0 0 var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.mapping-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}
.mapping-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 280px;
  flex: 1;
}
.mapping-label {
  flex-shrink: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  min-width: 140px;
}
.mapping-row select {
  flex: 1;
}

/* Confirm */
.confirm-summary {
  padding: var(--spacing-md);
  background: var(--color-success-light);
  border: 1px solid var(--color-success);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}
.confirm-summary h4 {
  margin: 0 0 var(--spacing-sm);
  color: var(--color-success);
}
.confirm-summary ul {
  margin: 0;
  padding-left: var(--spacing-lg);
}
.confirm-summary li {
  margin: var(--spacing-xs) 0;
}

/* Card title */
:deep(.app-card__title) {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

/* Single student promotion — clean, focused card */
.single-student-promo {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.student-info-card {
  padding: var(--spacing-md);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.student-info-card h4 {
  margin: 0 0 var(--spacing-sm);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.student-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.student-meta strong {
  color: var(--color-text);
}

/* Fee breakdown */
.fee-breakdown {
  margin: var(--spacing-md) 0;
  padding: var(--spacing-md);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.fee-breakdown h4 {
  margin: 0 0 var(--spacing-sm);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}
.fee-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}
.fee-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}
.fee-item:hover {
  background: var(--color-surface-alt);
}
.fee-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
}
.fee-name {
  flex: 1;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.fee-amount {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}
.fee-cycle {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  background: var(--color-info-light);
  padding: 2px var(--spacing-xs);
  border-radius: var(--radius-full);
}
.fee-total-row {
  text-align: right;
  font-size: var(--font-size-md);
}
.fee-tag {
  display: inline-block;
  padding: 2px var(--spacing-xs);
  margin: 2px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  border-radius: var(--radius-sm);
}
.fee-items-cell {
  max-width: 250px;
}

/* Card title */
:deep(.app-card__title) {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

/* Single student promotion — clean, focused card */
.single-student-promo {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.student-info-card {
  padding: var(--spacing-md);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.student-info-card h4 {
  margin: 0 0 var(--spacing-sm);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.student-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.student-meta strong {
  color: var(--color-text);
}

/* Fee cards grid */
.fee-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--spacing-md);
  margin: var(--spacing-md) 0;
}

/* Fee card — full clickable card for selection */
.fee-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
}
.fee-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
  background: var(--color-primary-light);
}
.fee-card--selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}
.fee-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-sm);
}
.fee-card__header .fee-name {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
}
.fee-card__header .fee-cycle {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  background: var(--color-info-light);
  padding: 2px var(--spacing-xs);
  border-radius: var(--radius-full);
}
.fee-card__amount {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-xs);
}
.fee-card__amount .app-input__control {
  text-align: right;
}
.fee-card__amount .currency {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-weight: var(--font-weight-medium);
}

.fee-total-row {
  text-align: right;
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  font-size: var(--font-size-md);
}
</style>