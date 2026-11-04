import type { BookingStatus } from '../supplier/types'

export interface Traveller {
  id: number
  name: string
  email: string
  phone: string
}

export interface TravellerSession {
  token: string
  user: Traveller
}

/** A booking request as the traveller sees it (My bookings). */
export interface TravellerBooking {
  id: number
  status: BookingStatus
  date: string
  guests: number
  message: string
  /** The supplier's (or agency's) message. */
  reply: string
  /** Price of the offer, as written by the supplier. */
  quote: string
  details: Record<string, string | number>
  createdAt: string
  listing: { id: number; slug: string; title: string; image: string | null; live: boolean } | null
}

export const TRAVELLER_STATUS: Record<BookingStatus, string> = {
  requested: 'Waiting for an answer',
  quoted: 'Offer received',
  confirmed: 'Confirmed',
  declined: 'Not available',
  cancelled: 'Cancelled',
  completed: 'Completed',
}
