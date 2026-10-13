import { ref } from 'vue'

export type ThemeMode = 'light' | 'dark'

const THEME_STORAGE_KEY = 'school.theme'
const theme = ref<ThemeMode>('light')

function applyTheme(mode: ThemeMode): void {
  theme.value = mode
  document.documentElement.setAttribute('data-theme', mode)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}

export function useTheme() {
  function initTheme(): void {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY)
    } catch {
      stored = null
    }
    const prefersDark =
      typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light')
  }

  function toggleTheme(): void {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, initTheme, toggleTheme }
}
