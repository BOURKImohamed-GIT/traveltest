import { API_URL } from '../config'
import { ApiError } from '../errors'
import * as demo from './demoApi'
import type {
  BookingAnswer,
  ListingRow,
  ListingUpdate,
  Photo,
  RegisterInput,
  Session,
  SupplierBooking,
  SupplierListing,
  SupplierProfile,
  SupplierUser,
} from './types'

const TOKEN_KEY = 'tac_supplier_token'

export function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Private mode: the session lasts until the page is closed.
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const token = storedToken()
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

const json = (method: string, data?: unknown): RequestInit => ({ method, body: data === undefined ? undefined : JSON.stringify(data) })

/** Photos for listings, the logo (saved on the profile at once) or a verification document (image or PDF). */
function upload(file: File, kind: 'photo' | 'logo' | 'document') {
  const form = new FormData()
  form.append('file', file)
  form.append('kind', kind)
  return request<Photo & { name: string }>('/supplier/uploads', { method: 'POST', body: form })
}

/** Supplier accounts and dashboard (travel/v1/auth/* and /supplier/*). Without WordPress, a demo kept in this browser tab. */
export const supplierApi = API_URL
  ? {
      register: (input: RegisterInput) => request<Session>('/auth/register', json('POST', input)),
      login: (email: string, password: string) => request<Session>('/auth/login', json('POST', { email, password })),
      forgot: (email: string) => request<{ status: string }>('/auth/forgot', json('POST', { email })),

      me: () => request<SupplierUser>('/supplier/me'),
      saveProfile: (profile: Partial<SupplierProfile>, acceptTerms = false) =>
        request<SupplierUser>('/supplier/me', json('PUT', { profile, acceptTerms })),
      /** Signs out other devices; returns this device's new token. */
      changePassword: (current: string, password: string) => request<{ token: string }>('/supplier/password', json('POST', { current, new: password })),
      upload,
      deleteDocument: (id: number) => request<SupplierUser>(`/supplier/documents/${id}`, json('DELETE')),
      requestVerification: () => request<SupplierUser>('/supplier/verification', json('POST')),

      listings: () => request<ListingRow[]>('/supplier/listings'),
      createListing: (category: string, subtype: string, title: string) =>
        request<SupplierListing>('/supplier/listings', json('POST', { category, subtype, title })),
      listing: (id: number) => request<SupplierListing>(`/supplier/listings/${id}`),
      saveListing: (id: number, update: ListingUpdate) => request<SupplierListing>(`/supplier/listings/${id}`, json('PUT', update)),
      listingAction: (id: number, action: 'submit' | 'archive' | 'restore' | 'duplicate') =>
        request<SupplierListing>(`/supplier/listings/${id}/${action}`, json('POST')),
      deleteListing: (id: number) => request<{ deleted: boolean }>(`/supplier/listings/${id}`, json('DELETE')),

      bookings: () => request<SupplierBooking[]>('/supplier/bookings'),
      answerBooking: (id: number, answer: BookingAnswer) => request<SupplierBooking>(`/supplier/bookings/${id}`, json('POST', answer)),
    }
  : demo.supplierApi
