import { computed, ref, watch } from 'vue'

/** Sizes offered in every rows-per-page dropdown. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200] as const

export function isPageSize(value: number): boolean {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value)
}

/**
 * Page + page size bound together for one table (coaching `usePagedList`
 * pattern). Size change resets to page 1 — otherwise shrinking the size can
 * strand the table on a page past the end of the list.
 */
export function usePagedList(screenDefault = 10) {
  const page = ref(1)
  const local = ref(screenDefault)
  const perPage = computed({
    get: () => local.value,
    set: (value: number) => {
      if (isPageSize(value)) local.value = value
    },
  })
  watch(local, () => {
    page.value = 1
  })

  return { page, perPage }
}

export type SortDir = 'asc' | 'desc'

/**
 * Client-side column sort for tables served in one call (overview, dues).
 * `toggle(key)` cycles asc → desc → off. `apply(rows, get)` sorts a copy.
 */
export function useClientSort<T extends string>() {
  const key = ref<T | null>(null)
  const dir = ref<SortDir>('asc')

  function toggle(next: T): void {
    if (key.value !== next) {
      key.value = next
      dir.value = 'asc'
    } else if (dir.value === 'asc') {
      dir.value = 'desc'
    } else {
      key.value = null
      dir.value = 'asc'
    }
  }

  function arrow(forKey: T): string {
    if (key.value !== forKey) return ''
    return dir.value === 'asc' ? ' ▲' : ' ▼'
  }

  function apply<R>(rows: R[], get: (row: R) => string | number): R[] {
    const active = key.value
    if (!active) return rows
    const sign = dir.value === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = get(a)
      const vb = get(b)
      if (typeof va === 'number' || typeof vb === 'number') {
        return ((Number(va) || 0) - (Number(vb) || 0)) * sign
      }
      return String(va).localeCompare(String(vb), undefined, { numeric: true }) * sign
    })
  }

  return { key, dir, toggle, arrow, apply }
}
