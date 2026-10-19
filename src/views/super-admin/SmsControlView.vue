<template>
  <div class="page">
    <h1 class="page__title">SMS Control</h1>
    <p class="muted">
      Every page's SMS format is controlled here — result, attendance, payment, receipt.
      Admins can only use templates; add/edit/remove is super-admin only.
    </p>

    <div class="grid">
      <AppCard title="Templates">
        <FilterPanel>
          <select v-model="typeFilter" class="app-input__control">
            <option value="">All types</option>
            <option value="result">Result</option>
            <option value="attendance">Attendance</option>
            <option value="payment">Payment</option>
            <option value="receipt">Receipt</option>
            <option value="others">Others</option>
          </select>
          <input v-model="search" class="app-input__control" placeholder="Search name / body…" />
        </FilterPanel>
        <AppSkeleton v-if="tplLoading" variant="list" :rows="3" />
        <ul v-else class="list">
          <li v-for="t in filtered" :key="t.id" class="list__row">
            <div>
              <strong>{{ t.name }}</strong>
              <span class="muted"> · {{ t.type }}</span>
              <p class="muted">{{ t.body }}</p>
              <p v-if="(t.variables ?? []).length > 0" class="vars">
                <code v-for="v in t.variables" :key="v" v-text="wrapVar(v)"></code>
              </p>
            </div>
            <span class="row-btns">
              <button class="link-btn" type="button" @click="startEdit(t)">Edit</button>
              <button class="link-danger" type="button" @click="askRemove(t)">Remove</button>
            </span>
          </li>
          <li v-if="filtered.length === 0" class="muted">No templates found.</li>
        </ul>
      </AppCard>

      <div class="side">
        <AppCard :title="editing ? `Edit: ${editing.name}` : 'New Template'">
          <form class="form" @submit.prevent="editing ? saveEdit() : addTemplate()">
            <label>Name
              <input v-model="form.name" class="app-input__control" placeholder="Result Publish" required />
            </label>
            <label>Type (which flow it belongs to)
              <select v-model="form.type" class="app-input__control">
                <option value="others">Others</option>
                <option value="result">Result (exam publish / merit)</option>
                <option value="attendance">Attendance</option>
                <option value="payment">Payment (due reminder)</option>
                <option value="receipt">Receipt (fee collect)</option>
              </select>
            </label>
            <label>Body — copy variables from the reference list below
              <textarea v-model="form.body" class="app-input__control" rows="4" required />
            </label>
            <div v-if="form.body.trim()" class="preview">
              <span class="preview__label">Preview</span>
              <p>{{ renderPreview(form.body) }}</p>
              <span class="muted">{{ renderPreview(form.body).length }} chars</span>
            </div>
            <div class="row-btns">
              <AppButton type="submit" :loading="saving">{{ editing ? 'Save' : 'Create' }}</AppButton>
              <AppButton v-if="editing" variant="ghost" type="button" @click="cancelEdit">Cancel</AppButton>
            </div>
          </form>
        </AppCard>

        <AppCard title="Variable Reference">
          <p class="muted">Auto-filled — never typed by hand. Whatever page sends, the backend fills them from records.</p>
          <div v-for="g in varGroups" :key="g.title" class="var-group">
            <h4>{{ g.title }}</h4>
            <ul>
              <li v-for="v in g.vars" :key="v.key">
                <code v-text="wrapVar(v.key)"></code>
                <span class="muted"> — {{ v.desc }}</span>
              </li>
            </ul>
          </div>
        </AppCard>
      </div>
    </div>

    <AppConfirmDialog
      :open="confirm.open"
      :message="confirm.message"
      :busy="deleting"
      @cancel="confirm.open = false"
      @confirm="doRemove"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import {
  useCreateSmsTemplate,
  useDeleteSmsTemplate,
  useSmsTemplates,
  useUpdateSmsTemplate,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import type { SmsTemplate } from '@/types/models'

const toast = useToast()
function wrapVar(v: string): string {
  return `{{${v}}}`
}

const { data: tplData, isLoading: tplLoading } = useSmsTemplates()
const templates = computed(() => tplData.value?.data ?? [])
const typeFilter = ref('')
const search = ref('')
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return templates.value.filter(
    (t) =>
      (!typeFilter.value || t.type === typeFilter.value) &&
      (!q || t.name.toLowerCase().includes(q) || t.body.toLowerCase().includes(q)),
  )
})

const form = reactive({ name: '', type: 'others', body: '' })
const editing = ref<SmsTemplate | null>(null)
const { mutateAsync: createTpl, isPending: creating } = useCreateSmsTemplate()
const { mutateAsync: updateTpl, isPending: updating } = useUpdateSmsTemplate()
const saving = computed(() => creating.value || updating.value)

function startEdit(t: SmsTemplate): void {
  editing.value = t
  form.name = t.name
  form.type = t.type
  form.body = t.body
}
function cancelEdit(): void {
  editing.value = null
  form.name = ''
  form.type = 'others'
  form.body = ''
}
async function addTemplate(): Promise<void> {
  try {
    await createTpl({ name: form.name.trim(), type: form.type, body: form.body.trim() })
    toast.success('Template created')
    cancelEdit()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}
async function saveEdit(): Promise<void> {
  if (!editing.value) return
  try {
    await updateTpl({
      id: editing.value.id,
      input: { name: form.name.trim(), type: form.type, body: form.body.trim() },
    })
    toast.success('Template updated')
    cancelEdit()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}

const confirm = ref({ open: false, id: '', message: '' })
const { mutateAsync: deleteTpl, isPending: deleting } = useDeleteSmsTemplate()
function askRemove(t: SmsTemplate): void {
  confirm.value = { open: true, id: t.id, message: `Remove the "${t.name}" template? Send history is kept.` }
}
async function doRemove(): Promise<void> {
  try {
    await deleteTpl(confirm.value.id)
    toast.success('Template removed')
    confirm.value.open = false
    if (editing.value?.id === confirm.value.id) cancelEdit()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}

const varGroups = [
  {
    title: 'Student (proti recipient er record theke)',
    vars: [
      { key: 'studentName', desc: "student's name" },
      { key: 'roll', desc: 'roll number' },
      { key: 'className', desc: 'class label' },
      { key: 'dueAmount', desc: 'total due (TK)' },
      { key: 'absentDate', desc: 'last absent date' },
      { key: 'feeName', desc: 'fee head of latest receipt' },
      { key: 'paidAmount', desc: 'latest receipt amount' },
    ],
  },
  {
    title: 'Teacher',
    vars: [{ key: 'teacherName', desc: "teacher's name" }],
  },
  {
    title: 'Notice (from notice publish)',
    vars: [
      { key: 'noticeTitle', desc: 'notice title' },
      { key: 'eventDate', desc: 'event date' },
      { key: 'noticeDetail', desc: 'short description' },
    ],
  },
  {
    title: 'Attendance punch (card tap — toggles on the System page)',
    vars: [
      { key: 'entryTime', desc: 'entry punch time (Entry Alert)' },
      { key: 'exitTime', desc: 'exit punch time (Exit Alert)' },
      { key: 'lateMinutes', desc: 'minutes late (Late Alert)' },
    ],
  },
  {
    title: 'Exam + Result (from exam mode / publish)',
    vars: [
      { key: 'examName', desc: "exam's name" },
      { key: 'examDate', desc: 'exam date' },
      { key: 'rank', desc: 'merit rank' },
      { key: 'marks', desc: 'total obtained' },
      { key: 'total', desc: 'marks alias' },
      { key: 'fullMarks', desc: 'exam full marks' },
      { key: 'grade', desc: 'grade (A+, F...)' },
      { key: 'percentage', desc: 'percent' },
      { key: 'resultStatus', desc: 'Pass / Fail' },
      { key: 'resultLine', desc: 'Total x/y, Grade ...' },
      { key: 'resultHeadline', desc: 'subject-wise + total line' },
      { key: 'resultNote', desc: 'Failed in: ...' },
      { key: 'passedSubjects', desc: 'passed subject list' },
      { key: 'failedSubjects', desc: 'failed subject list' },
      { key: 'subjects', desc: 'all subject marks line' },
    ],
  },
]

const sample: Record<string, string> = {
  studentName: 'Rahim',
  roll: '5',
  className: 'Class 10',
  dueAmount: '1200',
  absentDate: '2026-10-13',
  feeName: 'Monthly Tuition',
  paidAmount: '500',
  teacherName: 'Karim Sir',
  examName: 'Half Exam',
  examDate: '2026-10-14',
  rank: '4',
  marks: '935',
  total: '935',
  fullMarks: '1400',
  grade: 'A-',
  percentage: '66.79',
  resultStatus: 'Pass',
  resultLine: 'Total 935/1400, Grade A- (66.79%)',
  resultHeadline: 'Total 935/1400, Grade A- (66.79%).',
  resultNote: '',
  passedSubjects: 'Bangla, English',
  failedSubjects: 'ICT',
  subjects: 'Bangla 85/100, English 80/100',
}
function renderPreview(body: string): string {
  return body.replace(/{{\s*(\w+)\s*}}/g, (_m, key: string) => sample[key] ?? `[${key}]`)
}
</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: var(--spacing-md);
  align-items: start;
  margin-top: var(--spacing-md);
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
.side {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}
.list__row {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
  min-width: 0;
}
.list__row > div:first-child {
  min-width: 0;
  overflow-wrap: anywhere;
}
.row-btns {
  display: inline-flex;
  gap: var(--spacing-sm);
  align-items: center;
  flex-shrink: 0;
}
.link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.link-danger {
  background: none;
  border: none;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.vars {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  align-items: center;
}
.vars code,
.var-group code {
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0 6px;
  font-size: var(--font-size-xs);
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
.preview {
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-surface-alt);
  font-size: var(--font-size-sm);
}
.preview p {
  margin: var(--spacing-xs) 0;
}
.preview__label {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}
.var-group h4 {
  margin: var(--spacing-sm) 0 var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.var-group ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-xs);
}
</style>
