import type { RouteRecordRaw } from 'vue-router'
import ParentLayout from '@/layouts/ParentLayout.vue'
import ParentChildrenView from '@/views/parent/ParentChildrenView.vue'
import ParentChildDetailView from '@/views/parent/ParentChildDetailView.vue'
import ParentDashboardView from '@/views/parent/ParentDashboardView.vue'
import ParentEventsView from '@/views/parent/ParentEventsView.vue'
import ParentFeesView from '@/views/parent/ParentFeesView.vue'
import ParentResultsView from '@/views/parent/ParentResultsView.vue'
import ParentRoutineView from '@/views/parent/ParentRoutineView.vue'

export const parentRoutes: RouteRecordRaw[] = [
  {
    path: '/parent',
    component: ParentLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/parent/dashboard' },
      { path: 'dashboard', component: ParentDashboardView, meta: { requiresAuth: true, permission: 'parent.dashboard.view' } },
      { path: 'children', component: ParentChildrenView, meta: { requiresAuth: true, permission: 'parent.children.view' } },
      { path: 'children/:id', component: ParentChildDetailView, meta: { requiresAuth: true, permission: 'parent.children.view' } },
      { path: 'results', component: ParentResultsView, meta: { requiresAuth: true, permission: 'parent.results.view', module: 'exam_result' } },
      { path: 'routine', component: ParentRoutineView, meta: { requiresAuth: true, permission: 'parent.routine.view', module: 'routine' } },
      { path: 'fees', component: ParentFeesView, meta: { requiresAuth: true, permission: 'parent.payments.view', module: 'payment' } },
      { path: 'events', component: ParentEventsView, meta: { requiresAuth: true, permission: 'parent.events.view', module: 'notice' } },
    ],
  },
]
