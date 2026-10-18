import { computed, isRef, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  academicService,
  attendanceService,
  authService,
  dashboardService,
  eventService,
  examService,
  ledgerService,
  modulesService,
  parentService,
  paymentService,
  payrollService,
  routineService,
  salaryTypeService,
  settingsService,
  smsService,
  studentService,
  teacherExamService,
  teacherService,
  teacherSubjectService,
  userService,
  type AppUserInput,
} from '@/services'
import type { StudentBulkRecord, StudentInput, StudentStatus, TeacherInput } from '@/types/models'
import type { ListParams } from '@/types/api'
import type { AttendanceMark, ExamStatus, ExamSubjectInput, LeaveRequest, LeaveStatus, RoutineInput, SalaryRecord, SchoolEvent, SubjectConfigInput, SubjectMarkInput, TeacherExamMarkInput } from '@/types/models'

type ParamSource = ListParams | Ref<ListParams> | (() => ListParams)

function resolveParams(source?: ParamSource): ListParams {
  if (!source) return {}
  if (typeof source === 'function') return (source as () => ListParams)()
  return isRef(source) ? (source as Ref<ListParams>).value : (source as ListParams)
}

function keyOf(base: string, source?: ParamSource) {
  return computed(() => [base, resolveParams(source)])
}

// ---------- students ----------
export function useStudents(source: ParamSource = {}) {
  return useQuery({
    queryKey: keyOf('students', source),
    queryFn: () => studentService.list(resolveParams(source)),
    placeholderData: (prev) => prev,
  })
}

export function useStudent(id: MaybeReactive<string>) {
  const key = computed(() => ['student', resolveReactive(id)])
  return useQuery({
    queryKey: key,
    queryFn: () => studentService.get(resolveReactive(id)),
    enabled: computed(() => !!resolveReactive(id)),
  })
}

export function useCreateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: StudentInput) => studentService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<StudentInput> }) =>
      studentService.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['student'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => studentService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useBulkStudents() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (records: StudentBulkRecord[]) => studentService.bulk(records),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useBulkStatusStudents() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      status: StudentStatus
      studentIds?: string[]
      classId?: string
      sectionId?: string
    }) => studentService.bulkStatus(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

export function useStudentPayments(studentId: MaybeReactive<string>) {
  const key = computed(() => ['student-payments', resolveReactive(studentId)])
  return useQuery({
    queryKey: key,
    queryFn: () => studentService.payments(resolveReactive(studentId)),
    enabled: computed(() => !!resolveReactive(studentId)),
  })
}

// ---------- teachers ----------
export function useTeachers(source: ParamSource = {}) {
  return useQuery({
    queryKey: keyOf('teachers', source),
    queryFn: () => teacherService.list(resolveParams(source)),
    placeholderData: (prev) => prev,
  })
}

/** Signed-in teacher/staff member's own linked profile (for the teacher panel). */
export function useMyTeacher() {
  return useQuery({
    queryKey: ['teachers', 'me'],
    queryFn: () => teacherService.me(),
    retry: false,
  })
}

function useTeacherInvalidator() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['teachers'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

export function useCreateTeacher() {
  const invalidate = useTeacherInvalidator()
  return useMutation({
    mutationFn: (input: TeacherInput) => teacherService.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateTeacher() {
  const invalidate = useTeacherInvalidator()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TeacherInput> }) =>
      teacherService.update(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteTeacher() {
  const invalidate = useTeacherInvalidator()
  return useMutation({
    mutationFn: (id: string) => teacherService.remove(id),
    onSuccess: invalidate,
  })
}

// ---------- salary types (payroll master, managed from Settings) ----------
export function useSalaryTypes() {
  return useQuery({ queryKey: ['salary-types'], queryFn: () => salaryTypeService.list() })
}

export function useCreateSalaryType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => salaryTypeService.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary-types'] }),
  })
}

export function useDeleteSalaryType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => salaryTypeService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary-types'] }),
  })
}

// ---------- academics ----------
export function useSessions() {
  return useQuery({ queryKey: ['sessions'], queryFn: () => academicService.sessions() })
}

export function useClasses() {
  return useQuery({ queryKey: ['classes'], queryFn: () => academicService.classes() })
}

type IdSource = string | undefined | Ref<string | undefined> | (() => string | undefined)

function resolveId(source?: IdSource): string | undefined {
  if (source === undefined) return undefined
  if (typeof source === 'function') return (source as () => string | undefined)()
  return isRef(source) ? (source as Ref<string | undefined>).value : (source as string | undefined)
}

export function useSections(source?: IdSource, withStudents?: boolean) {
  const key = computed(() => ['sections', resolveId(source) ?? 'all', withStudents ? 'nonempty' : 'all'])
  return useQuery({
    queryKey: key,
    queryFn: () => academicService.sections(resolveId(source), withStudents),
  })
}

export function useSubjects(source?: IdSource) {
  const key = computed(() => ['subjects', resolveId(source) ?? 'all'])
  return useQuery({
    queryKey: key,
    queryFn: () => academicService.subjects(resolveId(source)),
  })
}

function useAcademicInvalidator() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['sessions'] })
    qc.invalidateQueries({ queryKey: ['classes'] })
    qc.invalidateQueries({ queryKey: ['sections'] })
    qc.invalidateQueries({ queryKey: ['departments'] })
    qc.invalidateQueries({ queryKey: ['subjects'] })
  }
}

export function useCreateClass() {
  const invalidate = useAcademicInvalidator()
  return useMutation({
    mutationFn: (input: { label: string; hasDepartments?: boolean; sortOrder?: number; sections?: string[]; departments?: string[]; startTime?: string; endTime?: string }) =>
      academicService.createClass(input),
    onSuccess: invalidate,
  })
}

export function useDeleteClass() {
  const invalidate = useAcademicInvalidator()
  return useMutation({
    mutationFn: (id: string) => academicService.deleteClass(id),
    onSuccess: invalidate,
  })
}

export function useUpdateClass() {
  const invalidate = useAcademicInvalidator()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { label?: string; hasDepartments?: boolean; sortOrder?: number; startTime?: string; endTime?: string } }) =>
      academicService.updateClass(id, input),
    onSuccess: invalidate,
  })
}

export function useReorderClasses() {
  const invalidate = useAcademicInvalidator()
  return useMutation({
    mutationFn: (ids: string[]) => academicService.reorderClasses(ids),
    onSuccess: invalidate,
  })
}

export function useDepartments(classId?: IdSource) {
  const key = computed(() => ['departments', resolveId(classId) ?? 'all'])
  return useQuery({
    queryKey: key,
    queryFn: () => academicService.departments(resolveId(classId)),
  })
}

export function useCreateDepartment() {
  const invalidate = useAcademicInvalidator()
  return useMutation({
    mutationFn: ({ classId, label }: { classId: string; label: string }) =>
      academicService.createDepartment(classId, label),
    onSuccess: invalidate,
  })
}

export function useDeleteDepartment() {
  const invalidate = useAcademicInvalidator()
  return useMutation({
    mutationFn: (id: string) => academicService.deleteDepartment(id),
    onSuccess: invalidate,
  })
}

export function useCreateSection() {
  const invalidate = useAcademicInvalidator()
  return useMutation({
    mutationFn: ({ classId, label }: { classId: string; label: string }) =>
      academicService.createSection(classId, label),
    onSuccess: invalidate,
  })
}

export function useDeleteSection() {
  const invalidate = useAcademicInvalidator()
  return useMutation({
    mutationFn: (id: string) => academicService.deleteSection(id),
    onSuccess: invalidate,
  })
}

export function useCreateSession() {
  const invalidate = useAcademicInvalidator()
  return useMutation({
    mutationFn: ({ label, startDate, endDate }: { label: string; startDate: string; endDate: string }) =>
      academicService.createSession(label, startDate, endDate),
    onSuccess: invalidate,
  })
}

export function useUpdateSession() {
  const invalidate = useAcademicInvalidator()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { label?: string; startDate?: string | null; endDate?: string | null } }) =>
      academicService.updateSession(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteSession() {
  const invalidate = useAcademicInvalidator()
  return useMutation({
    mutationFn: (id: string) => academicService.deleteSession(id),
    onSuccess: invalidate,
  })
}

export function useCreateSubject() {
  const invalidate = useAcademicInvalidator()
  return useMutation({
    mutationFn: ({ classId, label, departmentId }: { classId: string | null; label: string; departmentId?: string | null }) =>
      academicService.createSubject(classId, label, departmentId),
    onSuccess: invalidate,
  })
}

export function useDeleteSubject() {
  const invalidate = useAcademicInvalidator()
  return useMutation({
    mutationFn: (id: string) => academicService.deleteSubject(id),
    onSuccess: invalidate,
  })
}

// ---------- exams / payments / dashboard ----------
export function useExams(source: ParamSource = {}) {
  return useQuery({
    queryKey: keyOf('exams', source),
    queryFn: () => examService.list(resolveParams(source)),
  })
}

export function usePayments(source: ParamSource = {}) {
  return useQuery({
    queryKey: keyOf('payments', source),
    queryFn: () => paymentService.list(resolveParams(source)),
  })
}

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: () => dashboardService.stats() })
}

// ---------- routine ----------
type MaybeReactive<T> = T | Ref<T> | (() => T)

function resolveReactive<T>(source: MaybeReactive<T>): T {
  if (typeof source === 'function') return (source as () => T)()
  return isRef(source) ? (source as Ref<T>).value : (source as T)
}

export function useRoutines(
  classId: MaybeReactive<string | undefined> = undefined,
  sectionId: MaybeReactive<string | null | undefined> = undefined,
  routineType: MaybeReactive<'class' | 'exam' | undefined> = undefined,
) {
  const key = computed(() => ['routines', resolveReactive(classId) ?? 'all', resolveReactive(sectionId) ?? 'all', resolveReactive(routineType) ?? 'all'])
  return useQuery({
    queryKey: key,
    queryFn: () => routineService.list(resolveReactive(classId), resolveReactive(sectionId), resolveReactive(routineType)),
    placeholderData: (prev) => prev,
  })
}

export function useCreateRoutine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RoutineInput) => routineService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routines'] }),
  })
}

export function useUpdateRoutine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RoutineInput }) => routineService.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routines'] }),
  })
}

export function useRoutine(id: MaybeReactive<string>) {
  const key = computed(() => ['routine', resolveReactive(id)])
  return useQuery({
    queryKey: key,
    queryFn: () => routineService.get(resolveReactive(id)),
    enabled: computed(() => !!resolveReactive(id)),
  })
}

export function useDeleteRoutine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => routineService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routines'] }),
  })
}

/** Who is assigned to teach one subject (routine form suggestion). */
export function useSubjectTeachers(subjectId: MaybeReactive<string | null | undefined>) {
  const key = computed(() => ['subject-teachers', resolveReactive(subjectId) ?? 'none'])
  return useQuery({
    queryKey: key,
    queryFn: () => teacherSubjectService.listBySubject(resolveReactive(subjectId) as string),
    enabled: computed(() => !!resolveReactive(subjectId)),
  })
}

/** All subject assignments of one class (teacher names in subject dropdown). */
export function useClassSubjectTeachers(classId: MaybeReactive<string | null | undefined>) {
  const key = computed(() => ['class-subject-teachers', resolveReactive(classId) ?? 'none'])
  return useQuery({
    queryKey: key,
    queryFn: () => teacherSubjectService.listByClass(resolveReactive(classId) as string),
    enabled: computed(() => !!resolveReactive(classId)),
  })
}

// ---------- attendance ----------
export function useStudentAttendance(
  date: MaybeReactive<string>,
  classId: MaybeReactive<string>,
  sectionId: MaybeReactive<string | null>,
  departmentId: MaybeReactive<string | null> = null,
) {
  const key = computed(() => [
    'attendance',
    resolveReactive(date),
    resolveReactive(classId),
    resolveReactive(sectionId),
    resolveReactive(departmentId) ?? '',
  ])
  return useQuery({
    queryKey: key,
    queryFn: () =>
      attendanceService.student(resolveReactive(date), resolveReactive(classId), resolveReactive(sectionId), resolveReactive(departmentId)),
    enabled: computed(() => !!resolveReactive(date) && !!resolveReactive(classId)),
  })
}

export function useSaveStudentAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      date, classId, sectionId, marks, departmentId,
    }: {
      date: string; classId: string; sectionId: string | null; marks: AttendanceMark[]; departmentId?: string | null
    }) => attendanceService.saveStudent(date, classId, sectionId, marks, departmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] })
      qc.invalidateQueries({ queryKey: ['attendance-recent'] })
      qc.invalidateQueries({ queryKey: ['attendance-summary'] })
      qc.invalidateQueries({ queryKey: ['attendance-history'] })
      qc.invalidateQueries({ queryKey: ['attendance-report'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useStudentAttendanceHistory(studentId: MaybeReactive<string>) {
  const key = computed(() => ['attendance-history', resolveReactive(studentId)])
  return useQuery({
    queryKey: key,
    queryFn: () => attendanceService.history(resolveReactive(studentId)),
    enabled: computed(() => !!resolveReactive(studentId)),
  })
}

/** Live feed for the dashboard: latest records, auto-refreshed. */
export function useRecentAttendance(limit = 10, refetchMs = 15000) {
  return useQuery({
    queryKey: ['attendance-recent', limit],
    queryFn: () => attendanceService.recent(limit),
    refetchInterval: refetchMs,
    refetchIntervalInBackground: true,
  })
}

export interface AttendanceReportParams {
  classId?: string
  sectionId?: string | null
  departmentId?: string | null
  from?: string
  to?: string
}

export function useAttendanceReport(params: MaybeReactive<AttendanceReportParams>) {
  const key = computed(() => ['attendance-report', { ...resolveReactive(params) }])
  return useQuery({
    queryKey: key,
    queryFn: () => {
      const p = resolveReactive(params)
      return attendanceService.report({
        classId: p.classId || undefined,
        sectionId: p.sectionId ?? undefined,
        departmentId: p.departmentId ?? undefined,
        from: p.from || undefined,
        to: p.to || undefined,
      })
    },
  })
}

export function useAttendanceSummary(
  classId: MaybeReactive<string | undefined> = undefined,
  sectionId: MaybeReactive<string | null | undefined> = undefined,
  departmentId: MaybeReactive<string | null | undefined> = undefined,
) {
  const key = computed(() => [
    'attendance-summary',
    resolveReactive(classId) ?? 'all',
    resolveReactive(sectionId) ?? 'all',
    resolveReactive(departmentId) ?? 'all',
  ])
  return useQuery({
    queryKey: key,
    queryFn: () => attendanceService.summary(resolveReactive(classId), resolveReactive(sectionId), resolveReactive(departmentId)),
  })
}

export function useStaffAttendance(date: MaybeReactive<string>) {
  const key = computed(() => ['staff-attendance', resolveReactive(date)])
  return useQuery({
    queryKey: key,
    queryFn: () => attendanceService.staff(resolveReactive(date)),
    enabled: computed(() => !!resolveReactive(date)),
  })
}

/** One date's whole-school sheet for the Recent Summary drill-down. */
export function useAttendanceDay(date: MaybeReactive<string | null>) {
  const key = computed(() => ['attendance-day', resolveReactive(date)])
  return useQuery({
    queryKey: key,
    queryFn: () => attendanceService.day(resolveReactive(date) as string),
    enabled: computed(() => !!resolveReactive(date)),
    placeholderData: (prev) => prev,
  })
}

export function useSaveStaffAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ date, marks }: { date: string; marks: { teacherId: string; status: AttendanceMark['status']; entryTime?: string; exitTime?: string }[] }) =>
      attendanceService.saveStaff(date, marks),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-attendance'] }),
  })
}

export function useTapAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, at, date }: { cardId: string; at?: string; date?: string }) =>
      attendanceService.tap(cardId, at, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] })
      qc.invalidateQueries({ queryKey: ['attendance-recent'] })
      qc.invalidateQueries({ queryKey: ['attendance-summary'] })
      qc.invalidateQueries({ queryKey: ['attendance-history'] })
      qc.invalidateQueries({ queryKey: ['attendance-report'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useCloseAttendanceDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ date, classId, sectionId, departmentId }: { date: string; classId?: string; sectionId?: string | null; departmentId?: string | null }) =>
      attendanceService.closeDay(date, classId, sectionId, departmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] })
      qc.invalidateQueries({ queryKey: ['attendance-recent'] })
      qc.invalidateQueries({ queryKey: ['attendance-summary'] })
      qc.invalidateQueries({ queryKey: ['attendance-history'] })
      qc.invalidateQueries({ queryKey: ['attendance-report'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// ---------- exams & results ----------
export function useExam(id: MaybeReactive<string>) {
  const key = computed(() => ['exam', resolveReactive(id)])
  return useQuery({
    queryKey: key,
    queryFn: () => examService.get(resolveReactive(id)),
    enabled: computed(() => !!resolveReactive(id)),
  })
}

export function useCreateExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      name: string; examDate: string; classId: string; sectionId: string | null;
      departmentId?: string | null;
      subjects?: ExamSubjectInput[]
      includeCommon?: boolean
    }) => examService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  })
}

export function useUpdateExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: {
      id: string; input: { name?: string; examDate?: string; subjects?: ExamSubjectInput[] }
    }) => examService.update(id, input),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['exams'] })
      qc.invalidateQueries({ queryKey: ['exam', vars.id] })
      qc.invalidateQueries({ queryKey: ['result-entries'] })
      qc.invalidateQueries({ queryKey: ['exam-results'] })
    },
  })
}

export function useExamStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ExamStatus }) => examService.setStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] })
      qc.invalidateQueries({ queryKey: ['exam'] })
    },
  })
}

export function useDeleteExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => examService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  })
}

/** Admin fallback: fill/replace one subject row in place (pre-publish). */
export function usePatchExamSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, subjectId, input }: { id: string; subjectId: string; input: SubjectConfigInput }) =>
      examService.patchSubject(id, subjectId, input),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['exams'] })
      qc.invalidateQueries({ queryKey: ['exam', vars.id] })
    },
  })
}

// ---------- teacher panel: own exam subjects + marks ----------
export function useTeacherExams(enabled: MaybeReactive<boolean> = true) {
  return useQuery({
    queryKey: ['teacher-exams'],
    queryFn: () => teacherExamService.list(),
    enabled: computed(() => resolveReactive(enabled)),
  })
}

export function useTeacherExam(id: MaybeReactive<string>) {
  const key = computed(() => ['teacher-exam', resolveReactive(id)])
  return useQuery({
    queryKey: key,
    queryFn: () => teacherExamService.get(resolveReactive(id)),
    enabled: computed(() => !!resolveReactive(id)),
  })
}

export function useSaveTeacherSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ examId, subjectId, input }: { examId: string; subjectId: string; input: SubjectConfigInput }) =>
      teacherExamService.saveSubject(examId, subjectId, input),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['teacher-exams'] })
      qc.invalidateQueries({ queryKey: ['teacher-exam', vars.examId] })
    },
  })
}

export function useSaveTeacherMarks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ examId, subjectId, marks }: { examId: string; subjectId: string; marks: TeacherExamMarkInput[] }) =>
      teacherExamService.saveMarks(examId, subjectId, marks),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['teacher-exam', vars.examId] })
    },
  })
}

export function useResultEntries(examId: MaybeReactive<string>) {
  const key = computed(() => ['result-entries', resolveReactive(examId)])
  return useQuery({
    queryKey: key,
    queryFn: () => examService.entries(resolveReactive(examId)),
    enabled: computed(() => !!resolveReactive(examId)),
  })
}

export function useSaveResultEntries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ examId, entries }: { examId: string; entries: { studentId: string; marks: SubjectMarkInput[] }[] }) =>
      examService.saveEntries(examId, entries),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['result-entries', vars.examId] })
      qc.invalidateQueries({ queryKey: ['exam-results', vars.examId] })
    },
  })
}

export function useExamResults(examId: MaybeReactive<string>) {
  const key = computed(() => ['exam-results', resolveReactive(examId)])
  return useQuery({
    queryKey: key,
    queryFn: () => examService.results(resolveReactive(examId)),
    enabled: computed(() => !!resolveReactive(examId)),
  })
}

// ---------- payments ----------
export function useDues() {
  return useQuery({ queryKey: ['dues'], queryFn: () => paymentService.dues() })
}

export function useFeeStructure(classId: MaybeReactive<string>, departmentId: MaybeReactive<string | null>, merged: MaybeReactive<boolean> = false) {
  const key = computed(() => ['fee-structure', resolveReactive(classId) || '', resolveReactive(departmentId) ?? '', !!resolveReactive(merged)])
  return useQuery({
    queryKey: key,
    queryFn: () => paymentService.feeStructure(resolveReactive(classId), resolveReactive(departmentId), !!resolveReactive(merged)),
    enabled: computed(() => !!resolveReactive(classId)),
  })
}

export function useFeeStructuresOverview() {
  return useQuery({
    queryKey: ['fee-structure', 'overview'],
    queryFn: () => paymentService.feeStructuresOverview(),
  })
}

export function useSaveFeeStructure() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, departmentId, fees }: { classId: string; departmentId: string | null; fees: { feeType: string; amount: number }[] }) =>
      paymentService.saveFeeStructure(classId, departmentId, fees),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fee-structure'] })
    },
  })
}

export function useFeeCatalog(classId: MaybeReactive<string>, departmentId: MaybeReactive<string | null>, merged: MaybeReactive<boolean> = false) {
  const key = computed(() => ['fee-catalog', resolveReactive(classId) || '', resolveReactive(departmentId) ?? '', !!resolveReactive(merged)])
  return useQuery({
    queryKey: key,
    queryFn: () => paymentService.feeCatalog(resolveReactive(classId), resolveReactive(departmentId), !!resolveReactive(merged)),
    enabled: computed(() => !!resolveReactive(classId)),
  })
}

export function useFeeCatalogOverview() {
  return useQuery({
    queryKey: ['fee-catalog', 'overview'],
    queryFn: () => paymentService.feeCatalogOverview(),
  })
}

export function useSaveFeeCatalog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, departmentId, fees }: { classId: string; departmentId: string | null; fees: { id?: string; name: string; amount: number; cycleDays?: number; isActive?: boolean }[] }) =>
      paymentService.saveFeeCatalog(classId, departmentId, fees),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fee-catalog'] })
      qc.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

export function useDeleteFeeCatalogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => paymentService.deleteFeeCatalogItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fee-catalog'] })
    },
  })
}

export function useGenerateDues() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, asOf }: { classId?: string; asOf?: string }) =>
      paymentService.generateDues(classId, asOf),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['dues'] })
      qc.invalidateQueries({ queryKey: ['fee-catalog'] })
    },
  })
}
export function useFeeHeads() {
  return useQuery({ queryKey: ['fee-heads'], queryFn: () => paymentService.feeHeads() })
}

export function useCreateFeeHead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (label: string) => paymentService.createFeeHead(label),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fee-heads'] })
      qc.invalidateQueries({ queryKey: ['fee-structure'] })
    },
  })
}

export function useDeleteFeeHead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (key: string) => paymentService.deleteFeeHead(key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fee-heads'] })
      qc.invalidateQueries({ queryKey: ['fee-structure'] })
    },
  })
}

export function useCollectPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
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
    }) => paymentService.collect(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['dues'] })
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeletePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => paymentService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['dues'] })
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useBulkPayments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { records: { studentId: string; feeType: string; amount: number; discount: number; paid: number; paymentMethod?: string; paymentDate?: string; collectorName?: string; notes?: string }[] }) =>
      paymentService.bulk(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['dues'] })
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentService.paymentMethods(),
  })
}

export function useReceipt(id: MaybeReactive<string>) {
  const key = computed(() => ['receipt', resolveReactive(id)])
  return useQuery({
    queryKey: key,
    queryFn: () => paymentService.receipt(resolveReactive(id)),
    enabled: computed(() => !!resolveReactive(id)),
  })
}

// ---------- payroll ----------
export function useSalaries(month?: MaybeReactive<number | undefined>, year?: MaybeReactive<number | undefined>) {
  return useQuery({
    queryKey: computed(() => ['salaries', resolveReactive(month) ?? 'all', resolveReactive(year) ?? 'all']),
    queryFn: async () => {
      const res = await payrollService.salaries(resolveReactive(month), resolveReactive(year))
      // List endpoint envelopes rows as {items, pagination} — unwrap so
      // consumers always get a plain array.
      const raw = res.data as unknown
      const items = Array.isArray(raw)
        ? raw
        : (raw as { items?: SalaryRecord[] } | null)?.items ?? []
      return { ...res, data: items }
    },
  })
}

export function useDeleteSalary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => payrollService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salaries'] }),
  })
}

export function useSalary(id: MaybeReactive<string>) {
  return useQuery({
    queryKey: computed(() => ['salary', resolveReactive(id)]),
    queryFn: () => payrollService.get(resolveReactive(id)),
    enabled: computed(() => !!resolveReactive(id)),
  })
}

export function useUpdateSalary(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof payrollService.update>[1]) =>
      payrollService.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salary', id] })
      qc.invalidateQueries({ queryKey: ['salaries'] })
    },
  })
}

export function useGenerateMonth() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ month, year, rows }: {
      month: number; year: number;
      rows?: { teacherId: string; basic?: number; allowance?: number; bonus?: number; deduction?: number }[]
    }) => payrollService.generateMonth(month, year, rows),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salaries'] }),
  })
}

// ---------- school fund ledger ----------
export function useLedger(source: ParamSource = {}) {
  return useQuery({
    queryKey: keyOf('ledger', source),
    queryFn: () => ledgerService.list(resolveParams(source)),
    placeholderData: (prev) => prev,
  })
}

export function useLedgerSummary(source: ParamSource = {}) {
  return useQuery({
    queryKey: keyOf('ledger-summary', source),
    queryFn: () => ledgerService.summary(resolveParams(source)),
    placeholderData: (prev) => prev,
  })
}

function useLedgerInvalidator() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['ledger'] })
    qc.invalidateQueries({ queryKey: ['ledger-summary'] })
  }
}

export function useCreateLedgerEntry() {
  const invalidate = useLedgerInvalidator()
  return useMutation({
    mutationFn: (input: { kind: 'income' | 'expense'; head: string; amount: number; date?: string; note?: string }) =>
      ledgerService.create(input),
    onSuccess: invalidate,
  })
}

export function useDeleteLedgerEntry() {
  const invalidate = useLedgerInvalidator()
  return useMutation({
    mutationFn: (id: string) => ledgerService.remove(id),
    onSuccess: invalidate,
  })
}

export function useLedgerHeads(kind: MaybeReactive<string | undefined> = undefined) {
  return useQuery({
    queryKey: computed(() => ['ledger-heads', resolveReactive(kind) ?? 'all']),
    queryFn: () => ledgerService.heads(resolveReactive(kind)),
  })
}
export function useCreateLedgerHead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; kind: 'income' | 'expense' }) =>
      ledgerService.createHead(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ledger-heads'] }),
  })
}
export function useDeleteLedgerHead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => ledgerService.removeHead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ledger-heads'] }),
  })
}
export function usePaySalary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => payrollService.markPaid(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salaries'] }),
  })
}

export function useLeaves() {
  return useQuery({
    queryKey: ['leaves'],
    queryFn: async () => {
      const res = await payrollService.leaves()
      // List endpoint envelopes rows as {items, pagination} — unwrap so
      // consumers always get a plain array (same as salaries).
      const raw = res.data as unknown
      const items = Array.isArray(raw)
        ? raw
        : (raw as { items?: LeaveRequest[] } | null)?.items ?? []
      return { ...res, data: items }
    },
  })
}

export function useApplyLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      teacherId: string; type: string; startDate: string; endDate: string; note: string
    }) => payrollService.applyLeave(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  })
}

export function useLeaveStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeaveStatus }) =>
      payrollService.setLeaveStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  })
}

// ---------- sms & events ----------
export function useSmsTemplates() {
  return useQuery({ queryKey: ['sms-templates'], queryFn: () => smsService.templates() })
}

export function useCreateSmsTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, type, body }: { name: string; type: string; body: string }) =>
      smsService.createTemplate(name, type, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sms-templates'] }),
  })
}

export function useDeleteSmsTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => smsService.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sms-templates'] }),
  })
}

export function useUpdateSmsTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; type?: string; body?: string } }) =>
      smsService.updateTemplate(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sms-templates'] }),
  })
}

export function useSendBulkSms() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      body?: string
      templateId?: string
      recipients: { recipientId: string; recipientType?: string; phone?: string; variables?: Record<string, string | number> }[]
      variables?: Record<string, string | number>
      examId?: string
    }) => smsService.sendBulk(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sms-logs'] })
      qc.invalidateQueries({ queryKey: ['sms-balance'] })
    },
  })
}

export function useSmsBalance() {
  return useQuery({ queryKey: ['sms-balance'], queryFn: () => smsService.balance() })
}

export function useSmsLogs(source: ParamSource = {}) {
  return useQuery({
    queryKey: keyOf('sms-logs', source),
    queryFn: () => smsService.logs(resolveParams(source)),
  })
}

export function useEvents() {
  return useQuery({ queryKey: ['events'], queryFn: () => eventService.list() })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      title: string; description: string; eventDate: string;
      type: SchoolEvent['type']; audience: SchoolEvent['audience']; location?: string
    }) => eventService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useEventStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SchoolEvent['status'] }) =>
      eventService.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: {
      id: string
      input: Partial<{
        title: string; description: string; eventDate: string;
        type: SchoolEvent['type']; audience: SchoolEvent['audience']; location: string
      }>
    }) => eventService.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => eventService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

// ---------- user logins (admin-managed: teacher / accountant / parent) ----------
export function useAppUsers(source: MaybeReactive<{ role?: string; status?: string; search?: string }> = {}) {
  return useQuery({
    queryKey: computed(() => {
      const p = resolveReactive(source)
      return ['app-users', p.role ?? '', p.status ?? '', p.search ?? '']
    }),
    queryFn: () => userService.list(resolveReactive(source)),
  })
}

export function useCreateAppUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AppUserInput) => userService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-users'] }),
  })
}

export function useUpdateAppUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AppUserInput> }) =>
      userService.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-users'] }),
  })
}

export function useDeleteAppUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => userService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-users'] }),
  })
}

// ---------- parent portal ----------
export function useParentResults(studentId: MaybeReactive<string>) {
  const key = computed(() => ['parent-results', resolveReactive(studentId)])
  return useQuery({
    queryKey: key,
    queryFn: () => parentService.results(resolveReactive(studentId)),
    enabled: computed(() => !!resolveReactive(studentId)),
  })
}

/**
 * Distinct published exams across the signed-in parent's children.
 *
 * The dashboard's "Published Results" card used to count rows from
 * GET /results, an admin-only endpoint — the parent query always failed
 * into a silent 0. The count now comes from the scoped /parent/results
 * rows themselves.
 */
export function useParentPublishedResults() {
  return useQuery({
    queryKey: ['parent-published-results'],
    queryFn: async () => {
      const childRes = await studentService.list({ perPage: 500 })
      const children = childRes.data?.items ?? []
      const settled = await Promise.allSettled(
        children.map((child) => parentService.results(child.id)),
      )
      const examIds = new Set<string>()
      for (const entry of settled) {
        if (entry.status !== 'fulfilled') continue
        for (const row of entry.value.data ?? []) examIds.add(row.examId)
      }
      return { count: examIds.size }
    },
  })
}

// ---------- settings (super-admin only for writes) ----------
export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: () => settingsService.get() })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof settingsService.update>[0]) => settingsService.update(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['school-modules'] })
    },
  })
}

// ---------- own password (any signed-in role) ----------
export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authService.changePassword(currentPassword, newPassword),
  })
}

// ---------- module entitlements (super-admin only for writes) ----------
export function useModules() {
  return useQuery({ queryKey: ['module-entitlements'], queryFn: () => modulesService.get() })
}

export function useUpdateModules() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (enabledModules: string[]) => modulesService.update(enabledModules),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['module-entitlements'] })
      qc.invalidateQueries({ queryKey: ['school-modules'] })
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}
