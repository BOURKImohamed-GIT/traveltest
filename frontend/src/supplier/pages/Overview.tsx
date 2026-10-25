import { Link } from 'react-router-dom'
import { useAsync } from '../../useAsync'
import { supplierApi } from '../api'
import { useSupplier } from '../sessionContext'
import { LISTING_STATUS } from '../types'

/** Dashboard home: onboarding checklist, numbers, what needs an answer. */
export default function Overview() {
  const { user } = useSupplier()
  const listings = useAsync(() => supplierApi.listings(), [])
  const bookings = useAsync(() => supplierApi.bookings(), [])
  if (!user) return null

  const required = user.checklist.filter((i) => !i.optional)
  const done = required.filter((i) => i.done).length
  const rows = listings.data ?? []
  const reqs = bookings.data ?? []
  const open = reqs.filter((b) => b.status === 'requested')
  const confirmed = reqs.filter((b) => b.status === 'confirmed' || b.status === 'completed').length
  const views = rows.reduce((n, l) => n + l.views, 0)

  return (
    <>
      <h1 className="dash-title">Welcome, {user.profile.contact_name || user.name}</h1>

      {done < required.length && (
        <section className="panel">
          <div className="panel-head">
            <h2>Finish setting up your account</h2>
            <span className="card-meta">
              {done} of {required.length} done
            </span>
          </div>
          <div className="progress" aria-hidden="true">
            <span style={{ width: `${(done / required.length) * 100}%` }} />
          </div>
          <ul className="checklist">
            {user.checklist.map((i) => (
              <li key={i.key} className={i.done ? 'done' : ''}>
                <span className="tick" aria-hidden="true">
                  {i.done ? '✓' : ''}
                </span>
                {i.label}
                {i.optional && <span className="fine"> (when online payment is switched on)</span>}
              </li>
            ))}
          </ul>
          <Link to="/supplier/profile" className="btn btn-brand">
            Complete your profile
          </Link>
        </section>
      )}

      <div className="stat-grid">
        <Stat label="Live listings" value={rows.filter((l) => l.status === 'publish').length} />
        <Stat label="Listing views" value={views} />
        <Stat label="Booking requests" value={reqs.length} />
        <Stat label="Confirmed" value={confirmed} hint={reqs.length ? `${Math.round((confirmed / reqs.length) * 100)}% of requests` : undefined} />
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>New requests</h2>
          <Link to="/supplier/bookings">All bookings</Link>
        </div>
        {open.length ? (
          <ul className="simple-list">
            {open.slice(0, 5).map((b) => (
              <li key={b.id}>
                <Link to={`/supplier/bookings#b${b.id}`}>
                  <strong>{b.name}</strong> · {b.listing?.title} · {b.date} · {b.guests} guests
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card-meta">No requests waiting for an answer.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Your listings</h2>
          <Link to="/supplier/listings/new" className="btn btn-brand">
            Create a listing
          </Link>
        </div>
        {rows.length ? (
          <ul className="simple-list">
            {rows.slice(0, 5).map((l) => (
              <li key={l.id}>
                <Link to={`/supplier/listings/${l.id}`}>{l.title || 'Untitled listing'}</Link> <span className={`status-pill status-${l.status}`}>{LISTING_STATUS[l.status]}</span>
                {l.note && <span className="fine"> · Changes requested</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="card-meta">You have no listings yet. Start with your best-selling tour or activity.</p>
        )}
      </section>
    </>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {hint && <span className="fine">{hint}</span>}
    </div>
  )
}
