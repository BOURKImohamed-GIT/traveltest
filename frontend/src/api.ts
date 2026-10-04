import { API_URL } from './config'
import { ApiError } from './errors'
import * as sample from './sampleApi'
import { getToken } from './session'
import type {
  AuthConfig,
  Destination,
  InquiryInput,
  ListingInput,
  OwnedListing,
  Paged,
  Review,
  ReviewInput,
  Session,
  Tour,
  TourCategory,
  TourQuery,
  UploadedImage,
  User,
} from './types'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
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
      tours: (q: TourQuery = {}) => request<Paged<Tour>>(`/tours${toParams(q)}`),
      tour: (slug: string) => request<Tour>(`/tours/${encodeURIComponent(slug)}`),
      reviews: (id: number) => request<Review[]>(`/tours/${id}/reviews`),
      createReview: (id: number, input: ReviewInput) => request<{ status: string }>(`/tours/${id}/reviews`, json('POST', input)),
      destinations: () => request<Destination[]>('/destinations'),
      destination: (slug: string) => request<Destination>(`/destinations/${encodeURIComponent(slug)}`),
      categories: () => request<TourCategory[]>('/tour-categories'),
      createInquiry: (input: InquiryInput) => request<{ status: string }>('/inquiries', json('POST', input)),

      authConfig: () => request<AuthConfig>('/auth/config'),
      signInWithGoogle: (credential: string) => request<Session>('/auth/google', json('POST', { credential })),
      signInDev: (email: string, name: string) => request<Session>('/auth/dev', json('POST', { email, name })),
      me: () => request<User>('/me'),
      myListings: () => request<OwnedListing[]>('/me/listings'),
      myListing: (id: number) => request<OwnedListing>(`/me/listings/${id}`),
      createListing: (input: ListingInput) => request<OwnedListing>('/me/listings', json('POST', input)),
      updateListing: (id: number, input: ListingInput) => request<OwnedListing>(`/me/listings/${id}`, json('PUT', input)),
      deleteListing: (id: number) => request<{ deleted: boolean }>(`/me/listings/${id}`, { method: 'DELETE' }),
      uploadImage: (file: Blob, name: string) => {
        const form = new FormData()
        form.append('file', file, name)
        return request<UploadedImage>('/me/uploads', { method: 'POST', body: form })
      },
    }
  : sample

export { ApiError }
