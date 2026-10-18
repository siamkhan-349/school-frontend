import type { RouteRecordRaw } from 'vue-router'
import TeacherLayout from '@/layouts/TeacherLayout.vue'
import TeacherDashboardView from '@/views/teacher/TeacherDashboardView.vue'
import TeacherScheduleView from '@/views/teacher/TeacherScheduleView.vue'
import TeacherLeavesView from '@/views/teacher/TeacherLeavesView.vue'
import TeacherExamsView from '@/views/teacher/TeacherExamsView.vue'
import TeacherSalaryView from '@/views/teacher/TeacherSalaryView.vue'
import TeacherEventsView from '@/views/teacher/TeacherEventsView.vue'
import TeacherProfileView from '@/views/teacher/TeacherProfileView.vue'

export const teacherRoutes: RouteRecordRaw[] = [
  {
    path: '/teacher',
    component: TeacherLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/teacher/dashboard' },
      { path: 'dashboard', component: TeacherDashboardView, meta: { requiresAuth: true, permission: 'teacher.dashboard.view' } },
      { path: 'schedule', component: TeacherScheduleView, meta: { requiresAuth: true, permission: 'teacher.schedule.view', module: 'routine' } },
      { path: 'exams', component: TeacherExamsView, meta: { requiresAuth: true, permission: 'teacher.exams.view', module: 'exam_result' } },
      { path: 'leaves', component: TeacherLeavesView, meta: { requiresAuth: true, permission: 'teacher.leaves.view', module: 'payroll' } },
      { path: 'salary', component: TeacherSalaryView, meta: { requiresAuth: true, permission: 'teacher.salary.view', module: 'payroll' } },
      { path: 'events', component: TeacherEventsView, meta: { requiresAuth: true, permission: 'teacher.events.view', module: 'notice' } },
      { path: 'profile', component: TeacherProfileView, meta: { requiresAuth: true, permission: 'teacher.profile.view' } },
    ],
  },
]
