<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Add Class</h1>
        <p class="page__hint">Class name → hours → sections → departments. Subjects and fees are added from the class page after saving. It lands at the bottom — drag rows on the Academic Setup table to reorder.</p>
      </div>
      <AppButton variant="ghost" type="button" @click="goBack">← Academic Setup</AppButton>
    </div>

    <form @submit.prevent="saveForm">
      <AppCard title="Class Info">
        <div class="form-grid">
          <label>Class name*<input v-model="form.label" class="app-input__control" placeholder="e.g. Class 8" required /></label>
        </div>
      </AppCard>

      <AppCard title="School hours">
        <div class="hours-row">
          <label>Start<input v-model="form.startTime" type="time" class="app-input__control" /></label>
          <label>End<input v-model="form.endTime" type="time" class="app-input__control" /></label>
        </div>
        <p class="hint">Late cutoff for this class's attendance taps and limit for its class routine periods. Blank = school-wide timings from Settings. (PG/Nursery shifts apatoto ekhane ek time — shift layer pore.)</p>
      </AppCard>

      <AppCard title="Sections">
        <label>Sections <span class="hint">— only what this class needs, comma separated (e.g. A, B or Marigold, Daisy). Empty = add later from the class page.</span><input v-model="form.sections" class="app-input__control" placeholder="optional — e.g. A, B" /></label>
      </AppCard>

      <AppCard title="Departments">
        <label class="check" title="Class 9/10 split into Science, Arts, Commerce…"><input v-model="form.hasDepartments" type="checkbox" /> This class has departments</label>
        <label v-if="form.hasDepartments">Department names <span class="hint">— comma separated (e.g. Science, Arts, Commerce)</span><input v-model="form.departments" class="app-input__control" placeholder="Science, Arts, Commerce" /></label>
      </AppCard>

      <p v-if="formError" class="error">{{ formError }}</p>
      <div class="page-actions">
        <AppButton variant="ghost" type="button" @click="goBack">Cancel</AppButton>
        <AppButton type="submit" :disabled="saving">{{ saving ? 'Creating…' : 'Create Class' }}</AppButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import { useCreateClass } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const toast = useToast()
const { mutateAsync: createClass } = useCreateClass()

const form = reactive({
  label: '',
  startTime: '',
  endTime: '',
  sections: '',
  hasDepartments: false,
  departments: '',
})
const formError = ref('')
const saving = ref(false)

const parseList = (v: string): string[] =>
  v.split(',').map((s) => s.trim()).filter(Boolean)

function goBack(): void {
  router.push('/admin/academics')
}

async function saveForm(): Promise<void> {
  formError.value = ''
  const label = form.label.trim()
  if (!label) {
    formError.value = 'Class name is required.'
    return
  }
  const sections = parseList(form.sections)
  const departments = form.hasDepartments ? parseList(form.departments) : []
  if (form.startTime && form.endTime && form.endTime <= form.startTime) {
    formError.value = 'End time must be after start time.'
    return
  }
  saving.value = true
  try {
    const created = await createClass({
      label,
      hasDepartments: form.hasDepartments || departments.length > 0,
      sections: sections.length ? sections : undefined,
      departments: departments.length ? departments : undefined,
      startTime: form.startTime,
      endTime: form.endTime,
    })
    toast.success('Class created — add subjects and fees from here')
    await router.push(`/admin/academics/${created.data.id}`)
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Failed'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.hours-row {
  display: flex;
  gap: var(--spacing-md);
}
.hours-row .app-input__control {
  width: 140px;
}
</style>
