export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'accountant' | 'parent' | 'student' | 'monitor'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface AcademicSession {
  id: string
  label: string
  startDate: string
  endDate: string
  isActive: boolean
}

/** A class (e.g. "Class 6") — defined once, shared by every session. */
export interface SchoolClass {
  id: string
  label: string
  /** Whether the class splits into departments (Science/Arts/Commerce). */
  hasDepartments: boolean
}

/** A department/group inside one class (Science, Arts, Commerce). */
export interface Department {
  id: string
  classId: string
  label: string
  isActive: boolean
}

export interface Section {
  id: string
  classId: string
  label: string
  isActive: boolean
}

/** Static section labels picked at admit time — no per-class setup needed. */
export const SECTION_OPTIONS = ['A', 'B', 'C', 'D']

/** One fee head inside a class/department fee structure (legacy matrix). */
export interface FeeStructureRow {
  feeType: string
  amount: number
}

export interface FeeStructureOverviewRow {
  classId: string
  classLabel: string
  departmentId: string | null
  department: string
  feeType: string
  amount: number
}

/** A fee head defined by the school in Academic Setup (legacy global list). */
export interface FeeHead {
  key: string
  label: string
  isActive: boolean
}

/** A named fee under one class — the Fee Head matrix replacement.
 * cycleDays 0 = one-time, >0 = repeats every N days (30 ~= monthly).
 */
export interface FeeCatalogItem {
  id: string
  classId: string
  classLabel: string
  departmentId: string | null
  department: string
  name: string
  amount: number
  cycleDays: number
  isActive: boolean
}

/** One accrued due row on a student (admission snapshot + cycle dues). */
export interface StudentFeeDue {
  name: string
  amount: number
  dueFor: string
  source: 'admission' | 'cycle' | 'manual'
  feeItemId: string
}

export interface Subject {
  id: string
  classId: string | null
  /** Department inside the class, or null = common to every department. */
  departmentId: string | null
  /** Department label ("" when common) — read-only info. */
  department: string
  label: string
  category: 'subject' | 'admission' | 'other'
  amount: number
}

export type StudentStatus = 'active' | 'inactive'

/** Payload for admitting / updating a student (live backend shape). */
export interface StudentInput {
  name: string
  /** Physical ID-card number for reader attendance ("" = no card yet). */
  cardId?: string
  gender: string
  phone: string
  address: string
  roll: string
  classId: string
  sectionId: string | null
  departmentId?: string | null
  /** Subject labels the student takes (no price — school rule). */
  subjects?: string[]
  /** Per-name charge snapshot (admit-time editable amounts). */
  feeBreakdown?: Record<string, number>
  /** Per-cycle due rows (admission + accrued monthly dues). */
  feeDues?: StudentFeeDue[]
  guardianName?: string
  guardianPhone?: string
  guardianPhone2?: string
  dateOfBirth?: string | null
  instituteName?: string
  totalAmount: number
  paidAmount: number
  status: 'active' | 'inactive'
}

/** Payload for adding / updating a teacher (live backend shape). */
export interface TeacherInput {
  name: string
  phone: string
  designation: string
  joiningDate: string
  /** Teacher or Staff. */
  kind?: 'teacher' | 'staff'
  /** Card / finger-reader ID ("" = none assigned). */
  cardId?: string
  /** Salary-type master id ("" = Monthly default). */
  payTypeId?: string
  basicSalary?: number
  extraAllowance?: number
  overtimeRate?: number
  pfPercent?: number
  loanDeduction?: number
  workingDays?: number
  /** Per-day salary override (0/undefined = auto). */
  perDaySalary?: number
  status?: 'active' | 'inactive'
}

export interface Student {
  id: string
  name: string
  cardId: string
  /** ISO timestamp of the current card issue ("" = none). */
  cardAssignedAt?: string
  gender: string
  phone: string
  address: string
  roll: string
  sessionId: string
  classId: string
  sectionId: string | null
  departmentId: string | null
  guardianName: string
  guardianPhone: string
  guardianPhone2: string
  dateOfBirth: string | null
  instituteName: string
  /** Selected subjects {label: amount} — amount always 0 (school rule). */
  subjects: Record<string, number>
  /** Per-name charges from admission (empty = legacy unallocated total). */
  feeBreakdown: Record<string, number>
  /** Per-cycle due rows (admission + accrued monthly dues). */
  feeDues: StudentFeeDue[]
  totalAmount: number
  paidAmount: number
  dueAmount: number
  status: StudentStatus
  /** Stored relative path ("" = none). Set only through the photo upload. */
  photo?: string
  /** Backend image URL (/media/...) — what <img> loads. */
  photoUrl?: string
}

export interface Teacher {
  id: string
  name: string
  phone: string
  designation: string
  joiningDate: string
  /** Teacher or Staff. */
  kind?: 'teacher' | 'staff'
  /** Card / finger-reader ID ("" = none assigned). */
  cardId?: string
  /** Stored relative path ("" = none). */
  photo?: string
  /** Backend image URL (/media/...) — what <img> loads. */
  photoUrl?: string
  /** Salary-type master id ("" = none). */
  payTypeId?: string
  /** Salary-type master name (e.g. Monthly). */
  payType?: string
  basicSalary?: string
  extraAllowance?: string
  overtimeRate?: string
  pfPercent?: string
  loanDeduction?: string
  workingDays?: number
  /** Per-day salary override (""/0 = auto). */
  perDaySalary?: string
  status?: string
}

/** Payroll master row: salary types managed from Settings. */
export interface SalaryType {
  id: string
  name: string
  description?: string
}

/** Direct teacher-subject mapping row. */
export interface TeacherSubject {
  id: string
  teacherId: string
  subjectId: string
  subjectLabel: string
  classId: string | null
  classLabel: string
  department: string
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'holiday'

export interface StudentAttendance {
  id: string
  studentId: string
  studentName?: string
  roll?: number | null
  classId: string
  classLabel?: string
  sectionId: string | null
  date: string
  status: AttendanceStatus
  entryTime?: string
  exitTime?: string
  createdAt?: string
}

export type ExamStatus = 'draft' | 'active' | 'published' | 'completed'

export interface Exam {
  id: string
  name: string
  examDate: string
  classId: string
  sectionId: string | null
  departmentId?: string | null
  fullMarks: number
  passMarks: number
  status: ExamStatus
  subjects: ExamSubject[]
}

export interface ExamSubject {
  id: string
  name: string
  fullMarks: number
  passMarks: number
  cqFull: number
  cqPass: number
  mcqFull: number
  mcqPass: number
  passRule: 'separate' | 'combine'
  hasSplit: boolean
}

export interface ExamSubjectInput {
  name: string
  fullMarks: number
  passMarks: number
  cqFull?: number
  cqPass?: number
  mcqFull?: number
  mcqPass?: number
  passRule?: 'separate' | 'combine'
}

export interface ResultEntry {
  id: string
  examId: string
  studentId: string
  studentName: string
  marksObtained: number
  grade: string
}

export interface SubjectMarkInput {
  subjectId?: string
  name?: string
  cq?: number
  mcq?: number
  total?: number
  absent?: boolean
}

export interface StudentSubjectMarks {
  studentId: string
  studentName: string
  roll?: number | null
  subjects: {
    subjectId: string
    name: string
    cq: number
    mcq: number
    total: number
    absent: boolean
    entered: boolean
  }[]
}

export type PaymentStatus = 'paid' | 'pending' | 'partial' | 'cancelled'

export interface Payment {
  id: string
  studentId: string
  studentName: string
  /** Fee name (free text — old receipts store head keys like "admission"). */
  feeType: string
  /** New-write alias of feeType (feeName preferred). */
  feeName?: string
  amount: number
  discount: number
  paid: number
  due: number
  status: PaymentStatus
  receiptNumber: string
  paymentDate: string
  paymentMethod: string
  collectorName: string
  notes: string
  /** Multi-name split — one receipt, per-name attribution. Empty = legacy. */
  breakdown: { feeType: string; feeName?: string; dueFor?: string; amount: number; paid: number }[]
}

export interface PaymentMethodOption {
  id: string
  label: string
  value: string
}

export interface DashboardStats {
  totalStudents: number
  totalTeachers: number
  presentToday: number
  duesAmount: number
}

// ---------- routine ----------
export type WeekDay = 'Sat' | 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'

export const WEEK_DAYS: WeekDay[] = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export interface Routine {
  id: string
  classId: string
  sectionId: string | null
  subjectId: string | null
  subjectLabel: string
  /** All subjects this slot covers (primary first). */
  subjects: string[]
  teacherId: string | null
  /** All teachers (primary first). */
  teacherIds: string[]
  teacherName: string
  room: string
  title: string
  day: WeekDay
  date: string
  startTime: string
  endTime: string
  status: 'active' | 'inactive'
  routineType: 'class' | 'exam'
}

export interface RoutineInput {
  classId: string
  sectionId: string | null
  subjectId: string | null
  subjectLabel: string
  subjects?: string[]
  teacherId: string | null
  teacherIds?: string[]
  teacherName: string
  room: string
  title?: string
  day: WeekDay
  /** Class mode: same period on several weekdays (one row per day). */
  days?: WeekDay[]
  date?: string
  startTime: string
  endTime: string
  status?: 'active' | 'inactive'
  routineType?: 'class' | 'exam'
}

// ---------- attendance ----------
export interface AttendanceMark {
  studentId: string
  status: AttendanceStatus
  entryTime?: string
  exitTime?: string
  /** Present on history rows (roster marks carry no date). */
  date?: string
}

export interface StaffAttendance {
  id: string
  teacherId: string
  teacherName: string
  date: string
  status: AttendanceStatus
  entryTime?: string
  exitTime?: string
}

/** Per-student attendance report row (report tab). */
export interface StudentAttendanceSummary {
  studentId: string
  studentName: string
  roll: number | null
  classLabel: string
  present: number
  late: number
  absent: number
  leave: number
  total: number
  percentage: number
  hasRecord: boolean
}

// ---------- payroll ----------
export type SalaryStatus = 'pending' | 'paid'

export interface SalaryRecord {
  id: string
  teacherId: string
  teacherName: string
  month: number
  year: number
  basic: number
  allowance: number
  deduction: number
  bonus?: number
  grossSalary?: number
  net: number
  status: SalaryStatus
  paymentDate?: string | null
  attendanceDays?: number
  presentDays?: number
  absentDays?: number
  lateDays?: number
  notes?: string
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected'

/** One draft row for the monthly sheet preview. */export interface SheetDraftRow {
  teacherId: string
  teacherName: string
  kind: string
  basic: number
  allowance: number
  perDay: number
  present: number
  absent: number
  late: number
  leaveDays: number
  leaveDeduction: number
  existingSheetId: string
  existingStatus: string
  existingNet: number
}

export interface LeaveRequest {
  id: string
  teacherId: string
  teacherName: string
  type: string
  startDate: string
  endDate: string
  days: number
  status: LeaveStatus
  note: string
}

// ---------- user logins (teacher / accountant / parent) ----------
export type AppUserRole = 'teacher' | 'accountant' | 'parent'
export interface AppUserChild {
  id: string
  name: string
  roll: string
}
export interface AppUser {
  id: string
  role: string
  name: string
  username: string
  phone: string
  profileId: string
  /** Linked Teacher/Staff public id (teacher role only). */
  teacherId?: string
  status: 'active' | 'inactive'
  lastLogin: string
  createdAt: string
  updatedAt: string
  children: AppUserChild[]
}

// ---------- communication ----------
export interface SmsTemplate {
  id: string
  name: string
  type: string
  body: string
  variables?: string[]
}

export interface SmsBalance {
  total: number
  used: number
  remaining: number
}

export interface SmsLog {
  id: string
  templateId?: string
  templateName: string
  templateType?: string
  examName?: string
  audience: string
  recipientName?: string
  phone?: string
  count: number
  message: string
  status?: string
  sentAt: string
}

export type EventStatus = 'draft' | 'published' | 'archived'

export interface SchoolEvent {
  id: string
  title: string
  description: string
  eventDate: string
  location?: string
  type: 'news' | 'event' | 'exam' | 'meeting' | 'notice'
  // No panel for students — guardians (parents) cover them.
  audience: 'all' | 'teachers' | 'parents'
  status: EventStatus
}

// ---------- settings ----------
export interface HolidaySpan {
  from: string
  to: string
  label: string
}

export interface SchoolSettings {
  schoolName: string
  address: string
  phone: string
  /** Daily routine as "HH:MM" (24-hour); blank = not set. Admin-editable. */
  schoolStartTime: string
  schoolEndTime: string
  /** Tap at/after this is late; blank = start time. Admin-editable. */
  lateTime: string
  /** Fresh-card processing minutes (super-admin only, 0 = off). */
  cardCooldownMinutes: number
  /** Weekly holidays as weekday codes, e.g. ["Fri"]. */
  weeklyHolidays: string[]
  /** Fixed breaks: {from: YYYY-MM-DD, to?: YYYY-MM-DD, label}. */
  holidays: HolidaySpan[]
  resultSmsMode: 'after_publish' | 'per_student'
  /** Card-tap auto SMS toggles (super-admin only). */
  entrySmsEnabled: boolean
  exitSmsEnabled: boolean
  enabledModules: string[]
}

/** School fund ledger entry (money INTO / OUT OF school). */
export interface LedgerEntry {
  id: string
  date: string
  kind: 'income' | 'expense'
  head: string
  amount: number
  refType: string
  note: string
}

/** School fund summary. */
export interface LedgerSummary {
  totalIn: number
  totalOut: number
  balance: number
  openingBalance: number
  closingBalance: number
  count: number
  byHead: { head: string; kind: string; amount: number; count: number }[]
  byMonth: { month: string; income: number; expense: number }[]
}

/** Income / expense head master. */
export interface LedgerHead {
  id: number
  name: string
  kind: 'income' | 'expense'
}
