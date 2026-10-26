import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Img from '../../components/Img'
import { formatDay } from '../../format'
import { BOOKING_DETAIL_LABELS } from '../../supplier/types'
import { useAsync } from '../../useAsync'
import { travellerApi } from '../api'
import { useTraveller } from '../sessionContext'
import { TRAVELLER_STATUS, type TravellerBooking } from '../types'

/** The signed-in traveller's booking requests, with the suppliers' offers and answers. */
export default function MyBookings() {
  const { user, signOut } = useTraveller()
  const [reload, setReload] = useState(0)
  const { data, loading, error } = useAsync(() => (user ? travellerApi.bookings() : Promise.resolve([] as TravellerBooking[])), [user?.id, reload])
  const [msg, setMsg] = useState('')

  if (user === undefined) return <div className="container section">Loading…</div>
  if (!user) return <Navigate to="/signin" replace state={{ from: '/account' }} />

  async function cancel(b: TravellerBooking) {
    if (!window.confirm(`Cancel your request for ${b.listing?.title ?? 'this experience'}?`)) return
    try {
      await travellerApi.cancel(b.id)
      setReload((n) => n + 1)
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  return (
    <div className="container section account-page">
      <div className="dash-head">
        <div>
          <h1 className="dash-title">My bookings</h1>
          <p className="card-meta">
            Signed in as {user.name} ({user.email})
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={signOut}>
          Sign out
        </button>
      </div>
      {msg && <p className="notice error">{msg}</p>}
      {error && <p className="notice error">{error.message}</p>}
      {loading && !data ? (
        <p>Loading…</p>
      ) : !data?.length ? (
        <div className="panel empty-cta">
          <p>No booking requests yet. Requests you send while signed in, or earlier with the same email, appear here.</p>
          <Link to="/search" className="btn btn-brand">
            Find experiences
          </Link>
        </div>
      ) : (
        <ul className="trip-list">
          {data.map((b) => (
            <li key={b.id} className="panel trip">
              <div className="trip-media">
                <Img src={b.listing?.image ?? null} alt="" fallbackText={b.listing?.title ?? ''} />
              </div>
              <div className="trip-body">
                <span className={`status-pill status-${b.status}`}>{TRAVELLER_STATUS[b.status]}</span>
                <h2>{b.listing ? b.listing.live ? <Link to={`/tour/${b.listing.slug}/`}>{b.listing.title}</Link> : b.listing.title : 'Experience removed'}</h2>
                <p className="card-meta">
                  {formatDay(b.date)} · {b.guests} {b.guests === 1 ? 'traveller' : 'travellers'}
                  {Object.entries(b.details)
                    .filter(([k]) => k !== 'adults' && k !== 'children')
                    .map(([k, v]) => ` · ${BOOKING_DETAIL_LABELS[k] ?? k}: ${v}`)}
                </p>
                {b.quote && b.status !== 'declined' && (
                  <p className="trip-offer">
                    Price: <strong>{b.quote}</strong>
                  </p>
                )}
                {b.reply && <blockquote className="quote">{b.reply}</blockquote>}
                {b.status === 'quoted' && <p className="fine">To accept the offer, reply to the email we sent you.</p>}
                {(b.status === 'requested' || b.status === 'quoted' || b.status === 'confirmed') && (
                  <button type="button" className="link-button danger" onClick={() => cancel(b)}>
                    Cancel request
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
