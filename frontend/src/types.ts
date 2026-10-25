export interface TourCategory {
  slug: string
  name: string
  /** Parent category slug, e.g. "tour-packages". */
  parent?: string | null
  count?: number
  /** Photo chosen in Listing categories, or a tour photo from the category. */
  image?: string | null
}

export interface ItineraryStop {
  title: string
  /** HTML from the WordPress text editor. */
  details: string
  /** e.g. "About 353 km / 6 h 30 min" */
  distance?: string
}

export type PriceUnit = 'per_adult' | 'per_person' | 'per_group' | 'per_vehicle' | 'per_session' | 'custom_quote'

/** Who runs a listing: a supplier, or the agency itself. */
export interface PublicSupplier {
  /** Empty for the agency's own listings. */
  slug: string
  name: string
  logo: string | null
  verified: boolean
  /** The rest is sent on the tour page and the supplier page, not on cards. */
  bio?: string
  /** "Licensed guide", "Tour operator"… */
  type?: string
  /** Year joined. */
  since?: string
  languages?: string
  locations?: string[]
  website?: string
}

/** Any listing: a tour, day trip, activity, class, event or transfer. */
export interface Tour {
  id: number
  slug: string
  title: string
  excerpt: string
  image: string | null
  price: number
  /** False when the agency hides the price; `price` is then 0 and cards say "Price on request". */
  showPrice?: boolean
  currency: string
  priceUnit: PriceUnit
  duration: string
  location: string
  rating: number
  reviewCount: number
  freeCancel: boolean
  groupSize: number
  /** "Private", "Shared"… empty for activities. */
  tourStyle?: string
  /** Where the tour starts, e.g. "Marrakech" (shown on cards as "From Marrakech"). */
  startPoint?: string
  category: TourCategory | null
  /** The specific activity type, e.g. "Quad biking in Merzouga". */
  subtype?: { slug: string; name: string } | null
  /** multi_day, scheduled_excursion, timed_activity, class_workshop, experience_package, event_ticket or transfer. */
  listingType?: string
  /** Every field of the listing's category (detail page), keyed as in the listing schema. */
  fields?: Record<string, unknown>
  supplier?: PublicSupplier | null
  description?: string
  amenities?: string[]
  highlights?: string[]
  itinerary?: ItineraryStop[]
  included?: string[]
  notIncluded?: string[]
  endPoint?: string
  notes?: string[]
  meetingPoint?: string
  languages?: string[]
  gallery?: string[]
}

export interface Review {
  id: number
  author: string
  title: string
  rating: number
  content: string
  tripType: string
  travelDate: string
  date: string
}

export type SortOption = 'recommended' | 'rating' | 'price_asc' | 'price_desc'

export interface TourQuery {
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  sort?: SortOption
  page?: number
  perPage?: number
  /** Listing filters by schema field (duration_type, city, languages…): the chosen values. */
  filters?: Record<string, string[]>
  /** Only listings that run on this day (YYYY-MM-DD). */
  date?: string
  freeCancel?: boolean
}

export interface Paged<T> {
  items: T[]
  total: number
  totalPages: number
}

export interface ReviewInput {
  author: string
  email: string
  rating: number
  title: string
  content: string
  tripType: string
  travelDate: string
  website: string
}

/** A WordPress page: About Us, FAQs, policies… */
export interface SitePage {
  slug: string
  title: string
  content: string
}

export interface ContactInput {
  name: string
  email: string
  phone: string
  subject: string
  message: string
  website: string
}

export interface InquiryInput {
  tourId: number
  name: string
  email: string
  phone: string
  date: string
  guests: number
  message: string
  /** Time, package, ticket, pickup… depending on the listing type. */
  details?: Record<string, string | number>
  website: string
}

export interface AgencyContact {
  email: string
  phone: string
  /** International number, digits only (for wa.me links). */
  whatsapp: string
  address: string
}

export interface SocialLink {
  /** facebook, instagram, tiktok, youtube, x, tripadvisor, google, getyourguide, viator, pinterest, linkedin, threads or other */
  network: string
  label: string
  url: string
}

/** Edited in wp-admin → Agency details. */
export interface AgencySettings {
  contact: AgencyContact
  /** Short text for the footer. */
  about: string
  /** Logo image URL; empty shows the site name. */
  logo: string
  /** Off in wp-admin → Agency details hides every price. */
  showPrices: boolean
  /** e.g. ["PayPal", "Bank transfer"] */
  payments: string[]
  social: SocialLink[]
}

/** An item of a menu edited in Appearance → Menus. `url` is an app path ("/tour/x/") unless external. */
export interface MenuItem {
  title: string
  url: string
  external: boolean
  children: MenuItem[]
}

/** Menu locations of the theme; null when no menu is set. */
export interface Menus {
  primary: MenuItem[] | null
  quick: MenuItem[] | null
  footer: MenuItem[] | null
}
