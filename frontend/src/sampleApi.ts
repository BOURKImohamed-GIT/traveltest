/**
 * In-browser stand-in for the WordPress API, built from the same sample data the
 * backend seed script loads. Used when VITE_WP_API_URL is not set.
 */
import seed from '../../backend/scripts/seed-data.json'
import { ApiError } from './errors'
import type {
  AgencySettings,
  ContactInput,
  Destination,
  ItineraryStop,
  InquiryInput,
  Paged,
  PriceUnit,
  Review,
  ReviewInput,
  SitePage,
  Tour,
  TourCategory,
  TourQuery,
} from './types'

const image = (slug: string) => `https://picsum.photos/seed/${encodeURIComponent(slug)}/1200/800`

const categoryRows: TourCategory[] = seed.categories
const parentOf = (slug?: string) => categoryRows.find((c) => c.slug === slug)?.parent ?? undefined
const destinationRows = seed.destinations.map((d, i) => ({ ...d, id: i + 1 }))

let reviewId = 1
const reviewsByTour = new Map<number, Review[]>()

const allTours: Tour[] = seed.tours.map((t, i) => {
  const id = 100 + i
  // Seed reviews are optional; the launch data ships with none.
  const seedReviews = t.reviews as Omit<Review, 'id' | 'date'>[]
  const reviews: Review[] = seedReviews.map((r) => ({ id: reviewId++, ...r, date: `${r.travelDate}-15T12:00:00Z` }))
  reviewsByTour.set(id, reviews)
  const total = reviews.reduce((sum, r) => sum + r.rating, 0)
  const dest = destinationRows.find((d) => d.slug === t.destination)
  // Fields only some seed tours have.
  const extra = t as { tourStyle?: string; startPoint?: string; endPoint?: string; notes?: string[] }
  return {
    id,
    slug: t.slug,
    title: t.title,
    excerpt: t.excerpt,
    image: t.image ?? image(t.slug),
    price: t.price,
    currency: t.currency,
    priceUnit: t.priceUnit as PriceUnit,
    amenities: t.amenities,
    duration: t.duration,
    location: t.location,
    rating: reviews.length ? Math.round((total / reviews.length) * 10) / 10 : 0,
    reviewCount: reviews.length,
    freeCancel: t.freeCancel,
    groupSize: t.groupSize,
    tourStyle: extra.tourStyle ?? '',
    startPoint: extra.startPoint ?? '',
    endPoint: extra.endPoint ?? '',
    notes: extra.notes ?? [],
    category: (() => {
      const c = categoryRows.find((x) => x.slug === t.category)
      return c ? { slug: c.slug, name: c.name } : null
    })(),
    destination: dest ? { id: dest.id, slug: dest.slug, name: dest.name } : null,
    description: t.description.startsWith('<') ? t.description : `<p>${t.description}</p>`,
    highlights: t.highlights,
    itinerary: t.itinerary as ItineraryStop[],
    included: t.included,
    notIncluded: t.notIncluded,
    meetingPoint: t.meetingPoint,
    languages: t.languages.split(',').map((l) => l.trim()),
    gallery: t.gallery.length ? t.gallery : [image(t.slug), image(`${t.slug}-2`), image(`${t.slug}-3`)],
  }
})

const allDestinations: Destination[] = destinationRows.map((d) => ({
  id: d.id,
  slug: d.slug,
  name: d.name,
  country: d.country,
  tagline: d.tagline,
  image: d.image ?? image(d.slug),
  tourCount: allTours.filter((t) => t.destination?.slug === d.slug).length,
  description: `<p>${d.description}</p>`,
}))

const delay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 150))

function summary(t: Tour): Tour {
  const {
    description: _d,
    highlights: _h,
    itinerary: _i,
    included: _in,
    notIncluded: _n,
    meetingPoint: _m,
    languages: _l,
    gallery: _g,
    amenities: _a,
    notes: _no,
    startPoint: _s,
    endPoint: _e,
    ...rest
  } = t
  return rest
}

function query(q: TourQuery): Paged<Tour> {
  const search = q.search?.trim().toLowerCase()
  let rows = allTours.filter((t) => {
    if (search && ![t.title, t.excerpt, t.description, t.location, t.destination?.name].join(' ').toLowerCase().includes(search))
      return false
    if (q.category && t.category?.slug !== q.category && parentOf(t.category?.slug) !== q.category) return false
    if (q.destination && t.destination?.slug !== q.destination) return false
    if (q.minPrice != null && t.price < q.minPrice) return false
    if (q.maxPrice != null && t.price > q.maxPrice) return false
    if (q.minRating != null && t.rating < q.minRating) return false
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

export const tours = (q: TourQuery = {}) => delay(query(q))

export async function tour(slug: string): Promise<Tour> {
  const found = allTours.find((t) => t.slug === slug)
  if (!found) throw new ApiError('Tour not found.', 404)
  return delay(found)
}

export const reviews = (id: number) => delay([...(reviewsByTour.get(id) ?? [])].sort((a, b) => b.date.localeCompare(a.date)))

// Sample mode: accept the review as "pending moderation" like WordPress does, but don't publish it.
export const createReview = (_id: number, _input: ReviewInput) => delay({ status: 'pending' })

export const destinations = () => delay(allDestinations.map(({ description: _d, ...rest }) => rest))

export async function destination(slug: string): Promise<Destination> {
  const found = allDestinations.find((d) => d.slug === slug)
  if (!found) throw new ApiError('Destination not found.', 404)
  return delay(found)
}

export const categories = () =>
  delay(
    categoryRows.map((c) => ({
      ...c,
      count: allTours.filter((t) => t.category?.slug === c.slug || parentOf(t.category?.slug) === c.slug).length,
    })),
  )

export async function page(slug: string): Promise<SitePage> {
  const found = seed.pages.find((p) => p.slug === slug)
  if (!found) throw new ApiError('Page not found.', 404)
  return delay(found)
}

// Preview: nothing is sent.
export const sendContact = (_input: ContactInput) => delay({ status: 'received' })

export const settings = () => delay<AgencySettings>(seed.settings)

// Preview: nothing is sent.
export const createInquiry = (_input: InquiryInput) => delay({ status: 'received' })
