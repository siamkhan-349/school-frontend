import { computed, type ComputedRef } from 'vue'
import { useRoute } from 'vue-router'
import type { NavItem } from '@/constants/navigation'

/**
 * Page title for the panel topbar: the nav item matching the current route.
 * Exact match first, then the longest path prefix — so detail pages like
 * /admin/students/123 still read "Students" instead of showing nothing.
 */
export function usePageTitle(items: ComputedRef<NavItem[]>) {
  const route = useRoute()
  return computed(() => {
    const list = items.value
    const exact = list.find((item) => item.path === route.path)
    if (exact) return exact.name
    const prefix = list
      .filter((item) => route.path.startsWith(`${item.path}/`))
      .sort((a, b) => b.path.length - a.path.length)[0]
    return prefix?.name ?? ''
  })
}
