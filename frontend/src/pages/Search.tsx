import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useCategories } from '../categories'
import TourCard from '../components/TourCard'
import type { SortOption, TourQuery } from '../types'
import { useAsync } from '../useAsync'

const SORTS: { value: SortOption; label: string }[] = [
  { value: 'recommended', label: 'Most reviewed' },
  { value: 'rating', label: 'Traveler rating' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
]

const num = (v: string | null) => (v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : undefined)

export default function Search() {
  const [params, setParams] = useSearchParams()
  const query: TourQuery = {
    search: params.get('q') ?? undefined,
    category: params.get('category') ?? undefined,
    destination: params.get('destination') ?? undefined,
    sort: (params.get('sort') as SortOption) || 'recommended',
    page: num(params.get('page')) ?? 1,
    perPage: 10,
  }
  const key = params.toString()

  const results = useAsync(() => api.tours(query), [key])
  const { tree } = useCategories()
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

  const selected = query.category ? tree?.bySlug[query.category] : undefined
  const categoryName = selected?.slug === 'tour-packages' ? 'All tours' : selected?.name
  // The selected top-level group, e.g. "activities" when "camel-rides" is selected.
  const topSlug = selected ? (selected.parent ?? selected.slug) : undefined
  const subs = tree?.all.filter((c) => c.parent === topSlug) ?? []
  const destName = destinations.data?.find((d) => d.slug === query.destination)?.name
  const heading = query.search
    ? `Results for “${query.search}”`
    : [categoryName ?? 'Everything', destName && `in ${destName}`].filter(Boolean).join(' ')

  return (
    <div className="container">
      <div className="page-title">
        <h1>{heading}</h1>
        {results.data && (
          <p>
            {results.data.total} {results.data.total === 1 ? 'result' : 'results'}
          </p>
        )}
      </div>

      <div className="type-pills" aria-label="Tour type">
        <button type="button" className={`pill${!query.category ? ' active' : ''}`} onClick={() => update({ category: undefined })}>
          All
        </button>
        {tree?.all
          .filter((c) => !c.parent)
          .map((c) => (
            <button
              key={c.slug}
              type="button"
              className={`pill${topSlug === c.slug ? ' active' : ''}`}
              onClick={() => update({ category: c.slug })}
            >
              {c.name}
            </button>
          ))}
      </div>
      {subs.length > 0 && (
        <div className="type-pills sub-pills" aria-label="Type">
          {subs.map((c) => (
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
      )}

      <div className="search-layout">
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
              <h2>Nothing here yet</h2>
              <p>Try another type, or <Link to="/contact">contact us</Link> and we'll plan a trip for you.</p>
            </div>
          )}

          <div className="grid">{results.data?.items.map((t) => <TourCard key={t.id} tour={t} />)}</div>

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
