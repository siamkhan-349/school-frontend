import { createRouter, createWebHistory } from 'vue-router'
import { satisfiesModuleGate } from '@/constants/modules'
import { useAuthStore } from '@/stores/auth'
import { useSchoolStore } from '@/stores/school'
import LoginView from '@/views/auth/LoginView.vue'
import StatusView from '@/views/common/StatusView.vue'
import { adminRoutes } from './modules/admin'
import { liveRoutes } from './modules/live'
import { parentRoutes } from './modules/parent'
import { superAdminRoutes } from './modules/super-admin'
import { teacherRoutes } from './modules/teacher'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView },
    ...adminRoutes,
    ...liveRoutes,
    ...parentRoutes,
    ...superAdminRoutes,
    ...teacherRoutes,
    { path: '/', redirect: '/admin/dashboard' },    { path: '/access-denied', component: StatusView, props: { code: '403', message: 'Access denied.' } },
    { path: '/module-unavailable', component: StatusView, props: { code: '402', message: 'Module not enabled.' } },
    { path: '/:pathMatch(.*)*', component: StatusView, props: { code: '404', message: 'Page not found.' } },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true

  const auth = useAuthStore()
  const school = useSchoolStore()
  auth.tryRestoreSession()
  if (!auth.isAuthenticated) return '/login'

  // A dead token (expired/revoked) answers 401 here. Without this catch the
  // guard rejects, navigation hangs, and every retry logs another 401 —
  // instead, drop the stale session and send the user to log in again.
  try {
    await school.fetchEnabledModules()
  } catch {
    auth.logout()
    school.reset()
    return '/login'
  }

  const permission = to.meta.permission as string | string[] | undefined
  if (permission) {
    const allowed = Array.isArray(permission)
      ? permission.some((p) => auth.can(p))
      : auth.can(permission)
    if (!allowed) return '/access-denied'
  }

  // Role landing: each login starts in its own panel.
  if (to.path === '/admin/dashboard' && auth.user?.role === 'monitor') {
    return '/live'
  }
  if (to.path === '/admin/dashboard' && auth.user?.role === 'parent') {
    return '/parent/dashboard'
  }
  if (to.path === '/admin/dashboard' && auth.user?.role === 'teacher') {
    return '/teacher/dashboard'
  }

  const gate = to.meta.module as string | string[] | undefined
  if (!satisfiesModuleGate(gate, (k) => school.hasModule(k))) return '/module-unavailable'

  return true
})

export default router
