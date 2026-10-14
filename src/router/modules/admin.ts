import type { RouteRecordRaw } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import AcademicsView from '@/views/admin/AcademicsView.vue'
import ClassDetailView from '@/views/admin/ClassDetailView.vue'
import AttendanceView from '@/views/admin/AttendanceView.vue'
import AttendanceDayView from '@/views/admin/AttendanceDayView.vue'
import StaffLiveAttendanceView from '@/views/admin/StaffLiveAttendanceView.vue'
import StudentAttendanceDetailView from '@/views/admin/StudentAttendanceDetailView.vue'
import DashboardView from '@/views/admin/DashboardView.vue'
import EventsView from '@/views/admin/EventsView.vue'
import ExamDetailView from '@/views/admin/ExamDetailView.vue'
import ExamCreateView from '@/views/admin/ExamCreateView.vue'
import ExamsView from '@/views/admin/ExamsView.vue'
import FeeCollectView from '@/views/admin/FeeCollectView.vue'
import FeeDuesView from '@/views/admin/FeeDuesView.vue'
import FeeStructureView from '@/views/admin/FeeStructureView.vue'
import FeeStructureSetupView from '@/views/admin/FeeStructureSetupView.vue'
import PaymentsView from '@/views/admin/PaymentsView.vue'
import PaymentBulkView from '@/views/admin/PaymentBulkView.vue'
import PayrollView from '@/views/admin/PayrollView.vue'
import AccountsView from '@/views/admin/AccountsView.vue'
import MonthlySheetView from '@/views/admin/MonthlySheetView.vue'
import SalaryDetailView from '@/views/admin/SalaryDetailView.vue'
import ReceiptView from '@/views/admin/ReceiptView.vue'
import ReportCardView from '@/views/admin/ReportCardView.vue'
import ReportsView from '@/views/admin/ReportsView.vue'
import ResultsView from '@/views/admin/ResultsView.vue'
import RoutineView from '@/views/admin/RoutineView.vue'
import RoutineFormView from '@/views/admin/RoutineFormView.vue'
import SettingsView from '@/views/admin/SettingsView.vue'
import SmsView from '@/views/admin/SmsView.vue'
import StudentAdmitView from '@/views/admin/StudentAdmitView.vue'
import StudentCardsView from '@/views/admin/StudentCardsView.vue'
import StudentDetailView from '@/views/admin/StudentDetailView.vue'
import StudentEditView from '@/views/admin/StudentEditView.vue'
import StudentsView from '@/views/admin/StudentsView.vue'
import TeachersView from '@/views/admin/TeachersView.vue'
import TeacherCreateView from '@/views/admin/TeacherCreateView.vue'
import TeacherSubjectsView from '@/views/admin/TeacherSubjectsView.vue'
import PlaceholderView from '@/views/admin/PlaceholderView.vue'

export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', component: DashboardView, meta: { requiresAuth: true, permission: 'admin.dashboard.view' } },
      { path: 'academics', component: AcademicsView, meta: { requiresAuth: true, permission: 'admin.dashboard.view', module: 'academics' } },
      { path: 'academics/:classId', component: ClassDetailView, meta: { requiresAuth: true, permission: 'admin.dashboard.view', module: 'academics' } },
      { path: 'students', component: StudentsView, meta: { requiresAuth: true, permission: 'admin.students.view', module: 'students' } },
      { path: 'students/new', component: StudentAdmitView, meta: { requiresAuth: true, permission: 'admin.students.manage', module: 'students' } },
      { path: 'students/cards', component: StudentCardsView, meta: { requiresAuth: true, permission: 'admin.students.manage', module: 'students' } },
      { path: 'students/:id/edit', component: StudentEditView, meta: { requiresAuth: true, permission: 'admin.students.manage', module: 'students' } },
      { path: 'students/:id', component: StudentDetailView, meta: { requiresAuth: true, permission: 'admin.students.view', module: 'students' } },
      { path: 'teachers', component: TeachersView, meta: { requiresAuth: true, permission: 'admin.teachers.view' } },
      { path: 'teachers/new', component: TeacherCreateView, meta: { requiresAuth: true, permission: 'admin.teachers.view' } },
      { path: 'teachers/:id/subjects', component: TeacherSubjectsView, meta: { requiresAuth: true, permission: 'admin.teachers.view' } },
      { path: 'routine', component: RoutineView, meta: { requiresAuth: true, permission: 'admin.routine.view', module: 'routine' } },
      { path: 'routine/new', component: RoutineFormView, meta: { requiresAuth: true, permission: 'admin.routine.view', module: 'routine' } },
      { path: 'routine/:id/edit', component: RoutineFormView, meta: { requiresAuth: true, permission: 'admin.routine.view', module: 'routine' } },
      { path: 'attendance', component: AttendanceView, meta: { requiresAuth: true, permission: 'admin.attendance.view', module: 'attendance' } },
      { path: 'attendance/staff-live', component: StaffLiveAttendanceView, meta: { requiresAuth: true, permission: 'admin.attendance.view', module: 'attendance' } },
      { path: 'attendance/student/:id', component: StudentAttendanceDetailView, meta: { requiresAuth: true, permission: 'admin.attendance.view', module: 'attendance' } },
      { path: 'attendance/day/:date', component: AttendanceDayView, meta: { requiresAuth: true, permission: 'admin.attendance.view', module: 'attendance' } },
      { path: 'exams', component: ExamsView, meta: { requiresAuth: true, permission: 'admin.results.view', module: 'exam_result' } },
      { path: 'exams/new', component: ExamCreateView, meta: { requiresAuth: true, permission: 'admin.results.manage', module: 'exam_result' } },
      { path: 'exams/:id', component: ExamDetailView, meta: { requiresAuth: true, permission: 'admin.results.view', module: 'exam_result' } },
      { path: 'exams/:id/report/:studentId', component: ReportCardView, meta: { requiresAuth: true, permission: 'admin.results.view', module: 'exam_result' } },
      { path: 'results', component: ResultsView, meta: { requiresAuth: true, permission: 'admin.results.view', module: 'exam_result' } },
      { path: 'fees', component: FeeStructureView, meta: { requiresAuth: true, permission: 'admin.payments.view', module: 'payment' } },
      { path: 'fees/structure', redirect: '/admin/fees' },
      { path: 'fees/collect', component: FeeCollectView, meta: { requiresAuth: true, permission: 'admin.payments.view', module: 'payment' } },
      { path: 'fees/structure/setup', component: FeeStructureSetupView, meta: { requiresAuth: true, permission: 'admin.payments.manage', module: 'payment' } },
      { path: 'fees/dues', component: FeeDuesView, meta: { requiresAuth: true, permission: 'admin.payments.view', module: 'payment' } },
      { path: 'payments', component: PaymentsView, meta: { requiresAuth: true, permission: 'admin.payments.view', module: 'payment' } },
      { path: 'payments/bulk', component: PaymentBulkView, meta: { requiresAuth: true, permission: 'admin.payments.manage', module: 'payment' } },
      { path: 'payments/:id', component: ReceiptView, meta: { requiresAuth: true, permission: 'admin.payments.view', module: 'payment' } },
      { path: 'payroll', component: PayrollView, meta: { requiresAuth: true, permission: 'admin.dashboard.view', module: 'payroll' } },
      { path: 'accounts', component: AccountsView, meta: { requiresAuth: true, permission: 'admin.payments.view', module: 'payment' } },
      { path: 'payroll/sheet/:year/:month', component: MonthlySheetView, meta: { requiresAuth: true, permission: 'admin.dashboard.view', module: 'payroll' } },
      { path: 'payroll/salary/:id', component: SalaryDetailView, meta: { requiresAuth: true, permission: 'admin.dashboard.view', module: 'payroll' } },
      { path: 'sms', component: SmsView, meta: { requiresAuth: true, permission: 'admin.dashboard.view', module: 'sms' } },
      { path: 'events', component: EventsView, meta: { requiresAuth: true, permission: 'admin.dashboard.view', module: 'notice' } },
      { path: 'reports', component: ReportsView, meta: { requiresAuth: true, permission: 'admin.reports.view' } },
      { path: 'settings', component: SettingsView, meta: { requiresAuth: true, permission: 'admin.dashboard.view' } },
    ],
  },
]
