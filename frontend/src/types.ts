export type ListingTypeSlug = 'hotels' | 'things-to-do' | 'tours' | 'restaurants'

export interface ListingType {
  slug: string
  name: string
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

export interface Listing {
  id: number
  slug: string
  title: string
  excerpt: string
  image: string | null
  price: number
  currency: string
  duration: string
  location: string
  rating: number
  reviewCount: number
  freeCancel: boolean
  type: ListingType | null
  destination: DestinationRef | null
  description?: string
  highlights?: string[]
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

export interface ListingQuery {
  search?: string
  type?: string
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
