<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Bulk Import Students</h1>
        <p class="page__hint">
          One student per line: Name, Roll, Gender, Phone, Guardian, Guardian Phone, Status.
          A header first line is skipped. Class/section below apply to every row —
          re-importing the same roll updates that student instead of duplicating.
        </p>
      </div>
      <AppButton variant="ghost" type="button" @click="goBack">← Students</AppButton>
    </div>

    <AppCard>
      <div class="scope">
        <label class="field">Class *
          <select v-model="classId" class="app-input__control">
            <option value="">Choose class…</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
        </label>
        <label v-if="classId" class="field">Section
          <select v-model="sectionId" class="app-input__control">
            <option value="">No section</option>
            <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.label }}</option>
          </select>
        </label>
      </div>
      <label class="paste-label">CSV rows
        <textarea
          v-model="raw"
          rows="8"
          class="app-input__control"
          placeholder="Rahim Uddin, 12, male, 01711000000, Abdul Karim, 01711000001, active"
        />
      </label>
      <p class="muted">{{ parsed.length }} rows ready — {{ badRows }} bad rows will be skipped.</p>
      <table v-if="parsed.length" class="table">
        <thead>
          <tr>
            <th>#</th><th>Name</th><th>Roll</th><th>Gender</th><th>Phone</th>
            <th>Guardian</th><th>Guardian phone</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in parsedPreview" :key="i">
            <td>{{ i + 1 }}</td>
            <td>{{ r.name }}</td>
            <td>{{ r.roll || '—' }}</td>
            <td>{{ r.gender || '—' }}</td>
            <td>{{ r.phone || '—' }}</td>
            <td>{{ r.guardianName || '—' }}</td>
            <td>{{ r.guardianPhone || '—' }}</td>
            <td>{{ r.status || 'active' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="result" class="success">
        {{ result.created }} added, {{ result.updated }} updated, {{ result.errors }} skipped.
      </p>
      <ul v-if="resultErrors.length" class="error-list">
        <li v-for="e in resultErrors" :key="e.row">Row {{ e.row }}: {{ e.message }}</li>
      </ul>
      <p v-if="formError" class="error">{{ formError }}</p>
      <div class="form-actions">
        <AppButton type="button" :disabled="!parsed.length" :loading="sending" @click="send">Import</AppButton>
      </div>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import { useBulkStudents, useClasses, useSections } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import type { StudentBulkRecord } from '@/types/models'

const router = useRouter()
const toast = useToast()
const raw = ref('')
const classId = ref('')
const sectionId = ref('')

const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])
const { data: sectionData } = useSections(() => classId.value || undefined, undefined, true)
const sections = computed(() => sectionData.value?.data ?? [])
watch(classId, () => {
  sectionId.value = ''
})

function isHeader(line: string): boolean {
  return /^name\b/i.test(line) || /\bname\b.*\broll\b/i.test(line)
}

function normGender(value: string): string {
  const t = value.trim().toLowerCase()
  if (t === 'm') return 'male'
  if (t === 'f') return 'female'
  if (t === 'male' || t === 'female') return t
  return ''
}

type Row = Omit<StudentBulkRecord, 'unitId' | 'batchId'>
const dataLines = computed(() =>
  raw.value.split('\n').map((l) => l.trim()).filter(Boolean).filter((l) => !isHeader(l)),
)
const parsed = computed<Row[]>(() => {
  const rows: Row[] = []
  for (const line of dataLines.value) {
    const parts = line.split(',').map((p) => p.trim())
    const name = parts[0] ?? ''
    if (!name) continue
    rows.push({
      name,
      roll: parts[1] || undefined,
      gender: normGender(parts[2] ?? '') || undefined,
      phone: parts[3] || undefined,
      guardianName: parts[4] || undefined,
      guardianPhone: parts[5] || undefined,
      status: (parts[6] ?? '').toLowerCase() || undefined,
    })
  }
  return rows
})
const badRows = computed(() => dataLines.value.length - parsed.value.length)
const parsedPreview = computed(() => parsed.value.slice(0, 20))

const result = ref<{ created: number; updated: number; errors: number } | null>(null)
const resultErrors = ref<{ row: number; message: string }[]>([])
const formError = ref('')
const sending = ref(false)
const { mutateAsync: bulkStudents } = useBulkStudents()

function goBack(): void {
  router.push('/admin/students')
}

async function send(): Promise<void> {
  formError.value = ''
  result.value = null
  resultErrors.value = []
  if (!classId.value) {
    formError.value = 'Choose the class first.'
    return
  }
  sending.value = true
  try {
    const records: StudentBulkRecord[] = parsed.value.map((r) => ({
      ...r,
      unitId: classId.value,
      batchId: sectionId.value || undefined,
    }))
    const res = await bulkStudents(records)
    const created = res.data.created?.length ?? 0
    const updated = res.data.updated?.length ?? 0
    const errors = res.data.errors ?? []
    result.value = { created, updated, errors: errors.length }
    resultErrors.value = errors
    toast.success(res.message || `${created} added, ${updated} updated`)
    if (!errors.length) raw.value = ''
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Import failed'
  } finally {
    sending.value = false
  }
}
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
.scope {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  flex-wrap: wrap;
}
.field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  min-width: 180px;
}
.paste-label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-sm);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.success {
  color: var(--color-success);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.error-list {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin: var(--spacing-sm) 0;
  padding-left: var(--spacing-lg);
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  margin: var(--spacing-sm) 0;
}
.table th,
.table td {
  text-align: left;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--spacing-md);
}
</style>
