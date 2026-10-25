import { API_URL } from '../config'
import { ApiError } from '../errors'
import type { Traveller, TravellerBooking, TravellerSession } from './types'

const TOKEN_KEY = 'tac_traveller_token'

export function travellerToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function storeTravellerToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Private mode: signed in until the page is closed.
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  const token = travellerToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`${API_URL}${path}`, { ...init, headers })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const params = body?.data?.params as Record<string, string> | undefined
    throw new ApiError((params ? Object.values(params).join(' ') : body?.message) || `Request failed (${res.status})`, res.status)
  }
  return body as T
}

const post = (data?: unknown): RequestInit => ({ method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) })

/* Preview without WordPress: one demo traveller in memory. */
let demoUser: Traveller | null = null
const demoBookings: TravellerBooking[] = []
const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 150))
function demoSession(name: string, email: string): Promise<TravellerSession> {
  demoUser = { id: 1, name, email, phone: '' }
  if (!demoBookings.length) {
    const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
    demoBookings.push({
      id: 1,
      status: 'quoted',
      date: day(18),
      guests: 2,
      message: 'Can we start at sunset?',
      reply: 'Yes! Pickup from your riad at 16:30. Reply to the email to confirm.',
      quote: '€90 for two',
      details: { adults: 2, time: '16:30' },
      createdAt: new Date().toISOString(),
      listing: { id: 0, slug: 'agafay-quad-biking-and-camel-ride', title: 'Agafay Quad Biking and Camel Ride', image: null, live: true },
    })
  }
  return wait({ token: 'demo', user: demoUser })
}

/** Traveller accounts and My bookings (travel/v1/auth/traveller/*, /me, /me/bookings). */
export const travellerApi = API_URL
  ? {
      register: (name: string, email: string, password: string, website: string) =>
        request<TravellerSession>('/auth/traveller/register', post({ name, email, password, website })),
      login: (email: string, password: string) => request<TravellerSession>('/auth/traveller/login', post({ email, password })),
      forgot: (email: string) => request<{ status: string }>('/auth/forgot', post({ email })),
      me: () => request<Traveller>('/me'),
      bookings: () => request<TravellerBooking[]>('/me/bookings'),
      cancel: (id: number) => request<TravellerBooking>(`/me/bookings/${id}/cancel`, post()),
    }
  : {
      register: (name: string, email: string) => demoSession(name, email),
      login: (email: string) => demoSession(demoUser?.name ?? 'Demo traveller', email),
      forgot: () => wait({ status: 'sent' }),
      me: () => (demoUser ? wait(demoUser) : Promise.reject(new ApiError('Please sign in again.', 401))),
      bookings: () => wait(demoBookings),
      cancel: (id: number) => {
        const b = demoBookings.find((x) => x.id === id)
        if (!b) return Promise.reject(new ApiError('Booking not found.', 404))
        b.status = 'cancelled'
        return wait(b)
      },
    }
