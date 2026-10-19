import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AuthUser, UserRole } from '@/types/models'
import { canUsePermission } from '@/utils/permissions'
import { clearStoredTokens, getAccessToken, saveTokens } from '@/lib/api/tokenStore'
import { apiClient } from '@/lib/api/apiClient'

/** Backend role → frontend role (backend says `superadmin`, UI says `super_admin`). */
function mapLiveRole(role: string): UserRole {
  if (role === 'superadmin') return 'super_admin'
  const known: UserRole[] = ['super_admin', 'admin', 'teacher', 'accountant', 'parent', 'student', 'monitor']
  return (known as string[]).includes(role) ? (role as UserRole) : 'parent'
}

interface LiveUser {
  public_id?: string
  id: number | string
  name: string
  username: string
  role: string
}

/** Backend /me payload → the cached session user (single mapping point). */
function toAuthUser(me: LiveUser): AuthUser {
  return {
    id: String(me.public_id ?? me.id),
    name: me.name,
    email: me.username,
    role: mapLiveRole(me.role),
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const isAuthenticated = computed(() => user.value !== null)

  function can(permission: string): boolean {
    return canUsePermission(user.value?.role ?? null, permission)
  }

  /** Persist the session user (memory + localStorage) in one place. */
  function cacheUser(next: AuthUser): void {
    user.value = next
    try {
      localStorage.setItem('school.user', JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  /**
   * Re-fetch /me and re-cache. The profile page calls this on mount so an
   * account rename lands without a fresh login; failures keep the cache.
   */
  async function refreshUser(): Promise<void> {
    try {
      const me = (await apiClient.get<unknown>('/api/auth/me')) as unknown as LiveUser
      cacheUser(toAuthUser(me))
    } catch {
      /* keep the cached user — the page still renders */
    }
  }

  async function login(identifier: string, password: string): Promise<void> {
    // Live only: JWT against school_backend (/api/auth/login → /api/auth/me).
    // Auth endpoints answer raw (no {success,data} envelope), so cast past it.
    const loginRes = (await apiClient.post<unknown>('/api/auth/login', {
      username: identifier.trim(),
      password,
    })) as unknown as { refresh: string; access: string; user: LiveUser }
    saveTokens(loginRes.access, loginRes.refresh)
    const me = (await apiClient.get<unknown>('/api/auth/me')) as unknown as LiveUser
    cacheUser(toAuthUser(me))
  }

  function tryRestoreSession(): void {
    // A cached user WITHOUT a token is a stale session (expired/cleared).
    // Restoring it makes the app look logged-in and fire authenticated calls
    // with no credential — one 401 per navigation until the user gives up.
    if (!getAccessToken()) {
      user.value = null
      try {
        localStorage.removeItem('school.user')
      } catch {
        /* ignore */
      }
      return
    }
    try {
      const raw = localStorage.getItem('school.user')
      if (raw) user.value = JSON.parse(raw) as AuthUser
    } catch {
      user.value = null
    }
  }

  function logout(): void {
    user.value = null
    clearStoredTokens()
    try {
      localStorage.removeItem('school.user')
    } catch {
      /* ignore */
    }
  }

  return { user, isAuthenticated, can, login, refreshUser, logout, tryRestoreSession }
})

export type { UserRole }
