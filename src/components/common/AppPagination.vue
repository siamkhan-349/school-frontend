<template>
  <div class="pager">
    <div class="pager__meta">
      <span class="pager__info">{{ rangeStart }}–{{ rangeEnd }} of {{ total }}</span>
      <label class="pager__size">
        <span class="pager__size-label">Rows per page</span>
        <select :value="perPage" class="pager__size-select" @change="onPageSizeChange">
          <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
        </select>
      </label>
    </div>

    <div v-if="showControls" class="pager__controls">
      <button class="pager__btn" type="button" :disabled="page <= 1" @click="goTo(page - 1)">
        ‹ Prev
      </button>

      <template v-for="(item, index) in pages" :key="`${item}-${index}`">
        <span v-if="item === '...'" class="pager__ellipsis">…</span>
        <button
          v-else
          type="button"
          class="pager__page"
          :class="{ 'pager__page--active': item === page }"
          :aria-current="item === page ? 'page' : undefined"
          @click="goTo(item)"
        >
          {{ item }}
        </button>
      </template>

      <button class="pager__btn" type="button" :disabled="page >= totalPages" @click="goTo(page + 1)">
        Next ›
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PAGE_SIZE_OPTIONS } from '@/composables/usePagedList'

const props = withDefaults(
  defineProps<{
    page: number
    perPage: number
    total: number
    pageSizeOptions?: readonly number[]
  }>(),
  { pageSizeOptions: () => PAGE_SIZE_OPTIONS },
)
const emit = defineEmits<{
  'update:page': [page: number]
  'update:perPage': [perPage: number]
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)))

const pages = computed<Array<number | '...'>>(() => {
  const last = totalPages.value
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)

  const current = Math.min(Math.max(1, props.page), last)
  const left = Math.max(2, current - 1)
  const right = Math.min(last - 1, current + 1)

  const result: Array<number | '...'> = [1]
  if (left > 2) result.push('...')
  for (let i = left; i <= right; i += 1) result.push(i)
  if (right < last - 1) result.push('...')
  result.push(last)
  return result
})

const rangeStart = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.perPage + 1))
const rangeEnd = computed(() => Math.min(props.page * props.perPage, props.total))

// Rows-per-page stays visible even on one page: hiding it strands the user
// on a big page size with no way back except a reload.
const showControls = computed(() => totalPages.value > 1)

function goTo(target: number): void {
  const next = Math.min(Math.max(1, target), totalPages.value)
  if (next !== props.page) emit('update:page', next)
}

function onPageSizeChange(event: Event): void {
  const next = Number((event.target as HTMLSelectElement).value)
  if (Number.isFinite(next) && next !== props.perPage) emit('update:perPage', next)
}
</script>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}
.pager__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}
.pager__info {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  white-space: nowrap;
}
.pager__size {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  white-space: nowrap;
}
.pager__size-select {
  height: 32px;
  padding: 0 var(--spacing-xs);
  font-family: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.pager__controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}
.pager__btn {
  height: 32px;
  padding: 0 var(--spacing-md);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.pager__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pager__page {
  min-width: 32px;
  height: 32px;
  padding: 0 var(--spacing-sm);
  font-family: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.pager__page:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.pager__page--active {
  color: var(--color-primary-contrast);
  background: var(--color-primary);
  border-color: var(--color-primary);
}
.pager__ellipsis {
  padding: 0 var(--spacing-xs);
  color: var(--color-text-muted);
}
</style>
