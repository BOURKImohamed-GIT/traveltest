import schema from '../../backend/wp-content/plugins/travel-agency-core/data/listing-schema.json'

/**
 * The listing engine's schema (categories, listing types, common and specialized fields),
 * shared with WordPress: backend/wp-content/plugins/travel-agency-core/data/listing-schema.json.
 */
export interface SchemaOption {
  value: string
  label: string
}

export interface SchemaField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'boolean' | 'list' | 'rows' | 'itinerary'
  required: boolean
  options?: SchemaOption[]
  columns?: SchemaField[]
  help?: string
  placeholder?: string
  max?: number
  show_if?: { field: string; in?: string[]; not_in?: string[] }
}

export interface SchemaSection {
  title: string
  key?: string
  step?: number
  help?: string
  fields: SchemaField[]
  group?: 'common' | 'category'
}

export interface SchemaCategory {
  slug: string
  name: string
  listingType: string
  phase: number
  menuGroup: string
  useFor: string
  specialFeature: string
  subtypes: { slug: string; name: string }[]
  sections: SchemaSection[]
}

export interface ListingTypeDef {
  key: string
  label: string
  booking: string
  bookingFields: string[]
}

export interface ListingSchema {
  version: number
  listingTypes: ListingTypeDef[]
  common: SchemaSection[]
  categories: SchemaCategory[]
  menuGroups: { key: string; label: string }[]
  onboarding: { key: string; label: string }[]
  filters: string[]
  wizardSteps: string[]
}

export const listingSchema = schema as unknown as ListingSchema

export const categoryDef = (slug: string | undefined) => listingSchema.categories.find((c) => c.slug === slug)

export const listingTypeDef = (key: string | undefined) => listingSchema.listingTypes.find((t) => t.key === key)

/** Common sections plus the category's own; a category field replaces the common one with the same key. */
export function sectionsFor(slug: string | undefined): SchemaSection[] {
  const cat = categoryDef(slug)
  const own = cat?.sections ?? []
  const ownKeys = new Set(own.flatMap((s) => s.fields.map((f) => f.key)))
  return [
    ...listingSchema.common.map((s) => ({ ...s, group: 'common' as const, fields: s.fields.filter((f) => !ownKeys.has(f.key)) })),
    ...own.map((s) => ({ ...s, group: 'category' as const })),
  ]
}

/** All field definitions by key (first definition wins), for labels when displaying values. */
export const allFields: Record<string, SchemaField> = Object.fromEntries(
  [...listingSchema.common, ...listingSchema.categories.flatMap((c) => c.sections)]
    .flatMap((s) => s.fields)
    .reverse()
    .map((f) => [f.key, f]),
)

export function optionLabel(key: string, value: string) {
  return allFields[key]?.options?.find((o) => o.value === value)?.label ?? value
}

/** Whether a conditional field applies, given the other values. */
export function fieldVisible(field: SchemaField, get: (key: string) => unknown) {
  const cond = field.show_if
  if (!cond) return true
  const v = String(get(cond.field) ?? '')
  return cond.in ? cond.in.includes(v) : !(cond.not_in ?? []).includes(v)
}

export type FieldValues = Record<string, unknown>

/** Wizard step of a section: the common sections carry theirs, category sections are step 3. */
export const sectionStep = (s: SchemaSection) => s.step ?? 3

export function isEmptyValue(field: SchemaField, v: unknown) {
  if (v == null) return true
  if (Array.isArray(v)) return v.length === 0
  if (field.type === 'boolean') return false
  return String(v).trim() === ''
}

export interface MissingItem {
  key: string
  label: string
  step: number
}

/** What still stops a listing from being submitted (same rules as tac_listing_missing() in WordPress). */
export function missingFields(
  category: string,
  listing: { title: string; description: string; values: FieldValues; hasCover: boolean },
): MissingItem[] {
  if (!categoryDef(category)) return [{ key: 'listing_category', label: 'Category', step: 1 }]
  const missing: MissingItem[] = []
  if (!listing.title.trim()) missing.push({ key: 'title', label: 'Title', step: 2 })
  if (listing.description.replace(/<[^>]*>/g, '').trim().length < 80)
    missing.push({ key: 'description', label: 'Overview (at least 80 characters)', step: 2 })
  if (!listing.hasCover) missing.push({ key: 'photo', label: 'Cover photo', step: 6 })
  const get = (k: string) => listing.values[k]
  for (const sec of sectionsFor(category)) {
    for (const f of sec.fields) {
      if (f.required && fieldVisible(f, get) && isEmptyValue(f, get(f.key))) {
        missing.push({ key: f.key, label: f.label, step: sectionStep(sec) })
      }
    }
  }
  return missing
}

/** A value as text for travellers: option labels, "Yes", lists joined. */
export function displayValue(field: SchemaField, v: unknown): string {
  if (field.type === 'boolean') return v ? 'Yes' : 'No'
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? optionLabel(field.key, x) : '')).filter(Boolean).join(', ')
  if (field.type === 'select') return optionLabel(field.key, String(v))
  return String(v ?? '')
}
