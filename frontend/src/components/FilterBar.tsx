import { useState, type FormEvent } from 'react'
import { CHOICE_FILTERS, readFilters } from '../filters'
import { allFields } from '../listingSchema'

const LABELS: Record<string, string> = {
  duration_type: 'Duration',
  city: 'Location',
  tour_style: 'Group type',
  languages: 'Language',
  traveler_types: 'Suitable for',
  activity_level: 'Activity level',
  booking_type: 'Booking type',
  time_of_day: 'Time of day',
  accessibility: 'Accessibility',
  experience_style: 'Experience style',
  included_services: 'Included',
}

const RATINGS = [
  ['4.5', '4.5+'],
  ['4', '4+'],
  ['3', '3+'],
]

const optionLabel = (key: string, v: string) => allFields[key]?.options?.find((o) => o.value === v)?.label ?? v

/**
 * Compact filters: a "Filters" button opening all 15 filters, plus chips for the active ones.
 * Changes are applied with "Show results".
 */
export default function FilterBar({ params, onApply }: { params: URLSearchParams; onApply: (changes: Record<string, string | undefined>) => void }) {
  const current = readFilters(params)
  const [open, setOpen] = useState(false)

  const chips: { label: string; remove: Record<string, string | undefined> }[] = [
    ...Object.entries(current.filters).flatMap(([k, values]) =>
      values.map((v) => ({ label: optionLabel(k, v), remove: { [k]: values.filter((x) => x !== v).join(',') || undefined } })),
    ),
    ...(current.minPrice || current.maxPrice
      ? [{ label: `€${current.minPrice || 0} – ${current.maxPrice ? `€${current.maxPrice}` : 'any'}`, remove: { min_price: undefined, max_price: undefined } }]
      : []),
    ...(current.rating ? [{ label: `Rated ${current.rating}+`, remove: { rating: undefined } }] : []),
    ...(current.date ? [{ label: `On ${current.date}`, remove: { date: undefined } }] : []),
    ...(current.freeCancel ? [{ label: 'Free cancellation', remove: { free_cancel: undefined } }] : []),
  ]

  function apply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const changes: Record<string, string | undefined> = {}
    for (const k of CHOICE_FILTERS) changes[k] = f.getAll(k).map(String).filter(Boolean).join(',') || undefined
    for (const k of ['min_price', 'max_price', 'rating', 'date']) changes[k] = String(f.get(k) ?? '') || undefined
    changes.free_cancel = f.get('free_cancel') ? '1' : undefined
    onApply(changes)
    setOpen(false)
  }

  const clearAll = Object.fromEntries([...CHOICE_FILTERS, 'min_price', 'max_price', 'rating', 'date', 'free_cancel'].map((k) => [k, undefined]))

  return (
    <div className="filter-bar">
      <div className="filter-row">
        <button type="button" className={`pill${chips.length ? ' active' : ''}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          Filters{chips.length ? ` (${chips.length})` : ''}
        </button>
        {chips.map((c) => (
          <button key={c.label + JSON.stringify(c.remove)} type="button" className="chip" onClick={() => onApply(c.remove)} aria-label={`Remove filter ${c.label}`}>
            {c.label} <span aria-hidden="true">✕</span>
          </button>
        ))}
        {chips.length > 1 && (
          <button type="button" className="link-button" onClick={() => onApply(clearAll)}>
            Clear all
          </button>
        )}
      </div>

      {open && (
        // Remount with the URL's values each time it opens.
        <form className="filter-panel panel" onSubmit={apply} key={params.toString()}>
          <div className="filter-grid">
            <div className="field">
              <label htmlFor="fl-date">Date</label>
              <input id="fl-date" name="date" type="date" className="input" defaultValue={current.date} />
            </div>
            <div className="field">
              <span className="label">Price (€)</span>
              <div className="price-range">
                <input name="min_price" type="number" min={0} className="input" aria-label="Minimum price" placeholder="Min" defaultValue={current.minPrice} />
                <input name="max_price" type="number" min={0} className="input" aria-label="Maximum price" placeholder="Max" defaultValue={current.maxPrice} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="fl-city">{LABELS.city}</label>
              <select id="fl-city" name="city" className="input" defaultValue={current.filters.city?.[0] ?? ''}>
                <option value="">Anywhere</option>
                {allFields.city?.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="fl-rating">Traveller rating</label>
              <select id="fl-rating" name="rating" className="input" defaultValue={current.rating}>
                <option value="">Any</option>
                {RATINGS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {CHOICE_FILTERS.filter((k) => k !== 'city').map((k) => (
            <fieldset key={k} className="filter-group">
              <legend>{LABELS[k]}</legend>
              <div className="check-pills">
                {allFields[k]?.options?.map((o) => (
                  <label key={o.value} className="check-pill">
                    <input type="checkbox" name={k} value={o.value} defaultChecked={current.filters[k]?.includes(o.value)} /> {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <label className="check">
            <input type="checkbox" name="free_cancel" defaultChecked={current.freeCancel} /> Free cancellation
          </label>

          <div className="form-actions filter-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-brand">
              Show results
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
