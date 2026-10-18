import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'

import type { ApiError, ApiResponse } from '@/types/api'
import { clearStoredTokens, getAccessToken, getRefreshToken, saveTokens } from './tokenStore'

function emitSessionExpired(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('school:session-expired'))
}

/**
 * Single axios facade for backend calls.
 * Base URL comes ONLY from VITE_API_BASE_URL (see .env).
 */
export class ApiClient {
  private instance: AxiosInstance
  private refreshPromise: Promise<string | null> | null = null

  constructor(baseURL: string = import.meta.env.VITE_API_BASE_URL ?? '') {
    this.instance = axios.create({
      baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    })
    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    this.instance.interceptors.request.use((config) => {
      const token = getAccessToken()
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    this.instance.interceptors.response.use(
      <T>(response: AxiosResponse<ApiResponse<T>>) => response,
      async (error) => {
        const status = error.response?.status
        if (status === 401 && error.config && !error.config._retried) {
          const refreshed = await this.refreshAccessToken()
          if (refreshed) {
            error.config._retried = true
            if (error.config.headers) {
              error.config.headers.Authorization = `Bearer ${refreshed}`
            }
            return this.instance(error.config)
          }
          clearStoredTokens()
          emitSessionExpired()
        }

        if (error.response) {
          const raw = error.response.data as { detail?: string; message?: string } | undefined
          const detail = typeof raw === 'object' && raw !== null ? raw.detail : undefined
          const backendMessage = typeof raw === 'object' && raw !== null ? raw.message : undefined
          const fail = (message: string): ApiError => ({ success: false, message: detail || message })
          if (status === 401) error.response.data = fail('Unauthenticated. Please log in.')
          else if (status === 403) error.response.data = fail('You do not have permission for this action.')
          else if (status === 404) error.response.data = fail('Not found.')
          else if (status === 500) error.response.data = fail('Server error. Please try again later.')
          // Other statuses (400 validation guards and the like) keep the
          // backend's own envelope; mirror its message onto the error so a
          // caller showing `error.message` shows the server's words rather
          // than "Request failed with status code 400".
          else if (backendMessage) error.message = backendMessage
        }
        return Promise.reject(error)
      },
    )
  }

  /** Single-flight JWT rotation shared by concurrent 401s. */
  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise
    this.refreshPromise = this.doRefresh().finally(() => {
      this.refreshPromise = null
    })
    return this.refreshPromise
  }

  private async doRefresh(): Promise<string | null> {
    const refresh = getRefreshToken()
    if (!refresh) return null
    const base = (this.instance.defaults.baseURL || '').replace(/\/$/, '')
    try {
      const res = await axios.post<{ access: string; refresh?: string }>(
        `${base}/api/auth/refresh/`,
        { refresh },
        { headers: { 'Content-Type': 'application/json' } },
      )
      const access = res.data?.access
      if (!access) return null
      saveTokens(access, res.data?.refresh || refresh)
      return access
    } catch {
      return null
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res = await this.instance.get<ApiResponse<T>>(url, config)
    return res.data
  }

  async post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res = await this.instance.post<ApiResponse<T>>(url, data, config)
    return res.data
  }

  async put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res = await this.instance.put<ApiResponse<T>>(url, data, config)
    return res.data
  }

  async patch<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res = await this.instance.patch<ApiResponse<T>>(url, data, config)
    return res.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res = await this.instance.delete<ApiResponse<T>>(url, config)
    return res.data
  }
}

export const apiClient = new ApiClient()
export default apiClient
