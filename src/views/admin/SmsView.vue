<template>
  <div class="page">
    <h1 class="page__title">SMS & Templates</h1>

    <div class="grid">
      <AppCard title="Send SMS">
        <form class="form" @submit.prevent="send">
          <label>Template
            <select v-model="sendForm.templateId" class="app-input__control">
              <option :value="null">Custom (no template)</option>
              <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </label>
          <label>Audience
            <select v-model="sendForm.audience" class="app-input__control">
              <option value="students">Students/Guardians</option>
              <option value="teachers">Teachers</option>
              <option value="all">Everyone</option>
            </select>
          </label>
          <label v-if="sendForm.audience === 'students'">Class (optional)
            <select v-model="sendForm.classId" class="app-input__control">
              <option value="">All classes</option>
              <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
          </label>
          <p v-if="sendError" class="error">{{ sendError }}</p>
          <AppButton type="submit" :disabled="sending">{{ sending ? 'Sending…' : 'Send' }}</AppButton>
        </form>
      </AppCard>

      <AppCard title="Templates">
        <ul class="list">
          <li v-for="t in templates" :key="t.id" class="list__row">
            <div>
              <strong>{{ t.name }}</strong>
              <span class="muted"> · {{ t.type }}</span>
              <p class="muted">{{ t.body }}</p>
            </div>
            <button class="link-danger" type="button" @click="removeTemplate(t.id)">Remove</button>
          </li>
        </ul>
        <form class="inline-form" @submit.prevent="addTemplate">
          <input v-model="tplName" class="app-input__control" placeholder="Template name" required />
          <input v-model="tplBody" class="app-input__control" placeholder="Message body with {name}" required />
          <AppButton type="submit" :disabled="creatingTpl">Add</AppButton>
        </form>
      </AppCard>
    </div>

    <AppCard title="Send History">
      <table class="table">
        <thead>
          <tr><th>Template</th><th>Audience</th><th>Count</th><th>Sent at</th></tr>
        </thead>
        <tbody>
          <tr v-for="l in logs" :key="l.id">
            <td>{{ l.templateName }}</td>
            <td>{{ l.audience }}</td>
            <td>{{ l.count }}</td>
            <td>{{ l.sentAt.slice(0, 16).replace('T', ' ') }}</td>
          </tr>
          <tr v-if="logs.length === 0">
            <td colspan="4" class="muted">Nothing sent yet.</td>
          </tr>
        </tbody>
      </table>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import {
  useClasses,
  useCreateSmsTemplate,
  useDeleteSmsTemplate,
  useSendSms,
  useSmsLogs,
  useSmsTemplates,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const { data: tplData } = useSmsTemplates()
const templates = computed(() => tplData.value?.data ?? [])
const { data: logData } = useSmsLogs()
const logs = computed(() => logData.value?.data ?? [])
const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])

const sendForm = reactive({ templateId: null as string | null, audience: 'students', classId: '' })
const sendError = ref('')
const { mutateAsync: sendSms, isPending: sending } = useSendSms()
async function send(): Promise<void> {
  sendError.value = ''
  try {
    const res = await sendSms({
      templateId: sendForm.templateId,
      audience: sendForm.audience,
      classId: sendForm.classId || undefined,
    })
    toast.success(res.data.sent > 0 ? `${res.data.sent} messages queued` : 'No recipients found')
  } catch (e) {
    sendError.value = e instanceof Error ? e.message : 'Failed'
  }
}

const tplName = ref('')
const tplBody = ref('')
const { mutateAsync: createTpl, isPending: creatingTpl } = useCreateSmsTemplate()
async function addTemplate(): Promise<void> {
  try {
    await createTpl({ name: tplName.value.trim(), type: 'others', body: tplBody.value.trim() })
    tplName.value = ''
    tplBody.value = ''
    toast.success('Template created')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}

const { mutateAsync: deleteTpl } = useDeleteSmsTemplate()
async function removeTemplate(id: string): Promise<void> {
  try {
    await deleteTpl(id)
    toast.success('Template removed')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed')
  }
}
</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-lg);
}
.grid {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: var(--spacing-md);
  align-items: start;
  margin-bottom: var(--spacing-md);
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
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
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--spacing-sm);
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
}
.inline-form {
  display: flex;
  gap: var(--spacing-sm);
}
.inline-form .app-input__control {
  flex: 1;
}
.link-danger {
  background: none;
  border: none;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  flex-shrink: 0;
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
