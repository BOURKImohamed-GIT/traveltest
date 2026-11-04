/** Choice filters (schema fields), in the order shown. Location is a single list; the rest are pills. */
export const CHOICE_FILTERS = [
  'duration_type',
  'city',
  'tour_style',
  'languages',
  'traveler_types',
  'activity_level',
  'booking_type',
  'time_of_day',
  'accessibility',
  'experience_style',
  'included_services',
] as const

/** Filter values as kept in the URL: ?languages=English,French&min_price=50… */
export function readFilters(params: URLSearchParams) {
  const list = (k: string) => (params.get(k) ?? '').split(',').filter(Boolean)
  return {
    filters: Object.fromEntries(CHOICE_FILTERS.map((k) => [k, list(k)]).filter(([, v]) => v.length)) as Record<string, string[]>,
    minPrice: params.get('min_price') ?? '',
    maxPrice: params.get('max_price') ?? '',
    rating: params.get('rating') ?? '',
    date: params.get('date') ?? '',
    freeCancel: params.get('free_cancel') === '1',
  }
}
