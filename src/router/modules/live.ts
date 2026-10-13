import type { RouteRecordRaw } from 'vue-router'
import LiveLayout from '@/layouts/LiveLayout.vue'
import LiveAttendanceView from '@/views/admin/LiveAttendanceView.vue'

/** Display-only shell for the live screen — outside /admin entirely. */
export const liveRoutes: RouteRecordRaw[] = [
  {
    path: '/live',
    component: LiveLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        component: LiveAttendanceView,
        meta: {
          requiresAuth: true,
          permission: ['admin.attendance.view', 'monitor.live.view'],
          module: 'attendance',
        },
      },
    ],
  },
]
