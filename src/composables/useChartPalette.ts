import { computed } from 'vue'
import { useTheme } from './useTheme'

/** Chart palette follows the active theme — reads live CSS variables. */
export function useChartPalette() {
  const { theme } = useTheme()

  const palette = computed(() => {
    void theme.value // re-evaluate on theme toggle
    const css = getComputedStyle(document.documentElement)
    const pick = (name: string, fallback: string): string =>
      css.getPropertyValue(name).trim() || fallback
    return {
      primary: pick('--color-primary', '#175e54'),
      success: pick('--color-success', '#15803d'),
      warning: pick('--color-warning', '#b45309'),
      info: pick('--color-info', '#2563eb'),
      danger: pick('--color-danger', '#b91c1c'),
      muted: pick('--color-text-muted', '#5d7370'),
    }
  })

  return { palette }
}
