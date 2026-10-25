import { fieldVisible, isEmptyValue, sectionsFor, type SchemaField } from './listingSchema'
import type { Tour } from './types'

/** Fields the tour page already shows elsewhere (facts, highlights, included, map…) or that are internal. */
const SHOWN_ELSEWHERE = new Set([
  'excerpt',
  'highlights',
  'languages',
  'tour_style',
  'duration',
  'duration_type',
  'currency',
  'price_unit',
  'price',
  'group_size',
  'included',
  'not_included',
  'city',
  'location',
  'meeting_point',
  'start_point',
  'end_point',
  'notes',
  'itinerary_days',
  'keywords',
  'included_services',
  'video_url',
  'blocked_dates',
  'booking_type',
  'cancellation_policy',
  'operating_days',
])

/** Public titles for the common form sections. */
const TITLES: Record<string, string> = {
  'Basic information': 'About this experience',
  'Pricing and participants': 'Prices and participants',
  'Availability and booking': 'Availability',
  'Location and logistics': 'Pickup and logistics',
  'Safety, rules and trust': 'Safety and requirements',
}

/**
 * The listing's own details, grouped like the supplier's form: what a quad ride, cooking class,
 * transfer or festival ticket needs travellers to know.
 */
export function detailGroups(tour: Tour): { title: string; fields: SchemaField[] }[] {
  const values = tour.fields ?? {}
  const get = (k: string) => values[k]
  return sectionsFor(tour.category?.slug)
    .map((s) => ({
      title: TITLES[s.title] ?? s.title,
      fields: s.fields.filter(
        (f) =>
          !SHOWN_ELSEWHERE.has(f.key) &&
          f.type !== 'itinerary' &&
          fieldVisible(f, get) &&
          !isEmptyValue(f, values[f.key]) &&
          // A "No" says nothing on its own (e.g. "Licence required: No").
          !(f.type === 'boolean' && !values[f.key]),
      ),
    }))
    .filter((g) => g.fields.length > 0)
    // Merge sections that share a public title.
    .reduce<{ title: string; fields: SchemaField[] }[]>((acc, g) => {
      const same = acc.find((a) => a.title === g.title)
      if (same) same.fields.push(...g.fields.filter((f) => !same.fields.some((x) => x.key === f.key)))
      else acc.push(g)
      return acc
    }, [])
}
