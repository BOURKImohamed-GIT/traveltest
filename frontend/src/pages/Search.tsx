import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { TourRow } from '../components/TourCard'
import Rating from '../components/Rating'
import type { SortOption, TourQuery } from '../types'
import { useAsync } from '../useAsync'

const SORTS: { value: SortOption; label: string }[] = [
  { value: 'recommended', label: 'Most reviewed' },
  { value: 'rating', label: 'Traveler rating' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
]

const num = (v: string | null) => (v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : undefined)

function PriceFilter({ min, max, onApply }: { min: string; max: string; onApply: (min: string, max: string) => void }) {
  const [minPrice, setMinPrice] = useState(min)
  const [maxPrice, setMaxPrice] = useState(max)
  return (
    <form
      className="price-inputs"
      onSubmit={(e) => {
        e.preventDefault()
        onApply(minPrice, maxPrice)
      }}
    >
      <input className="input" type="number" min={0} placeholder="Min" aria-label="Minimum price" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
      <span aria-hidden="true">–</span>
      <input className="input" type="number" min={0} placeholder="Max" aria-label="Maximum price" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
      <button type="submit" className="btn btn-outline" style={{ padding: '8px 14px' }}>
        Go
      </button>
    </form>
  )
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const query: TourQuery = {
    search: params.get('q') ?? undefined,
    category: params.get('category') ?? undefined,
    destination: params.get('destination') ?? undefined,
    minPrice: num(params.get('min_price')),
    maxPrice: num(params.get('max_price')),
    minRating: num(params.get('min_rating')),
    sort: (params.get('sort') as SortOption) || 'recommended',
    page: num(params.get('page')) ?? 1,
    perPage: 10,
  }
  const key = params.toString()

  const results = useAsync(() => api.tours(query), [key])
  const categories = useAsync(() => api.categories(), [])
  const destinations = useAsync(() => api.destinations(), [])

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  const categoryName = categories.data?.find((c) => c.slug === query.category)?.name
  const destName = destinations.data?.find((d) => d.slug === query.destination)?.name
  const heading = query.search
    ? `Results for “${query.search}”`
    : [categoryName ?? 'All tours', destName && `in ${destName}`].filter(Boolean).join(' ')

  return (
    <div className="container">
      <div className="page-title">
        <h1>{heading}</h1>
        {results.data && (
          <p>
            {results.data.total} {results.data.total === 1 ? 'tour' : 'tours'}
          </p>
        )}
      </div>

      <div className="type-pills" aria-label="Tour type">
        <button type="button" className={`pill${!query.category ? ' active' : ''}`} onClick={() => update({ category: undefined })}>
          All tours
        </button>
        {categories.data?.map((c) => (
          <button
            key={c.slug}
            type="button"
            className={`pill${query.category === c.slug ? ' active' : ''}`}
            onClick={() => update({ category: c.slug })}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="search-layout">
        <aside className="filters" aria-label="Filters">
          <fieldset>
            <legend>Destination</legend>
            <select
              className="select"
              value={query.destination ?? ''}
              onChange={(e) => update({ destination: e.target.value || undefined })}
              aria-label="Destination"
            >
              <option value="">Anywhere</option>
              {destinations.data?.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}, {d.country}
                </option>
              ))}
            </select>
          </fieldset>

          <fieldset>
            <legend>Traveler rating</legend>
            {[4.5, 4, 3].map((r) => (
              <label key={r} className="check">
                <input
                  type="radio"
                  name="min_rating"
                  checked={query.minRating === r}
                  onChange={() => update({ min_rating: String(r) })}
                />
                <Rating value={r} /> <span>& up</span>
              </label>
            ))}
            <label className="check">
              <input type="radio" name="min_rating" checked={query.minRating == null} onChange={() => update({ min_rating: undefined })} />
              Any rating
            </label>
          </fieldset>

          <fieldset>
            <legend>Price per adult</legend>
            <PriceFilter
              key={`${params.get('min_price')}-${params.get('max_price')}`}
              min={params.get('min_price') ?? ''}
              max={params.get('max_price') ?? ''}
              onApply={(min, max) => update({ min_price: min || undefined, max_price: max || undefined })}
            />
          </fieldset>

          {key && (
            <Link to="/search" className="btn btn-ghost">
              Clear all filters
            </Link>
          )}
        </aside>

        <section aria-live="polite">
          <div className="results-head">
            <span className="card-meta">{results.loading ? 'Loading…' : ''}</span>
            <label>
              <span className="visually-hidden">Sort by</span>
              <select className="select" value={query.sort} onChange={(e) => update({ sort: e.target.value })}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    Sort: {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {results.error && <p className="notice error">Couldn't load results: {results.error.message}</p>}

          {results.data && results.data.items.length === 0 && (
            <div className="empty">
              <h2>No tours match</h2>
              <p>Try removing a filter or searching for another destination.</p>
            </div>
          )}

          <div className="results-list">{results.data?.items.map((t) => <TourRow key={t.id} tour={t} />)}</div>

          {results.data && results.data.totalPages > 1 && (
            <nav className="pager" aria-label="Pagination">
              <button
                type="button"
                className="btn btn-outline"
                disabled={query.page! <= 1}
                onClick={() => update({ page: String(query.page! - 1) })}
              >
                Previous
              </button>
              <span>
                Page {query.page} of {results.data.totalPages}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                disabled={query.page! >= results.data.totalPages}
                onClick={() => update({ page: String(query.page! + 1) })}
              >
                Next
              </button>
            </nav>
          )}
        </section>
      </div>
    </div>
  )
}
