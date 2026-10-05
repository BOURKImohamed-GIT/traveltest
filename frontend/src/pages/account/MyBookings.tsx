import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import Img from '../../components/Img'
import type { ClientBooking } from '../../types'
import { useAsync } from '../../useAsync'
import { formatDay } from '../../format'
import StatusPill from './BookingStatus'

function Row({ booking, onChange }: { booking: ClientBooking; onChange: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const open = booking.status === 'requested' || booking.status === 'confirmed'

  async function cancel() {
    setBusy(true)
    try {
      await api.cancelBooking(booking.id)
      onChange()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <li className="host-row">
      <div className="host-thumb">
        <Img src={booking.listing?.image} alt="" fallbackText="" />
      </div>
      <div className="host-info">
        <StatusPill status={booking.status} />
        <h3>
          {booking.listing?.live ? <Link to={`/listings/${booking.listing.slug}`}>{booking.listing.title}</Link> : booking.listing?.title ?? 'Listing removed'}
        </h3>
        <p className="card-meta">
          {formatDay(booking.date)} · {booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}
        </p>
        {booking.reply && <p className="reply">“{booking.reply}”</p>}
        {error && <p className="notice error">{error}</p>}
      </div>
      {open && (
        <div className="host-actions">
          {confirming ? (
            <span className="confirm">
              <button type="button" className="btn btn-danger" onClick={cancel} disabled={busy}>
                {busy ? 'Cancelling…' : 'Cancel booking'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setConfirming(true)}>
              Cancel
            </button>
          )}
        </div>
      )}
    </li>
  )
}

export default function MyBookings() {
  const [version, setVersion] = useState(0)
  const bookings = useAsync(() => api.myBookings(), [version])

  return (
    <section aria-labelledby="bk-h">
      <h2 id="bk-h" className="account-title">
        My bookings
      </h2>
      {bookings.error && <p className="notice error">Couldn't load your bookings: {bookings.error.message}</p>}
      {bookings.loading && !bookings.data && <p className="card-meta">Loading…</p>}
      {bookings.data?.length === 0 && (
        <div className="empty">
          <h2>No bookings yet</h2>
          <p>Booking requests you send appear here, with our team's reply.</p>
          <Link to="/search" className="btn btn-brand" style={{ marginTop: 16 }}>
            Find something to book
          </Link>
        </div>
      )}
      <ul className="host-list">
        {bookings.data?.map((b) => (
          <Row key={b.id} booking={b} onChange={() => setVersion((v) => v + 1)} />
        ))}
      </ul>
    </section>
  )
}
