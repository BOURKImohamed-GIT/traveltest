import { API_URL } from './config'
import { ApiError } from './errors'
import * as sample from './sampleApi'
import { travellerToken } from './traveller/api'
import type {
  Menus,
  AgencySettings,
  ContactInput,
  InquiryInput,
  Paged,
  PublicSupplier,
  Review,
  ReviewInput,
  SitePage,
  Tour,
  TourCategory,
  TourQuery,
} from './types'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  const res = await fetch(`${API_URL}${path}`, { ...init, headers })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const params = body?.data?.params as Record<string, string> | undefined
    const detail = params ? Object.values(params).join(' ') : body?.message
    throw new ApiError(detail || `Request failed (${res.status})`, res.status)
  }
  return body as T
}

const json = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data) })

function toParams(q: TourQuery): string {
  const p = new URLSearchParams()
  if (q.search) p.set('search', q.search)
  if (q.category) p.set('category', q.category)
  if (q.minPrice != null) p.set('min_price', String(q.minPrice))
  if (q.maxPrice != null) p.set('max_price', String(q.maxPrice))
  if (q.minRating != null) p.set('min_rating', String(q.minRating))
  if (q.sort) p.set('sort', q.sort)
  if (q.page) p.set('page', String(q.page))
  if (q.perPage) p.set('per_page', String(q.perPage))
  for (const [key, values] of Object.entries(q.filters ?? {})) if (values.length) p.set(key, values.join(','))
  if (q.date) p.set('date', q.date)
  if (q.freeCancel) p.set('free_cancel', '1')
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const api = API_URL
  ? {
      tours: (q: TourQuery = {}) => request<Paged<Tour>>(`/tours${toParams(q)}`),
      tour: (slug: string) => request<Tour>(`/tours/${encodeURIComponent(slug)}`),
      reviews: (id: number) => request<Review[]>(`/tours/${id}/reviews`),
      createReview: (id: number, input: ReviewInput) => request<{ status: string }>(`/tours/${id}/reviews`, json('POST', input)),
      categories: () => request<TourCategory[]>('/tour-categories'),
      supplier: (slug: string) => request<{ supplier: PublicSupplier; tours: Tour[] }>(`/suppliers/${encodeURIComponent(slug)}`),
      // Signed-in travellers send their token, so the request shows in My bookings.
      createInquiry: (input: InquiryInput) => {
        const token = travellerToken()
        return request<{ status: string }>('/inquiries', { ...json('POST', input), headers: token ? { Authorization: `Bearer ${token}` } : {} })
      },

      page: (slug: string) => request<SitePage>(`/pages/${encodeURIComponent(slug)}`),
      sendContact: (input: ContactInput) => request<{ status: string }>('/contact', json('POST', input)),

      settings: () => request<AgencySettings>('/settings'),
      menus: () => request<Menus>('/menus'),
    }
  : sample

export { ApiError }
