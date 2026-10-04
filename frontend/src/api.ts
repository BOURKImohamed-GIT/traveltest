import { API_URL } from './config'
import { ApiError } from './errors'
import * as sample from './sampleApi'
import type {
  Destination,
  InquiryInput,
  Listing,
  ListingQuery,
  ListingType,
  Paged,
  Review,
  ReviewInput,
} from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const params = body?.data?.params as Record<string, string> | undefined
    const detail = params ? Object.values(params).join(' ') : body?.message
    throw new ApiError(detail || `Request failed (${res.status})`, res.status)
  }
  return body as T
}

function toParams(q: ListingQuery): string {
  const p = new URLSearchParams()
  if (q.search) p.set('search', q.search)
  if (q.type) p.set('type', q.type)
  if (q.destination) p.set('destination', q.destination)
  if (q.minPrice != null) p.set('min_price', String(q.minPrice))
  if (q.maxPrice != null) p.set('max_price', String(q.maxPrice))
  if (q.minRating != null) p.set('min_rating', String(q.minRating))
  if (q.sort) p.set('sort', q.sort)
  if (q.page) p.set('page', String(q.page))
  if (q.perPage) p.set('per_page', String(q.perPage))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const api = API_URL
  ? {
      listings: (q: ListingQuery = {}) => request<Paged<Listing>>(`/tours${toParams(q)}`),
      listing: (slug: string) => request<Listing>(`/tours/${encodeURIComponent(slug)}`),
      reviews: (id: number) => request<Review[]>(`/tours/${id}/reviews`),
      createReview: (id: number, input: ReviewInput) =>
        request<{ status: string }>(`/tours/${id}/reviews`, { method: 'POST', body: JSON.stringify(input) }),
      destinations: () => request<Destination[]>('/destinations'),
      destination: (slug: string) => request<Destination>(`/destinations/${encodeURIComponent(slug)}`),
      listingTypes: () => request<ListingType[]>('/listing-types'),
      createInquiry: (input: InquiryInput) =>
        request<{ status: string }>('/inquiries', { method: 'POST', body: JSON.stringify(input) }),
    }
  : sample

export { ApiError }
