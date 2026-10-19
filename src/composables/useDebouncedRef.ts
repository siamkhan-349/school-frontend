import { ref, watch, type Ref } from 'vue'

/**
 * Debounced mirror of a ref. Use for search inputs whose value re-keys a
 * query, so requests fire once the user pauses typing instead of per keystroke.
 */
export function useDebouncedRef<T>(source: Ref<T>, delay = 300): Ref<T> {
  const debounced = ref(source.value) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(source, (value) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      debounced.value = value
    }, delay)
  })
  return debounced
}
