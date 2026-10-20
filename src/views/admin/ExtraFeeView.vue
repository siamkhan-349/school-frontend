<template>
  <div class="page">
    <div class="page__head">
      <div>
        <h1 class="page__title">Extra Fee</h1>
        <p class="page__hint">
          Ad-hoc charges for students already admitted — an exam, tour, picnic, or anything outside the
          standard fee setup. Applying creates a due on every active student in the chosen scope; collect
          it from Student Fee.
        </p>
        <p class="page__note">
          Revert removes the dues this fee created, but only before a receipt names it. Delete is for
          drafts and cancelled fees. A collected fee stays as a record.
        </p>
      </div>
      <div class="mode-row">
        <AppButton variant="ghost" type="button" @click="goFeeManagement">Fee Management</AppButton>
        <AppButton type="button" @click="goNew">+ Add Extra Fee</AppButton>
      </div>
    </div>

    <div class="chips">
      <span class="chip">{{ fees.length }} {{ fees.length === 1 ? 'fee' : 'fees' }}</span>
      <span class="chip">{{ appliedCount }} applied</span>
    </div>

    <AppCard>
      <FilterPanel>
        <input v-model="search" class="app-input__control" placeholder="Search fee / class / note…" />
        <select v-model="statusFilter" class="app-input__control">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="applied">Applied</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </FilterPanel>

      <AppSkeleton v-if="isLoading" variant="table" :rows="6" :cols="7" />
      <table v-else class="table">
        <thead>
          <tr>
            <th>Fee</th>
            <th>Scope</th>
            <th>Amount (৳)</th>
            <th>Due date</th>
            <th>Students</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fee in paged" :key="fee.id">
            <td>
              <div class="fee-name">{{ fee.name }}</div>
              <div v-if="fee.notes" class="muted note">{{ fee.notes }}</div>
            </td>
            <td>{{ fee.scope }}</td>
            <td>৳{{ money(fee.amount) }}</td>
            <td>{{ fee.dueFor || '—' }}</td>
            <td>{{ fee.studentCount }}</td>
            <td>
              <span class="badge" :class="statusClass(fee.status)">{{ statusLabel(fee.status) }}</span>
            </td>
            <td class="row-actions">
              <button
                v-if="fee.status !== 'applied'"
                class="link-btn"
                type="button"
                :disabled="busyId === fee.id"
                @click="askApply(fee)"
              >
                Apply
              </button>
              <button
                v-else
                class="link-btn"
                type="button"
                :disabled="busyId === fee.id"
                @click="askApply(fee)"
              >
                Add new students
              </button>
              <button
                v-if="fee.status === 'applied'"
                class="link-btn link-btn--danger"
                type="button"
                :disabled="busyId === fee.id"
                @click="askRevert(fee)"
              >
                Revert
              </button>
              <button
                v-if="fee.status !== 'applied' || fee.studentCount === 0"
                class="link-btn link-btn--danger"
                type="button"
                :disabled="busyId === fee.id"
                @click="askDelete(fee)"
              >
                Delete
              </button>
            </td>
          </tr>
          <tr v-if="paged.length === 0">
            <td colspan="7" class="muted">
              No extra fees yet. Add one for an exam, tour, or other ad-hoc charge.
            </td>
          </tr>
        </tbody>
      </table>

      <AppPagination
        v-model:page="page"
        v-model:per-page="perPage"
        :total="filtered.length"
        :busy="isLoading"
      />
    </AppCard>

    <AppConfirmDialog
      :open="confirm.open"
      :title="confirm.title"
      :message="confirm.message"
      :confirm-text="confirm.confirmText"
      :confirm-variant="confirm.kind === 'apply' ? 'primary' : 'danger'"
      :busy="busy"
      @cancel="closeConfirm"
      @confirm="runConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import {
  useApplyExtraFee,
  useDeleteExtraFee,
  useExtraFees,
  useRevertExtraFee,
} from '@/composables/useQueries'
import { usePagedList } from '@/composables/usePagedList'
import { useToast } from '@/composables/useToast'
import type { ExtraFee, ExtraFeeStatus } from '@/types/models'

const router = useRouter()
const toast = useToast()

const { data, isLoading } = useExtraFees()
const fees = computed(() => data.value?.data ?? [])
const appliedCount = computed(
  () => fees.value.filter((fee) => fee.status === 'applied').length,
)

const search = ref('')
const statusFilter = ref('')
const { page, perPage } = usePagedList(10)
watch([search, statusFilter], () => {
  page.value = 1
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return fees.value.filter((fee) => {
    if (statusFilter.value && fee.status !== statusFilter.value) return false
    if (!q) return true
    return [fee.name, fee.scope, fee.notes].some((value) =>
      value.toLowerCase().includes(q),
    )
  })
})
const paged = computed(() => {
  const start = (page.value - 1) * perPage.value
  return filtered.value.slice(start, start + perPage.value)
})

function money(value: number): string {
  return (Number(value) || 0).toLocaleString()
}
function statusLabel(status: ExtraFeeStatus): string {
  if (status === 'applied') return 'Applied'
  if (status === 'cancelled') return 'Cancelled'
  return 'Draft'
}
function statusClass(status: ExtraFeeStatus): string {
  return `badge--${status}`
}

const { mutateAsync: applyFee } = useApplyExtraFee()
const { mutateAsync: revertFee } = useRevertExtraFee()
const { mutateAsync: deleteFee } = useDeleteExtraFee()
const busy = ref(false)
const busyId = ref('')

interface ConfirmState {
  open: boolean
  kind: 'apply' | 'revert' | 'delete'
  title: string
  message: string
  confirmText: string
  fee: ExtraFee | null
}
const confirm = reactive<ConfirmState>({
  open: false,
  kind: 'apply',
  title: '',
  message: '',
  confirmText: '',
  fee: null,
})

function askApply(fee: ExtraFee): void {
  const again = fee.status === 'applied' ? ' Students who already have it are skipped.' : ''
  confirm.open = true
  confirm.kind = 'apply'
  confirm.title = fee.status === 'applied' ? 'Add new students' : 'Apply extra fee'
  confirm.message = `Apply "${fee.name}" (৳${money(fee.amount)}) to every active student in ${fee.scope}?${again}`
  confirm.confirmText = fee.status === 'applied' ? 'Add students' : 'Apply fee'
  confirm.fee = fee
}
function askRevert(fee: ExtraFee): void {
  confirm.open = true
  confirm.kind = 'revert'
  confirm.title = 'Revert extra fee'
  confirm.message = `Remove the dues "${fee.name}" created for ${fee.studentCount} student(s)? This is blocked if a receipt already mentions this fee.`
  confirm.confirmText = 'Revert fee'
  confirm.fee = fee
}
function askDelete(fee: ExtraFee): void {
  confirm.open = true
  confirm.kind = 'delete'
  confirm.title = 'Delete extra fee'
  confirm.message =
    fee.status === 'applied'
      ? `Delete "${fee.name}"? It has no student dues.`
      : `Delete the draft "${fee.name}"? No student dues exist yet.`
  confirm.confirmText = 'Delete'
  confirm.fee = fee
}
function closeConfirm(): void {
  if (busy.value) return
  confirm.open = false
  confirm.fee = null
}

async function runConfirm(): Promise<void> {
  const fee = confirm.fee
  if (!fee) return
  busy.value = true
  busyId.value = fee.id
  try {
    if (confirm.kind === 'apply') {
      const res = await applyFee(fee.id)
      toast.success(
        res.data.created
          ? `${res.data.created} new student(s) charged`
          : 'Every student already has this fee',
      )
    } else if (confirm.kind === 'revert') {
      const res = await revertFee(fee.id)
      toast.success(`Reverted for ${res.data.removed} student(s)`)
    } else {
      await deleteFee(fee.id)
      toast.success('Extra fee deleted')
    }
    confirm.open = false
    confirm.fee = null
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Action failed')
  } finally {
    busy.value = false
    busyId.value = ''
  }
}

function goNew(): void {
  router.push('/admin/fees/extra/new')
}
function goFeeManagement(): void {
  router.push('/admin/fees')
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--spacing-xs);
}
.page__hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  max-width: 720px;
  margin: 0;
  line-height: 1.5;
}
.page__note {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  max-width: 720px;
  margin: var(--spacing-xs) 0 0;
  line-height: 1.5;
}
.mode-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}
.chips {
  display: flex;
  gap: var(--spacing-sm);
}
.chip {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  font-size: var(--font-size-xs);
}
.fee-name {
  font-weight: var(--font-weight-semibold);
}
.note {
  margin-top: 2px;
  max-width: 320px;
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
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
  vertical-align: top;
}
.row-actions {
  text-align: right;
  white-space: nowrap;
}
.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  padding: 0 var(--spacing-xs);
}
.link-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.link-btn--danger {
  color: var(--color-danger);
}
.badge {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.badge--draft {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
}
.badge--applied {
  background: var(--color-success-light, var(--color-primary-light));
  color: var(--color-success, var(--color-primary));
}
.badge--cancelled {
  background: var(--color-danger-light, var(--color-background));
  color: var(--color-danger);
}
</style>
