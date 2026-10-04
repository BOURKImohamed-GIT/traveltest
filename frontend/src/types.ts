export interface TourCategory {
  slug: string
  name: string
  /** Parent category slug, e.g. "tour-packages". */
  parent?: string | null
  count?: number
}

export interface DestinationRef {
  id: number
  slug: string
  name: string
}

export interface Destination extends DestinationRef {
  country: string
  tagline: string
  image: string | null
  tourCount: number
  description?: string
}

export interface ItineraryStop {
  title: string
  details: string
}

export type PriceUnit = 'per_adult' | 'per_person' | 'per_night' | 'per_group'

export interface Host {
  name: string
}

/** Any listing: a tour, stay, activity or restaurant. */
export interface Tour {
  id: number
  slug: string
  title: string
  excerpt: string
  image: string | null
  price: number
  currency: string
  priceUnit: PriceUnit
  duration: string
  location: string
  rating: number
  reviewCount: number
  freeCancel: boolean
  groupSize: number
  category: TourCategory | null
  destination: DestinationRef | null
  /** The business that published it; null for listings run by the site team. */
  host: Host | null
  description?: string
  amenities?: string[]
  highlights?: string[]
  itinerary?: ItineraryStop[]
  included?: string[]
  notIncluded?: string[]
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
  destination?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  sort?: SortOption
  page?: number
  perPage?: number
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

export interface User {
  id: number
  name: string
  email: string
  avatar: string
}

export interface Session {
  token: string
  user: User
}

export interface AuthConfig {
  googleClientId: string
  devLogin: boolean
}

export interface UploadedImage {
  id: number
  url: string
}

/** What a listing owner edits. */
export interface ListingInput {
  title: string
  category: string
  destination: string
  price: number
  currency: string
  priceUnit: PriceUnit
  duration: string
  location: string
  excerpt: string
  description: string
  highlights: string[]
  included: string[]
  notIncluded: string[]
  amenities: string[]
  itinerary: ItineraryStop[]
  meetingPoint: string
  languages: string
  groupSize: number
  freeCancel: boolean
  imageIds: number[]
}

export type ListingStatus = 'publish' | 'pending' | 'draft'

export interface OwnedListing extends Tour {
  status: ListingStatus
  raw: Omit<ListingInput, 'imageIds'> & { images: UploadedImage[] }
}

export interface InquiryInput {
  tourId: number
  name: string
  email: string
  phone: string
  date: string
  guests: number
  message: string
  website: string
}
