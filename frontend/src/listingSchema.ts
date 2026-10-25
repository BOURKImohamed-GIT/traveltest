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
