import type { RouteRecordRaw } from 'vue-router'
import SuperAdminLayout from '@/layouts/SuperAdminLayout.vue'
import ModulesView from '@/views/super-admin/ModulesView.vue'
import ProfileView from '@/views/shared/ProfileView.vue'
import SmsControlView from '@/views/super-admin/SmsControlView.vue'
import SuperDashboardView from '@/views/super-admin/SuperDashboardView.vue'
import SystemView from '@/views/super-admin/SystemView.vue'

export const superAdminRoutes: RouteRecordRaw[] = [
  {
    path: '/super-admin',
    component: SuperAdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/super-admin/dashboard' },
      { path: 'dashboard', component: SuperDashboardView, meta: { requiresAuth: true, permission: 'super-admin.dashboard.view' } },
      { path: 'modules', component: ModulesView, meta: { requiresAuth: true, permission: 'super-admin.modules.view' } },
      { path: 'system', component: SystemView, meta: { requiresAuth: true, permission: 'super-admin.system.view' } },
      { path: 'sms', component: SmsControlView, meta: { requiresAuth: true, permission: 'super-admin.system.view' } },
      { path: 'profile', component: ProfileView, meta: { requiresAuth: true, permission: 'super-admin.profile.view' } },
    ],
  },
]
