<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Add Account Entry</h1>
        <p class="muted">Money into or out of the school fund. Fee collection and salary payments post here automatically.</p>
      </div>
      <RouterLink to="/admin/accounts" class="back">← Accounts</RouterLink>
    </div>

    <AppCard title="New Entry">
      <form class="form" @submit.prevent="saveEntry">
        <div class="kind-tabs" role="tablist" aria-label="Entry type">
          <button
            type="button"
            :class="['kind-tab', { 'kind-tab--active': form.kind === 'income' }]"
            @click="setKind('income')"
          >
            Income
          </button>
          <button
            type="button"
            :class="['kind-tab', { 'kind-tab--active': form.kind === 'expense' }]"
            @click="setKind('expense')"
          >
            Expense
          </button>
        </div>

        <label>Head
          <select v-model="form.head" class="app-input__control" required>
            <option value="">Select head…</option>
            <option v-for="h in headOptions" :key="h.id" :value="h.name">{{ h.name }}</option>
            <option value="__custom">Other (type below)…</option>
          </select>
        </label>
        <p v-if="!headsLoading && !headOptions.length" class="muted hint">
          No {{ form.kind }} heads yet.
          <RouterLink to="/admin/accounts">Add a head from Accounts</RouterLink>, or choose “Other”.
        </p>

        <label v-if="form.head === '__custom'">Custom head
          <input v-model="form.customHead" class="app-input__control" placeholder="Enter head name" required />
        </label>

        <label>Amount (৳)
          <input v-model.number="form.amount" type="number" min="0" step="0.01" class="app-input__control" required />
        </label>

        <div class="form__row">
          <label>Date
            <input v-model="form.date" type="date" class="app-input__control" />
          </label>
          <label>Note
            <input v-model="form.note" class="app-input__control" placeholder="Optional note" />
          </label>
        </div>

        <p v-if="formError" class="error">{{ formError }}</p>

        <div class="form-actions">
          <RouterLink to="/admin/accounts">
            <AppButton variant="ghost" type="button">Cancel</AppButton>
          </RouterLink>
          <AppButton type="submit" :loading="saving">Save Account Entry</AppButton>
        </div>
      </form>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import { useCreateLedgerEntry, useLedgerHeads } from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'

type EntryKind = 'income' | 'expense'

const router = useRouter()
const toast = useToast()
const num = (v: unknown): number => Number(v) || 0
const todayStr = (): string => new Date().toISOString().slice(0, 10)

const form = reactive({
  kind: 'expense' as EntryKind,
  head: '',
  customHead: '',
  amount: 0,
  date: todayStr(),
  note: '',
})
const formError = ref('')
const saving = ref(false)

const { data: headData, isLoading: headsLoading } = useLedgerHeads(() => form.kind)
const headOptions = computed(() => headData.value?.data ?? [])
const { mutateAsync: createEntry } = useCreateLedgerEntry()

function setKind(kind: EntryKind): void {
  if (form.kind === kind) return
  form.kind = kind
  form.head = ''
  form.customHead = ''
}

async function saveEntry(): Promise<void> {
  formError.value = ''
  const head = form.head === '__custom' ? form.customHead.trim() : form.head
  if (!head) {
    formError.value = 'Head is required.'
    return
  }
  if (!(num(form.amount) > 0)) {
    formError.value = 'Amount must be greater than 0.'
    return
  }
  saving.value = true
  try {
    await createEntry({
      kind: form.kind,
      head,
      amount: num(form.amount),
      date: form.date || undefined,
      note: form.note.trim() || undefined,
    })
    toast.success(form.kind === 'income' ? 'Income entry saved' : 'Expense entry saved')
    await router.push('/admin/accounts')
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.page {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-lg);
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--spacing-xs);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin: 0;
}
.back {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
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
.form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
}
.hint {
  margin-top: calc(var(--spacing-xs) * -1);
}
.hint a {
  color: var(--color-primary);
}
.kind-tabs {
  display: inline-flex;
  gap: 4px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 4px;
  align-self: flex-start;
}
.kind-tab {
  background: none;
  border: none;
  padding: 6px 14px;
  font: inherit;
  font-size: var(--font-size-sm);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  cursor: pointer;
}
.kind-tab--active {
  background: var(--color-surface);
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
  box-shadow: var(--shadow-sm);
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}
.form-actions a {
  text-decoration: none;
}
@media (max-width: 640px) {
  .form__row {
    grid-template-columns: 1fr;
  }
}
</style>
