import type { ApiResponse, ListParams, PaginatedData } from '@/types/api'
import type {
  AcademicSession,
  AppUser,
  AppUserRole,
  AttendanceMark,
  AttendanceStatus,
  DashboardStats,
  Department,
  Exam,
  ExamStatus,
  ExamSubject,
  ExamSubjectInput,
  FeeCatalogItem,
  FeeHead,
  FeeStructureOverviewRow,
  FeeStructureRow,
  LeaveRequest,
  LeaveStatus,
  LedgerEntry,
  LedgerHead,
  LedgerSummary,
  Payment,
  PaymentMethodOption,
  Routine,
  RoutineInput,
  SalaryRecord,
  SheetDraftRow,
  SalaryType,
  SchoolClass,
  SchoolEvent,
  SchoolSettings,
  Section,
  SmsBalance,
  SmsLog,
  SmsTemplate,
  Student,
  StudentAttendance,
  StudentAttendanceSummary,
  StudentBulkRecord,
  StudentBulkResult,
  StudentInput,
  StudentStatus,
  StudentSubjectMarks,
  Subject,
  SubjectConfigInput,
  SubjectMarkInput,
  Teacher,
  TeacherExam,
  TeacherExamMarkInput,
  TeacherInput,
  TeacherSubject,
} from '@/types/models'
import { apiClient } from '@/lib/api/apiClient'

/**
 * Thin typed wrappers only — no UI logic here.
 * Live backend only: every call below hits the real API (see .env).
 */
export const studentService = {
  list(params?: ListParams): Promise<ApiResponse<PaginatedData<Student>>> {
    return apiClient.get<PaginatedData<Student>>('/students', { params })
  },
  get(id: string): Promise<ApiResponse<Student>> {
    return apiClient.get<Student>(`/students/${id}`)
  },
  create(input: StudentInput): Promise<ApiResponse<Student>> {
    return apiClient.post<Student>('/students', input)
  },
  update(id: string, input: Partial<StudentInput>): Promise<ApiResponse<Student>> {
    return apiClient.patch<Student>(`/students/${id}`, input)
  },
  remove(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/students/${id}`)
  },
  payments(studentId: string): Promise<ApiResponse<Payment[]>> {
    return apiClient.get<Payment[]>(`/students/${studentId}/payments`)
  },
  /** Upload the student's photo (multipart). The backend renames + stores it. */
  uploadPhoto(id: string, file: File): Promise<ApiResponse<Student>> {
    const body = new FormData()
    body.append('photo', file)
    return apiClient.post<Student>(`/students/${id}/photo`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  removePhoto(id: string): Promise<ApiResponse<Student>> {
    return apiClient.delete<Student>(`/students/${id}/photo`)
  },
  /** Create/update many students from one import (upsert by class+roll). */
  bulk(records: StudentBulkRecord[]): Promise<ApiResponse<StudentBulkResult>> {
    return apiClient.post<StudentBulkResult>('/students/bulk', { records })
  },
  /** One status across many students (selected ids or a whole class/section). */
  bulkStatus(input: {
    status: StudentStatus
    studentIds?: string[]
    classId?: string
    sectionId?: string
  }): Promise<ApiResponse<{ updated: number; unchanged: number; status: string }>> {
    return apiClient.post('/students/bulk-status', {
      status: input.status,
      studentIds: input.studentIds,
      unitId: input.classId,
      batchId: input.sectionId,
    })
  },
}

export const teacherService = {
  list(params?: ListParams): Promise<ApiResponse<PaginatedData<Teacher>>> {
    return apiClient.get<PaginatedData<Teacher>>('/teachers', { params })
  },
  get(id: string): Promise<ApiResponse<Teacher>> {
    return apiClient.get<Teacher>(`/teachers/${id}`)
  },
  /** Signed-in teacher/staff member's own linked profile (404 when unlinked). */
  me(): Promise<ApiResponse<Teacher>> {
    return apiClient.get<Teacher>('/teachers/me')
  },
  create(input: TeacherInput): Promise<ApiResponse<Teacher>> {
    return apiClient.post<Teacher>('/teachers', input)
  },
  update(id: string, input: Partial<TeacherInput>): Promise<ApiResponse<Teacher>> {
    return apiClient.patch<Teacher>(`/teachers/${id}`, input)
  },
  remove(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/teachers/${id}`)
  },
  /** Upload the teacher's photo (multipart). The backend renames + stores it. */
  uploadPhoto(id: string, file: File): Promise<ApiResponse<Teacher>> {
    const body = new FormData()
    body.append('photo', file)
    return apiClient.post<Teacher>(`/teachers/${id}/photo`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  removePhoto(id: string): Promise<ApiResponse<Teacher>> {
    return apiClient.delete<Teacher>(`/teachers/${id}/photo`)
  },
}

/** Direct teacher-subject mapping (kon teacher kon subject poray). */
export const teacherSubjectService = {
  list(teacherId: string): Promise<ApiResponse<TeacherSubject[]>> {
    return apiClient.get<TeacherSubject[]>('/teacher-subjects', {
      params: { teacherId },
    })
  },
  /** Who teaches one subject (routine form suggestion). */
  listBySubject(subjectId: string): Promise<ApiResponse<TeacherSubject[]>> {
    return apiClient.get<TeacherSubject[]>('/teacher-subjects', {
      params: { subjectId },
    })
  },
  /** All assignments of one class (subject dropdown teacher names). */
  listByClass(classId: string): Promise<ApiResponse<TeacherSubject[]>> {
    return apiClient.get<TeacherSubject[]>('/teacher-subjects', {
      params: { classId },
    })
  },
  /** Every assignment (subject → teacher picker labels). */
  listAll(): Promise<ApiResponse<TeacherSubject[]>> {
    return apiClient.get<TeacherSubject[]>('/teacher-subjects')
  },
  assign(teacherId: string, subjectId: string): Promise<ApiResponse<TeacherSubject>> {
    return apiClient.post<TeacherSubject>('/teacher-subjects', {
      teacherId,
      subjectId,
    })
  },
  unassign(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/teacher-subjects/${id}`)
  },
}

/** Payroll master: salary types (Monthly, Daily, ...) managed from Settings. */
export const salaryTypeService = {
  list(): Promise<ApiResponse<SalaryType[]>> {
    return apiClient.get<SalaryType[]>('/salary-types')
  },
  create(name: string): Promise<ApiResponse<SalaryType>> {
    return apiClient.post<SalaryType>('/salary-types', { name })
  },
  remove(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/salary-types/${id}`)
  },
}

export const academicService = {
  classes(): Promise<ApiResponse<SchoolClass[]>> {
    return apiClient.get<SchoolClass[]>('/meta/classes')
  },
  createClass(input: { label: string; hasDepartments?: boolean; sortOrder?: number; sections?: string[]; departments?: string[]; startTime?: string; endTime?: string }): Promise<ApiResponse<SchoolClass>> {
    return apiClient.post<SchoolClass>('/meta/classes', input)
  },
  deleteClass(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/meta/classes/${id}`)
  },
  updateClass(id: string, input: { label?: string; hasDepartments?: boolean; sortOrder?: number; startTime?: string; endTime?: string }): Promise<ApiResponse<SchoolClass>> {
    return apiClient.put<SchoolClass>(`/meta/classes/${id}`, input)
  },
  reorderClasses(ids: string[]): Promise<ApiResponse<SchoolClass[]>> {
    return apiClient.post<SchoolClass[]>('/meta/classes/reorder', { ids })
  },
  departments(classId?: string): Promise<ApiResponse<Department[]>> {
    return apiClient.get<Department[]>('/meta/departments', { params: { classId } })
  },
  createDepartment(classId: string, label: string): Promise<ApiResponse<Department>> {
    return apiClient.post<Department>('/meta/departments', { classId, label })
  },
  deleteDepartment(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/meta/departments/${id}`)
  },
  sections(classId?: string, withStudents?: boolean): Promise<ApiResponse<Section[]>> {
    return apiClient.get<Section[]>('/meta/sections', { params: { classId, withStudents: withStudents ? 1 : undefined } })
  },
  createSection(classId: string, label: string): Promise<ApiResponse<Section>> {
    return apiClient.post<Section>('/meta/sections', { classId, label })
  },
  deleteSection(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/meta/sections/${id}`)
  },
  sessions(): Promise<ApiResponse<AcademicSession[]>> {
    return apiClient.get<AcademicSession[]>('/meta/sessions')
  },
  createSession(label: string, startDate: string, endDate: string): Promise<ApiResponse<AcademicSession>> {
    return apiClient.post<AcademicSession>('/meta/sessions', { label, startDate, endDate })
  },
  updateSession(id: string, input: { label?: string; startDate?: string | null; endDate?: string | null }): Promise<ApiResponse<AcademicSession>> {
    return apiClient.put<AcademicSession>(`/meta/sessions/${id}`, input)
  },
  deleteSession(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/meta/sessions/${id}`)
  },
  subjects(classId?: string): Promise<ApiResponse<Subject[]>> {
    return apiClient.get<Subject[]>('/meta/subjects', { params: { classId } })
  },
  createSubject(classId: string | null, label: string, departmentId?: string | null): Promise<ApiResponse<Subject>> {
    return apiClient.post<Subject>('/meta/subjects', { classId, label, departmentId: departmentId ?? null })
  },
  deleteSubject(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/meta/subjects/${id}`)
  },
}

export interface AttendanceSummaryRow {
  date: string
  present: number
  absent: number
  late: number
  leave: number
}

export const examService = {
  list(params?: ListParams): Promise<ApiResponse<PaginatedData<Exam>>> {
    return apiClient.get<PaginatedData<Exam>>('/results', { params })
  },
  get(id: string): Promise<ApiResponse<Exam>> {
    return apiClient.get<Exam>(`/results/${id}`)
  },
  create(input: {
    name: string; examDate: string; classId: string; sectionId: string | null;
    departmentId?: string | null;
    /** Omit in teacher-entry mode: the backend seeds the class's subjects. */
    subjects?: ExamSubjectInput[]
    includeCommon?: boolean
  }): Promise<ApiResponse<Exam>> {
    return apiClient.post<Exam>('/results', input)
  },
  update(id: string, input: {
    name?: string; examDate?: string; subjects?: ExamSubjectInput[]
  }): Promise<ApiResponse<Exam>> {
    return apiClient.put<Exam>(`/results/${id}`, input)
  },
  setStatus(id: string, status: ExamStatus): Promise<ApiResponse<Exam>> {
    return apiClient.patch<Exam>(`/results/${id}`, { status })
  },
  /** Admin fallback: fill/replace one subject row in place (pre-publish). */
  patchSubject(id: string, subjectId: string, input: SubjectConfigInput): Promise<ApiResponse<ExamSubject>> {
    return apiClient.patch<ExamSubject>(`/results/${id}/subjects/${subjectId}`, input)
  },
  remove(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/results/${id}`)
  },
  entries(examId: string): Promise<ApiResponse<StudentSubjectMarks[]>> {
    return apiClient.get<StudentSubjectMarks[]>(`/results/${examId}/entries`)
  },
  saveEntries(
    examId: string,
    entries: { studentId: string; marks: SubjectMarkInput[] }[],
  ): Promise<ApiResponse<{ saved: number }>> {
    return apiClient.post<{ saved: number }>(`/results/${examId}/entries`, { entries })
  },
  results(examId: string): Promise<ApiResponse<ExamResults>> {
    return apiClient.get<ExamResults>(`/results/${examId}/results`)
  },
}

/** Teacher panel (teacher-entry mode only): own subjects + marks. */
export const teacherExamService = {
  list(): Promise<ApiResponse<TeacherExam[]>> {
    return apiClient.get<TeacherExam[]>('/teacher-exams')
  },
  get(id: string): Promise<ApiResponse<TeacherExam>> {
    return apiClient.get<TeacherExam>(`/teacher-exams/${id}`)
  },
  saveSubject(examId: string, subjectId: string, input: SubjectConfigInput): Promise<ApiResponse<ExamSubject>> {
    return apiClient.patch<ExamSubject>(`/teacher-exams/${examId}/subjects/${subjectId}`, input)
  },
  saveMarks(
    examId: string,
    subjectId: string,
    marks: TeacherExamMarkInput[],
  ): Promise<ApiResponse<{ saved: number }>> {
    return apiClient.post<{ saved: number }>(`/teacher-exams/${examId}/marks`, { subjectId, marks })
  },
}

export interface ExamResultSubjectRow {
  subjectId: string
  name: string
  cq: number
  mcq: number
  total: number
  full: number
  passed: boolean
  absent: boolean
  grade: string
}

export interface ExamResultRow {
  studentId: string
  studentName: string
  roll?: number | null
  subjects: ExamResultSubjectRow[]
  total: number
  percentage: number
  grade: string
  passed: boolean
  rank: number
}

export interface ExamResults {
  subjects: ExamSubject[]
  fullMarks: number
  rows: ExamResultRow[]
  summary: { students: number; passed: number; failed: number; passRate: number }
}

export interface StudentResultRow {
  examId: string
  examName: string
  examDate: string
  subjectId: string
  subjectName: string
  fullMarks: number
  passMarks: number
  published: boolean
  cq: number
  mcq: number
  marksObtained: number
  absent: boolean
  passed: boolean
  grade: string
}

export const parentService = {
  results(studentId: string): Promise<ApiResponse<StudentResultRow[]>> {
    return apiClient.get<StudentResultRow[]>(`/parent/results`, { params: { studentId } })
  },
}

export const routineService = {
  list(classId?: string, sectionId?: string | null, routineType?: 'class' | 'exam'): Promise<ApiResponse<Routine[]>> {
    return apiClient.get<Routine[]>('/routines', { params: { classId, sectionId, routineType } })
  },
  get(id: string): Promise<ApiResponse<Routine>> {
    return apiClient.get<Routine>(`/routines/${id}`)
  },
  create(input: RoutineInput): Promise<ApiResponse<Routine>> {
    return apiClient.post<Routine>('/routines', input)
  },
  update(id: string, input: RoutineInput): Promise<ApiResponse<Routine>> {
    return apiClient.put<Routine>(`/routines/${id}`, input)
  },
  remove(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/routines/${id}`)
  },
}

export const attendanceService = {
  student(
    date: string,
    classId: string,
    sectionId: string | null,
    departmentId?: string | null,
  ): Promise<ApiResponse<AttendanceMark[]>> {
    return apiClient.get<AttendanceMark[]>('/attendance', { params: { date, classId, sectionId, departmentId: departmentId ?? undefined } })
  },
  saveStudent(
    date: string,
    classId: string,
    sectionId: string | null,
    marks: AttendanceMark[],
    departmentId?: string | null,
  ): Promise<ApiResponse<{ saved: number }>> {
    return apiClient.post<{ saved: number }>('/attendance/bulk', { date, classId, sectionId, departmentId: departmentId ?? undefined, marks })
  },
  history(studentId: string): Promise<ApiResponse<AttendanceMark[]>> {
    return apiClient.get<AttendanceMark[]>('/attendance', { params: { studentId } })
  },
  /** Whole-school day sheet (Recent Summary drill-down): every record of one date. */
  day(date: string, status?: string): Promise<ApiResponse<StudentAttendance[]>> {
    return apiClient.get<StudentAttendance[]>('/attendance', { params: { date, status } })
  },
  recent(limit = 10): Promise<ApiResponse<StudentAttendance[]>> {
    return apiClient.get<StudentAttendance[]>('/attendance', { params: { limit } })
  },
  report(params: { classId?: string; sectionId?: string | null; departmentId?: string | null; from?: string; to?: string }): Promise<ApiResponse<StudentAttendanceSummary[]>> {
    return apiClient.get<StudentAttendanceSummary[]>('/attendance/summary-by-student', { params })
  },
  summary(
    classId?: string,
    sectionId?: string | null,
    departmentId?: string | null,
  ): Promise<ApiResponse<AttendanceSummaryRow[]>> {
    return apiClient.get<AttendanceSummaryRow[]>('/attendance/summary', { params: { classId, sectionId, departmentId: departmentId ?? undefined } })
  },
  staff(date: string): Promise<ApiResponse<{ teacherId: string; status: AttendanceStatus; entryTime?: string; exitTime?: string }[]>> {
    return apiClient.get<{ teacherId: string; status: AttendanceStatus; entryTime?: string; exitTime?: string }[]>('/staff-attendance', {
      params: { date },
    })
  },
  staffMonthly(month: string): Promise<ApiResponse<{
    teacherId: string; status: AttendanceStatus; date: string;
    entryTime?: string; exitTime?: string;
  }[]>> {
    return apiClient.get('/staff-attendance/monthly', { params: { month } })
  },
  saveStaff(
    date: string,
    marks: { teacherId: string; status: AttendanceStatus; entryTime?: string; exitTime?: string }[],
  ): Promise<ApiResponse<{ saved: number }>> {
    return apiClient.post<{ saved: number }>('/staff-attendance/bulk', { date, marks })
  },
  tap(cardId: string, at?: string, date?: string): Promise<ApiResponse<{
    tap: 'entry' | 'exit' | 'duplicate'
    status: string
    entryTime: string
    exitTime: string
    student: { id: string; name: string; roll: string; classLabel: string }
  }>> {
    return apiClient.post('/attendance/tap', { cardId, at: at ?? '', date: date ?? '' })
  },
  /** Staff card/finger tap — separate system from student taps. */
  staffTap(cardId: string, at?: string, date?: string): Promise<ApiResponse<{
    tap: 'entry' | 'exit' | 'duplicate'
    status: string
    entryTime: string
    exitTime: string
    teacher: { id: string; name: string; designation: string; kind: string }
  }>> {
    return apiClient.post('/staff-attendance/tap', { cardId, at: at ?? '', date: date ?? '' })
  },
  closeDay(date: string, classId?: string, sectionId?: string | null, departmentId?: string | null): Promise<ApiResponse<{ absent: number; holiday: number }>> {
    return apiClient.post<{ absent: number; holiday: number }>('/attendance/close-day', { date, classId: classId ?? '', sectionId: sectionId ?? '', departmentId: departmentId ?? '' })
  },
}

export interface CollectPaymentInput {
  studentId: string
  feeType: string
  feeName?: string
  amount: number
  discount: number
  paid: number
  paymentDate: string
  paymentMethod?: string
  collectorName?: string
  notes?: string
  breakdown?: { feeType: string; feeName?: string; dueFor?: string; amount: number; paid: number }[]
}

export interface BulkPaymentInput {
  records: {
    studentId: string
    feeType: string
    amount: number
    discount: number
    paid: number
    paymentMethod?: string
    paymentDate?: string
    collectorName?: string
    notes?: string
  }[]
}

export const paymentService = {
  list(params?: ListParams): Promise<ApiResponse<PaginatedData<Payment>>> {
    return apiClient.get<PaginatedData<Payment>>('/payments', { params })
  },
  dues(): Promise<ApiResponse<Student[]>> {
    return apiClient.get<Student[]>('/payments/dues')
  },
  collect(input: CollectPaymentInput): Promise<ApiResponse<Payment>> {
    return apiClient.post('/payments', input)
  },
  remove(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/payments/${id}`)
  },
  bulk(input: BulkPaymentInput): Promise<ApiResponse<{ created: unknown[]; errors: { row: number; message: string }[] }>> {
    return apiClient.post('/payments/bulk', input)
  },
  paymentMethods(): Promise<ApiResponse<PaymentMethodOption[]>> {
    return apiClient.get<PaymentMethodOption[]>('/payment-methods')
  },
  feeHeads(): Promise<ApiResponse<FeeHead[]>> {
    return apiClient.get<FeeHead[]>('/fees/heads')
  },
  createFeeHead(label: string): Promise<ApiResponse<FeeHead>> {
    return apiClient.post<FeeHead>('/fees/heads', { label })
  },
  deleteFeeHead(key: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/fees/heads/${key}`)
  },
  receipt(id: string): Promise<ApiResponse<Payment>> {
    return apiClient.get<Payment>(`/payments/${id}`)
  },
  feeStructure(classId: string, departmentId?: string | null, merged = false): Promise<ApiResponse<FeeStructureRow[]>> {
    return apiClient.get<FeeStructureRow[]>('/fees/structure', { params: { classId, departmentId: departmentId ?? '', merged: merged ? 'true' : '' } })
  },
  feeStructuresOverview(): Promise<ApiResponse<FeeStructureOverviewRow[]>> {
    return apiClient.get<FeeStructureOverviewRow[]>('/fees/structure/overview')
  },
  saveFeeStructure(classId: string, departmentId: string | null, fees: FeeStructureRow[]): Promise<ApiResponse<FeeStructureRow[]>> {
    return apiClient.put<FeeStructureRow[]>('/fees/structure', { classId, departmentId, fees })
  },
  feeCatalog(classId: string, departmentId?: string | null, merged = false): Promise<ApiResponse<FeeCatalogItem[]>> {
    return apiClient.get<FeeCatalogItem[]>('/fees/catalog', { params: { classId, departmentId: departmentId ?? '', merged: merged ? 'true' : '' } })
  },
  feeCatalogOverview(): Promise<ApiResponse<FeeCatalogItem[]>> {
    return apiClient.get<FeeCatalogItem[]>('/fees/catalog/overview')
  },
  saveFeeCatalog(classId: string, departmentId: string | null, fees: { id?: string; name: string; amount: number; cycleDays?: number; isActive?: boolean }[]): Promise<ApiResponse<FeeCatalogItem[]>> {
    return apiClient.put<FeeCatalogItem[]>('/fees/catalog', { classId, departmentId, fees })
  },
  deleteFeeCatalogItem(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>('/fees/catalog', { params: { id } })
  },
  generateDues(classId?: string, asOf?: string): Promise<ApiResponse<{ created: number; students: number }>> {
    return apiClient.post<{ created: number; students: number }>('/fees/catalog/generate-dues', { classId: classId ?? '', asOf: asOf ?? '' })
  },
}

export const payrollService = {
  salaries(month?: number, year?: number, perPage = 500): Promise<ApiResponse<SalaryRecord[]>> {
    return apiClient.get<SalaryRecord[]>('/salary', { params: { month, year, perPage } })
  },
  markPaid(id: string): Promise<ApiResponse<SalaryRecord>> {
    return apiClient.post<SalaryRecord>(`/salary/${id}/pay`)
  },
  remove(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/salary/${id}`)
  },
  get(id: string): Promise<ApiResponse<SalaryRecord>> {
    return apiClient.get<SalaryRecord>(`/salary/${id}`)
  },
  update(id: string, input: Partial<{
    basic: number; allowance: number; deduction: number; bonus: number;
    paymentDate: string | null; notes: string; status: string;
  }>): Promise<ApiResponse<SalaryRecord>> {
    return apiClient.patch<SalaryRecord>(`/salary/${id}`, input)
  },
  /** One-click monthly sheet for every active teacher/staff. */
  generateMonth(month: number, year: number, rows?: {
    teacherId: string; basic?: number; allowance?: number;
    bonus?: number; deduction?: number;
  }[]): Promise<ApiResponse<{
    month: number; year: number; created: number; skipped: string[];
    sheets: SalaryRecord[];
  }>> {
    return apiClient.post('/salary/generate-month', { month, year, rows: rows ?? [] })
  },
  /** Draft preview for a month: master pay, leave cut, attendance, existing. */
  sheetDraft(month: number, year: number): Promise<ApiResponse<{
    month: number; year: number; rows: SheetDraftRow[];
  }>> {
    return apiClient.get('/salary/sheet-draft', { params: { month, year } })
  },
  leaves(perPage = 500): Promise<ApiResponse<LeaveRequest[]>> {
    return apiClient.get<LeaveRequest[]>('/leaves', { params: { perPage } })
  },
  applyLeave(input: {
    teacherId: string; type: string; startDate: string; endDate: string; note: string
  }) {
    return apiClient.post('/leaves', input)
  },
  setLeaveStatus(id: string, status: LeaveStatus) {
    return apiClient.patch(`/leaves/${id}`, { status })
  },
}

/** School fund ledger (money INTO / OUT OF school). */
export const ledgerService = {
  list(params?: { from?: string; to?: string; kind?: string; head?: string; search?: string }): Promise<ApiResponse<LedgerEntry[]>> {
    return apiClient.get<LedgerEntry[]>('/ledger', { params })
  },
  summary(params?: { from?: string; to?: string }): Promise<ApiResponse<LedgerSummary>> {
    return apiClient.get<LedgerSummary>('/ledger/summary', { params })
  },
  create(input: { kind: 'income' | 'expense'; head: string; amount: number; date?: string; note?: string }): Promise<ApiResponse<LedgerEntry>> {
    return apiClient.post<LedgerEntry>('/ledger', input)
  },
  remove(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/ledger/${id}`)
  },
  heads(kind?: string): Promise<ApiResponse<LedgerHead[]>> {
    return apiClient.get<LedgerHead[]>('/ledger-heads', { params: { kind } })
  },
  createHead(input: { name: string; kind: 'income' | 'expense' }): Promise<ApiResponse<LedgerHead>> {
    return apiClient.post<LedgerHead>('/ledger-heads', input)
  },
  removeHead(id: number): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/ledger-heads/${id}`)
  },
}

export const smsService = {
  templates(): Promise<ApiResponse<SmsTemplate[]>> {
    return apiClient.get<SmsTemplate[]>('/sms/templates')
  },
  createTemplate(name: string, type: string, body: string): Promise<ApiResponse<SmsTemplate>> {
    return apiClient.post<SmsTemplate>('/sms/templates', { name, type, body })
  },
  updateTemplate(id: string, input: { name?: string; type?: string; body?: string }): Promise<ApiResponse<SmsTemplate>> {
    return apiClient.put<SmsTemplate>(`/sms/templates/${id}`, input)
  },
  deleteTemplate(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/sms/templates/${id}`)
  },
  sendBulk(input: {
    body?: string
    templateId?: string
    recipients: { recipientId: string; recipientType?: string; phone?: string; variables?: Record<string, string | number> }[]
    variables?: Record<string, string | number>
    examId?: string
  }): Promise<ApiResponse<{ sent: number; failed: { recipientId: string; message: string }[] }>> {
    return apiClient.post('/sms/bulk', input)
  },
  balance(): Promise<ApiResponse<SmsBalance>> {
    return apiClient.get<SmsBalance>('/sms/balance')
  },
  logs(params?: { status?: string; search?: string }): Promise<ApiResponse<SmsLog[]>> {
    return apiClient.get<SmsLog[]>('/sms/messages', { params })
  },
}

export interface AppUserInput {
  name: string
  username: string
  password?: string
  role: AppUserRole
  phone?: string
  status?: 'active' | 'inactive'
  children?: { id: string }[]
  teacherId?: string
}

export const userService = {
  list(params?: { role?: string; status?: string; search?: string }): Promise<ApiResponse<AppUser[]>> {
    return apiClient.get<AppUser[]>('/coaching/users', { params })
  },
  create(input: AppUserInput): Promise<ApiResponse<AppUser>> {
    return apiClient.post<AppUser>('/coaching/users', input)
  },
  update(id: string, input: Partial<AppUserInput>): Promise<ApiResponse<AppUser>> {
    return apiClient.put<AppUser>(`/coaching/users/${id}`, input)
  },
  remove(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/coaching/users/${id}`)
  },
}

export const eventService = {  list(): Promise<ApiResponse<SchoolEvent[]>> {
    return apiClient.get<SchoolEvent[]>('/events')
  },
  create(input: {
    title: string; description: string; eventDate: string;
    type: SchoolEvent['type']; audience: SchoolEvent['audience']; location?: string
  }): Promise<ApiResponse<SchoolEvent>> {
    return apiClient.post<SchoolEvent>('/events', input)
  },
  update(id: string, input: Partial<{
    title: string; description: string; eventDate: string;
    type: SchoolEvent['type']; audience: SchoolEvent['audience']; location: string
  }>): Promise<ApiResponse<SchoolEvent>> {
    return apiClient.patch<SchoolEvent>(`/events/${id}`, input)
  },
  setStatus(id: string, status: SchoolEvent['status']) {
    return apiClient.patch(`/events/${id}`, { status })
  },
  remove(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/events/${id}`)
  },
}

export const settingsService = {
  /** School profile (backend gated). */
  get(): Promise<ApiResponse<SchoolSettings>> {
    return apiClient.get<SchoolSettings>('/system/config')
  },
  update(input: Partial<SchoolSettings>): Promise<ApiResponse<SchoolSettings>> {
    return apiClient.patch<SchoolSettings>('/system/config', input)
  },
}

export interface ModuleEntitlement {
  enabledModules: string[]
  suspended: boolean
}

export const modulesService = {
  /** Module entitlements — the ONLY way to toggle modules (super-admin only for writes). */
  get(): Promise<ApiResponse<ModuleEntitlement>> {
    return apiClient.get<ModuleEntitlement>('/coaching/modules')
  },
  update(enabledModules: string[]): Promise<ApiResponse<ModuleEntitlement>> {
    return apiClient.put<ModuleEntitlement>('/coaching/modules', { enabledModules })
  },
}

export const dashboardService = {
  stats(): Promise<ApiResponse<DashboardStats>> {
    return apiClient.get<DashboardStats>('/reports/overview')
  },
}

export const authService = {
  /** Change the signed-in user's own password (any role, gated by session). */
  changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<null>> {
    return apiClient.put<null>('/auth/change-password', { currentPassword, newPassword })
  },
}
