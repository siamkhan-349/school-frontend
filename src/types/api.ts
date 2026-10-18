/** Shared API envelope — every endpoint MUST return this shape. */
export interface ApiResponse<T> {
  success: true
  message: string
  data: T
}

export interface ApiError {
  success: false
  message: string
  errors?: Record<string, string[]>
}

export interface Pagination {
  page: number
  perPage: number
  total: number
}

export interface PaginatedData<T> {
  items: T[]
  pagination: Pagination
}

export interface ListParams {
  page?: number
  perPage?: number
  search?: string
  gender?: string
  hasCard?: string
  classId?: string
  sectionId?: string
  sessionId?: string
  departmentId?: string
  feeType?: string
  status?: string
  from?: string
  to?: string
  studentId?: string
  ordering?: string
  kind?: string
  head?: string
}
