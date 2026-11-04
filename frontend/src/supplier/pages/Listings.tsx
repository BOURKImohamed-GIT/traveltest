import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAsync } from '../../useAsync'
import { supplierApi } from '../api'
import { LISTING_STATUS, type ListingRow, type ListingStatus } from '../types'

const FILTERS: (ListingStatus | 'all')[] = ['all', 'publish', 'pending', 'draft', 'archived']

export default function Listings() {
  const navigate = useNavigate()
  const [reload, setReload] = useState(0)
  const [filter, setFilter] = useState<ListingStatus | 'all'>('all')
  const [error, setError] = useState('')
  const { data, loading } = useAsync(() => supplierApi.listings(), [reload])

  async function act(l: ListingRow, action: 'archive' | 'restore' | 'duplicate' | 'delete') {
    if (action === 'delete' && !window.confirm(`Delete “${l.title || 'Untitled listing'}”? This cannot be undone.`)) return
    setError('')
    try {
      if (action === 'delete') await supplierApi.deleteListing(l.id)
      else {
        const result = await supplierApi.listingAction(l.id, action)
        if (action === 'duplicate') return navigate(`/supplier/listings/${result.id}`)
      }
      setReload((n) => n + 1)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const rows = (data ?? []).filter((l) => filter === 'all' || l.status === filter)

  return (
    <>
      <div className="dash-head">
        <h1 className="dash-title">My listings</h1>
        <Link to="/supplier/listings/new" className="btn btn-brand">
          Create a listing
        </Link>
      </div>
      <div className="pills" role="group" aria-label="Show">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={`pill${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : LISTING_STATUS[f]} ({(data ?? []).filter((l) => f === 'all' || l.status === f).length})
          </button>
        ))}
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {loading && !data ? (
        <p>Loading…</p>
      ) : rows.length === 0 ? (
        <p className="panel card-meta">No listings here yet.</p>
      ) : (
        <ul className="listing-rows">
          {rows.map((l) => (
            <li key={l.id} className="panel listing-row">
              {l.image ? <img src={l.image} alt="" /> : <span className="thumb-empty" aria-hidden="true" />}
              <div className="listing-row-main">
                <Link to={`/supplier/listings/${l.id}`} className="listing-row-title">
                  {l.title || 'Untitled listing'}
                </Link>
                <p className="card-meta">
                  <span className={`status-pill status-${l.status}`}>{LISTING_STATUS[l.status]}</span> {l.category}
                  {l.status === 'publish' && ` · ${l.views} views · ${l.inquiries} requests`}
                  {l.missing > 0 && l.status === 'draft' && ` · ${l.missing} required fields left`}
                </p>
                {l.note && <p className="notice info">Changes requested: {l.note}</p>}
              </div>
              <div className="listing-row-actions">
                {l.status !== 'archived' && (
                  <Link to={`/supplier/listings/${l.id}`} className="btn btn-outline">
                    Edit
                  </Link>
                )}
                {l.status === 'publish' && (
                  <Link to={`/tour/${l.slug}/`} className="btn btn-ghost">
                    View
                  </Link>
                )}
                <button type="button" className="btn btn-ghost" onClick={() => act(l, 'duplicate')}>
                  Duplicate
                </button>
                {l.status === 'archived' ? (
                  <button type="button" className="btn btn-ghost" onClick={() => act(l, 'restore')}>
                    Restore
                  </button>
                ) : (
                  l.status !== 'draft' && (
                    <button type="button" className="btn btn-ghost" onClick={() => act(l, 'archive')}>
                      Archive
                    </button>
                  )
                )}
                {(l.status === 'draft' || l.status === 'archived') && (
                  <button type="button" className="btn btn-ghost danger" onClick={() => act(l, 'delete')}>
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
