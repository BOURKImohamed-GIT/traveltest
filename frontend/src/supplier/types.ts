import type { FieldValues, MissingItem } from '../listingSchema'
import type { ItineraryStop, Tour } from '../types'

/** Business profile (wp-admin → Users → the supplier). */
export interface SupplierProfile {
  business_name: string
  business_type: string
  bio: string
  legal_name: string
  registration_number: string
  contact_name: string
  phone: string
  whatsapp: string
  website: string
  address: string
  operating_locations: string
  languages: string
  service_coverage: string
  team: string
  permits: string
  payout: string
  notify_email: boolean
  notify_language: string
}

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export interface ChecklistItem {
  key: string
  label: string
  done: boolean
  optional: boolean
}

export interface SupplierUser {
  id: number
  name: string
  email: string
  slug: string
  isAdmin: boolean
  profile: SupplierProfile
  logo: string | null
  documents: { id: number; name: string; url: string }[]
  termsAccepted: string
  verification: { status: VerificationStatus; note: string }
  checklist: ChecklistItem[]
  /** Booking requests waiting for an answer (green badge). */
  newBookings: number
}

export interface Session {
  token: string
  user: SupplierUser
}

export interface Photo {
  id: number
  url: string
  thumb: string
}

export type ListingStatus = 'draft' | 'pending' | 'publish' | 'archived'

/** A row of "My listings". */
export interface ListingRow {
  id: number
  slug: string
  title: string
  status: ListingStatus
  category: string
  image: string | null
  updated: string
  missing: number
  views: number
  inquiries: number
  /** The admin's note when a listing was sent back. */
  note: string
}

/** A listing being edited in the wizard. */
export interface SupplierListing {
  id: number
  slug: string
  status: ListingStatus
  title: string
  description: string
  category: string
  subtype: string
  values: FieldValues & { itinerary_days?: ItineraryStop[] }
  cover: Photo | null
  gallery: Photo[]
  missing: MissingItem[]
  note: string
  needsReview: boolean
  preview: Tour
}

export interface ListingUpdate {
  title?: string
  description?: string
  category?: string
  subtype?: string
  values?: FieldValues
  coverId?: number | null
  galleryIds?: number[]
}

export type BookingStatus = 'requested' | 'quoted' | 'confirmed' | 'declined' | 'cancelled' | 'completed'

export interface SupplierBooking {
  id: number
  status: BookingStatus
  date: string
  guests: number
  message: string
  reply: string
  quote: string
  details: Record<string, string | number>
  createdAt: string
  listing: { id: number; slug: string; title: string; image: string | null; live: boolean } | null
  name: string
  email: string
  phone: string
  note: string
}

export interface BookingAnswer {
  status?: BookingStatus
  reply?: string
  quote?: string
  note?: string
  notify?: boolean
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  businessName: string
  acceptTerms: boolean
  website: string
}

export const BUSINESS_TYPES: Record<string, string> = {
  tour_operator: 'Tour operator',
  travel_agency: 'Travel agency',
  guide: 'Licensed guide',
  activity_provider: 'Activity provider',
  artisan: 'Artisan or workshop host',
  transport: 'Transport provider',
  other: 'Other',
}

export const VERIFICATION: Record<VerificationStatus, string> = {
  unverified: 'Not verified',
  pending: 'Verification pending',
  verified: 'Verified supplier',
  rejected: 'Changes needed',
}

export const LISTING_STATUS: Record<ListingStatus, string> = {
  draft: 'Draft',
  pending: 'In review',
  publish: 'Live',
  archived: 'Archived',
}

export const BOOKING_STATUS: Record<BookingStatus, string> = {
  requested: 'New request',
  quoted: 'Offer sent',
  confirmed: 'Confirmed',
  declined: 'Declined',
  cancelled: 'Cancelled by traveller',
  completed: 'Completed',
}

/** Extra request details by listing type, as labelled in emails. */
export const BOOKING_DETAIL_LABELS: Record<string, string> = {
  adults: 'Adults',
  children: 'Children',
  time: 'Preferred time',
  option: 'Option',
  package: 'Package',
  ticket: 'Ticket type',
  quantity: 'Tickets',
  pickup: 'Pickup',
  dropoff: 'Drop-off',
  flight: 'Flight number',
  luggage: 'Luggage',
}
