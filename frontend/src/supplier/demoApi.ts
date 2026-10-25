import { ApiError } from '../errors'
import { categoryDef, listingSchema, missingFields } from '../listingSchema'
import type { Tour } from '../types'
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

/**
 * Preview without WordPress: one demo supplier account kept in memory (lost on reload).
 * Any email and password sign in.
 */

const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 150))

const EMPTY_PROFILE: SupplierProfile = {
  business_name: '',
  business_type: '',
  bio: '',
  legal_name: '',
  registration_number: '',
  contact_name: '',
  phone: '',
  whatsapp: '',
  website: '',
  address: '',
  operating_locations: '',
  languages: '',
  service_coverage: '',
  team: '',
  permits: '',
  payout: '',
  notify_email: true,
  notify_language: '',
}

let user: SupplierUser | null = null
let nextId = 9000
const listings: SupplierListing[] = []
const bookings: SupplierBooking[] = []
/** Photos uploaded in this tab, so listings can attach them by id. */
const uploaded: Photo[] = []

function checklist(u: SupplierUser) {
  const p = u.profile
  const docs = u.documents.length > 0
  const done: Record<string, boolean> = {
    business_name: !!p.business_name,
    legal: (!!p.legal_name && !!p.registration_number) || docs,
    contact: !!p.contact_name && !!p.phone,
    address: !!p.address && !!p.operating_locations,
    business_type: !!p.business_type,
    permits: !!p.permits || docs,
    languages: !!p.languages && !!p.service_coverage,
    payout: !!p.payout,
    terms: !!u.termsAccepted,
  }
  return listingSchema.onboarding.map((i) => ({ ...i, done: !!done[i.key], optional: i.key === 'payout' }))
}

function me(): SupplierUser {
  if (!user) throw new ApiError('Please sign in again.', 401)
  user.checklist = checklist(user)
  return user
}

function newUser(name: string, email: string, businessName: string): SupplierUser {
  const u: SupplierUser = {
    id: 2,
    name: businessName || name,
    email,
    slug: 'demo-supplier',
    isAdmin: false,
    profile: { ...EMPTY_PROFILE, business_name: businessName, contact_name: name },
    logo: null,
    documents: [],
    termsAccepted: new Date().toISOString(),
    verification: { status: 'unverified', note: '' },
    checklist: [],
  }
  u.checklist = checklist(u)
  return u
}

function seedBookings() {
  if (bookings.length) return
  const live = listings.find((l) => l.status === 'publish') ?? listings[0]
  const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
  const base = { reply: '', quote: '', note: '', phone: '+44 7700 900123', createdAt: new Date().toISOString() }
  bookings.push(
    {
      ...base,
      id: 501,
      status: 'requested',
      date: day(12),
      guests: 3,
      message: 'Hello! Is a sunset ride possible? One of us is 12 years old.',
      details: { adults: 2, children: 1, time: '16:00' },
      listing: live ? { id: live.id, slug: live.slug, title: live.title, image: live.cover?.thumb ?? null, live: true } : null,
      name: 'Anna Schmidt',
      email: 'anna@example.com',
    },
    {
      ...base,
      id: 502,
      status: 'confirmed',
      date: day(30),
      guests: 2,
      message: 'We land at 10:00, flight AT 803.',
      quote: '€120 for two',
      reply: 'Our driver will wait at the arrivals gate with your name.',
      details: { adults: 2 },
      listing: live ? { id: live.id, slug: live.slug, title: live.title, image: live.cover?.thumb ?? null, live: true } : null,
      name: 'Lucas Martin',
      email: 'lucas@example.com',
    },
  )
}

function preview(l: SupplierListing): Tour {
  const v = l.values
  const cat = categoryDef(l.category)
  return {
    id: l.id,
    slug: l.slug,
    title: l.title || 'Untitled listing',
    excerpt: String(v.excerpt ?? ''),
    image: l.cover?.url ?? null,
    price: Number(v.price ?? 0),
    showPrice: true,
    currency: String(v.currency ?? 'EUR'),
    priceUnit: 'per_person',
    duration: String(v.duration ?? ''),
    location: String(v.location ?? ''),
    rating: 0,
    reviewCount: 0,
    freeCancel: String(v.cancellation_policy ?? '').startsWith('free'),
    groupSize: Number(v.group_size ?? 0),
    startPoint: String(v.start_point ?? ''),
    category: cat ? { slug: cat.slug, name: cat.name } : null,
    description: l.description,
    gallery: [l.cover, ...l.gallery].filter((p): p is Photo => !!p).map((p) => p.url),
  }
}

function refresh(l: SupplierListing) {
  l.missing = missingFields(l.category, { title: l.title, description: l.description, values: l.values, hasCover: !!l.cover })
  l.preview = preview(l)
  return l
}

function find(id: number) {
  const l = listings.find((x) => x.id === id)
  if (!l) throw new ApiError('Listing not found.', 404)
  return l
}

function row(l: SupplierListing): ListingRow {
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    status: l.status,
    category: categoryDef(l.category)?.name ?? '',
    image: l.cover?.thumb ?? null,
    updated: new Date().toISOString(),
    missing: l.missing.length,
    views: l.status === 'publish' ? 128 : 0,
    inquiries: bookings.filter((b) => b.listing?.id === l.id).length,
    note: l.note,
  }
}

const session = (u: SupplierUser): Session => ({ token: 'demo', user: u })

export const supplierApi = {
  register: (input: RegisterInput) => {
    user = newUser(input.name, input.email, input.businessName)
    return wait(session(me()))
  },
  login: (email: string) => {
    user ??= newUser('Demo supplier', email, 'Sahara Quad Merzouga')
    return wait(session(me()))
  },
  forgot: () => wait({ status: 'sent' }),

  me: () => wait(me()),
  saveProfile: (profile: Partial<SupplierProfile>, acceptTerms = false) => {
    const u = me()
    u.profile = { ...u.profile, ...profile }
    if (profile.business_name) u.name = profile.business_name
    if (acceptTerms && !u.termsAccepted) u.termsAccepted = new Date().toISOString()
    return wait(me())
  },
  changePassword: () => wait({ token: 'demo' }),
  upload: (file: File, kind: 'photo' | 'logo' | 'document') => {
    const url = URL.createObjectURL(file)
    const p = { id: nextId++, url, thumb: url, name: file.name }
    uploaded.push(p)
    if (kind === 'logo') me().logo = url
    if (kind === 'document') me().documents.push({ id: p.id, name: file.name, url })
    return wait(p)
  },
  deleteDocument: (id: number) => {
    const u = me()
    u.documents = u.documents.filter((d) => d.id !== id)
    return wait(me())
  },
  requestVerification: () => {
    const u = me()
    const missing = u.checklist.filter((i) => !i.done && !i.optional)
    if (missing.length) return Promise.reject(new ApiError(`Complete your profile first: ${missing.map((i) => i.label).join(', ')}`, 400))
    u.verification = { status: 'pending', note: '' }
    return wait(me())
  },

  listings: () => wait(listings.map(row)),
  createListing: (category: string, subtype: string, title: string) => {
    if (!categoryDef(category)) return Promise.reject(new ApiError('Choose a category.', 400))
    const l = refresh({
      id: nextId++,
      slug: '',
      status: 'draft',
      title,
      description: '',
      category,
      subtype,
      values: { currency: 'EUR', price_unit: 'per_person', booking_type: 'request', cancellation_policy: 'free_24h' },
      cover: null,
      gallery: [],
      missing: [],
      note: '',
      needsReview: true,
      preview: {} as Tour,
    })
    listings.unshift(l)
    return wait(l)
  },
  listing: (id: number) => wait(refresh(find(id))),
  saveListing: (id: number, u: ListingUpdate) => {
    const l = find(id)
    if (l.status === 'archived') return Promise.reject(new ApiError('Restore this listing before editing it.', 409))
    if (u.title !== undefined) l.title = u.title
    if (u.description !== undefined) l.description = u.description
    if (u.category && categoryDef(u.category)) l.category = u.category
    if (u.subtype !== undefined) l.subtype = u.subtype
    if (u.values) l.values = { ...l.values, ...u.values }
    const photos = new Map([l.cover, ...l.gallery].filter((p): p is Photo => !!p).map((p) => [p.id, p]))
    uploaded.forEach((p) => photos.set(p.id, p))
    if (u.coverId !== undefined) l.cover = u.coverId ? (photos.get(u.coverId) ?? null) : null
    if (u.galleryIds) l.gallery = u.galleryIds.map((i) => photos.get(i)).filter((p): p is Photo => !!p)
    if (l.status === 'publish') l.status = 'pending'
    return wait(refresh(l))
  },
  listingAction: (id: number, action: 'submit' | 'archive' | 'restore' | 'duplicate') => {
    const l = refresh(find(id))
    if (action === 'submit') {
      if (l.missing.length) return Promise.reject(new ApiError(`Some required information is missing: ${l.missing.map((m) => m.label).join(', ')}`, 400))
      // The demo approves at once so the dashboard shows a live listing.
      l.status = 'publish'
      l.slug ||= (l.title || 'listing').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      seedBookings()
    } else if (action === 'archive') l.status = 'archived'
    else if (action === 'restore') l.status = 'draft'
    else {
      const copy = refresh({ ...structuredClone(l), id: nextId++, slug: '', status: 'draft', title: `Copy of ${l.title}`, note: '' })
      listings.unshift(copy)
      return wait(copy)
    }
    return wait(refresh(l))
  },
  deleteListing: (id: number) => {
    const l = find(id)
    if (l.status !== 'draft' && l.status !== 'archived')
      return Promise.reject(new ApiError('Only drafts and archived listings can be deleted. Archive it first.', 409))
    listings.splice(listings.indexOf(l), 1)
    return wait({ deleted: true })
  },

  bookings: () => wait(bookings),
  answerBooking: (id: number, a: BookingAnswer) => {
    const b = bookings.find((x) => x.id === id)
    if (!b) return Promise.reject(new ApiError('Request not found.', 404))
    if (a.reply !== undefined) b.reply = a.reply
    if (a.quote !== undefined) b.quote = a.quote
    if (a.note !== undefined) b.note = a.note
    if (a.status) {
      if (a.status === 'quoted' && !b.quote) return Promise.reject(new ApiError('Enter the price of your offer.', 400))
      b.status = a.status
    }
    return wait(b)
  },
}
