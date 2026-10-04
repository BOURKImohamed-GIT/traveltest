import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { formatPrice, unitLabel } from '../format'
import Img from '../components/Img'
import type { ListingStatus, OwnedListing } from '../types'
import { useAsync } from '../useAsync'

const STATUS: Record<ListingStatus, { label: string; tone: string; help: string }> = {
  publish: { label: 'Live', tone: 'ok', help: 'Travellers can see and book this listing.' },
  pending: { label: 'In review', tone: 'wait', help: 'Our team checks new and edited listings, usually within 24 hours.' },
  draft: { label: 'Draft', tone: 'off', help: 'Not visible to travellers.' },
}

function Row({ listing, onDeleted }: { listing: OwnedListing; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const st = STATUS[listing.status] ?? STATUS.draft

  async function remove() {
    setBusy(true)
    try {
      await api.deleteListing(listing.id)
      onDeleted()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <li className="host-row">
      <div className="host-thumb">
        <Img src={listing.image} alt="" fallbackText="" />
      </div>
      <div className="host-info">
        <span className={`status-pill ${st.tone}`}>{st.label}</span>
        <h3>{listing.title}</h3>
        <p className="card-meta">
          {listing.category?.name} · {listing.location} · {formatPrice(listing.price, listing.currency)} {unitLabel(listing.priceUnit)}
        </p>
        <p className="fine">{st.help}</p>
        {error && <p className="notice error">{error}</p>}
      </div>
      <div className="host-actions">
        {listing.status === 'publish' && (
          <Link className="btn btn-ghost" to={`/listings/${listing.slug}`}>
            View
          </Link>
        )}
        <Link className="btn btn-outline" to={`/host/listings/${listing.id}/edit`}>
          Edit
        </Link>
        {confirming ? (
          <span className="confirm">
            <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
              Keep
            </button>
          </span>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
      </div>
    </li>
  )
}

export default function HostDashboard() {
  const { user, signOut } = useAuth()
  const [version, setVersion] = useState(0)
  const listings = useAsync(() => api.myListings(), [version])

  return (
    <div className="container">
      <div className="page-title host-head">
        <div>
          <h1>Your listings</h1>
          <p>Signed in as {user?.name} ({user?.email})</p>
        </div>
        <div className="host-head-actions">
          <Link to="/host/new" className="btn btn-brand">
            Add a listing
          </Link>
          <button type="button" className="btn btn-ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>

      {listings.error && <p className="notice error">Couldn't load your listings: {listings.error.message}</p>}
      {listings.loading && !listings.data && <p className="card-meta">Loading…</p>}
      {listings.data?.length === 0 && (
        <div className="empty">
          <h2>List your first business</h2>
          <p>Hotels, riads, auberges, desert camps, tours, activities and restaurants are all welcome.</p>
          <Link to="/host/new" className="btn btn-brand" style={{ marginTop: 16 }}>
            Add a listing
          </Link>
        </div>
      )}
      <ul className="host-list">
        {listings.data?.map((l) => (
          <Row key={l.id} listing={l} onDeleted={() => setVersion((v) => v + 1)} />
        ))}
      </ul>
    </div>
  )
}
