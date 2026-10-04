/**
 * In-browser stand-in for the WordPress API, built from the same sample data the
 * backend seed script loads. Used when VITE_WP_API_URL is not set.
 */
import seed from '../../backend/scripts/seed-data.json'
import { ApiError } from './errors'
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

const image = (slug: string) => `https://picsum.photos/seed/${encodeURIComponent(slug)}/1200/800`

const types: ListingType[] = seed.types

const destinationRows = seed.destinations.map((d, i) => ({ ...d, id: i + 1 }))

let reviewId = 1
const reviewsByListing = new Map<number, Review[]>()

const allListings: Listing[] = seed.listings.map((l, i) => {
  const id = 100 + i
  const reviews: Review[] = l.reviews.map((r) => ({
    id: reviewId++,
    ...r,
    date: `${r.travelDate}-15T12:00:00Z`,
  }))
  reviewsByListing.set(id, reviews)
  const total = reviews.reduce((sum, r) => sum + r.rating, 0)
  const dest = destinationRows.find((d) => d.slug === l.destination)
  const type = types.find((t) => t.slug === l.type) ?? null
  return {
    id,
    slug: l.slug,
    title: l.title,
    excerpt: l.excerpt,
    image: image(l.slug),
    price: l.price,
    currency: l.currency,
    duration: l.duration,
    location: l.location,
    rating: reviews.length ? Math.round((total / reviews.length) * 10) / 10 : 0,
    reviewCount: reviews.length,
    freeCancel: l.freeCancel,
    type,
    destination: dest ? { id: dest.id, slug: dest.slug, name: dest.name } : null,
    description: `<p>${l.description}</p>`,
    highlights: l.highlights,
    gallery: [image(l.slug), image(`${l.slug}-2`), image(`${l.slug}-3`)],
  }
})

const allDestinations: Destination[] = destinationRows.map((d) => ({
  id: d.id,
  slug: d.slug,
  name: d.name,
  country: d.country,
  tagline: d.tagline,
  image: image(d.slug),
  tourCount: allListings.filter((l) => l.destination?.slug === d.slug).length,
  description: `<p>${d.description}</p>`,
}))

const delay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 150))

function summary(l: Listing): Listing {
  const { description: _d, highlights: _h, gallery: _g, ...rest } = l
  return rest
}

function query(q: ListingQuery): Paged<Listing> {
  const search = q.search?.trim().toLowerCase()
  let rows = allListings.filter((l) => {
    if (search && ![l.title, l.excerpt, l.description, l.location].join(' ').toLowerCase().includes(search)) return false
    if (q.type && l.type?.slug !== q.type) return false
    if (q.destination && l.destination?.slug !== q.destination) return false
    if (q.minPrice != null && l.price < q.minPrice) return false
    if (q.maxPrice != null && l.price > q.maxPrice) return false
    if (q.minRating != null && l.rating < q.minRating) return false
    return true
  })
  rows = [...rows].sort((a, b) => {
    switch (q.sort) {
      case 'rating':
        return b.rating - a.rating
      case 'price_asc':
        return a.price - b.price
      case 'price_desc':
        return b.price - a.price
      default:
        return b.reviewCount - a.reviewCount
    }
  })
  const perPage = q.perPage ?? 12
  const page = q.page ?? 1
  return {
    items: rows.slice((page - 1) * perPage, page * perPage).map(summary),
    total: rows.length,
    totalPages: Math.ceil(rows.length / perPage),
  }
}

export const listings = (q: ListingQuery = {}) => delay(query(q))

export async function listing(slug: string): Promise<Listing> {
  const found = allListings.find((l) => l.slug === slug)
  if (!found) throw new ApiError('Listing not found.', 404)
  return delay(found)
}

export const reviews = (id: number) => delay([...(reviewsByListing.get(id) ?? [])].sort((a, b) => b.date.localeCompare(a.date)))

// Sample mode: accept the review as "pending moderation" like WordPress does, but don't publish it.
export const createReview = (_id: number, _input: ReviewInput) => delay({ status: 'pending' })

export const destinations = () => delay(allDestinations.map(({ description: _d, ...rest }) => rest))

export async function destination(slug: string): Promise<Destination> {
  const found = allDestinations.find((d) => d.slug === slug)
  if (!found) throw new ApiError('Destination not found.', 404)
  return delay(found)
}

export const listingTypes = () =>
  delay(types.map((t) => ({ ...t, count: allListings.filter((l) => l.type?.slug === t.slug).length })))

export const createInquiry = (_input: InquiryInput) => delay({ status: 'received' })
