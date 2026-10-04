import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { USING_SAMPLE_DATA } from '../config'
import { formatPrice, unitLabel } from '../format'
import type { Tour } from '../types'
import { CheckIcon } from './Icons'

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function BookingCard({ tour }: { tour: Tour }) {
  const { user } = useAuth()
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  const [guests, setGuests] = useState(2)
  const [nights, setNights] = useState(2)
  const isStay = tour.priceUnit === 'per_night'
  const isRestaurant = tour.category?.slug === 'restaurants'
  const total =
    tour.priceUnit === 'per_group' ? tour.price : isStay ? tour.price * nights : tour.price * guests

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setStatus('sending')
    try {
      await api.createInquiry({
        tourId: tour.id,
        name: String(f.get('name')),
        email: String(f.get('email')),
        phone: String(f.get('phone') ?? ''),
        date: String(f.get('date')),
        guests,
        message: [isStay ? `Nights: ${nights}` : '', String(f.get('message') ?? '')].filter(Boolean).join('\n\n'),
        website: String(f.get('website') ?? ''),
      })
      setStatus('sent')
    } catch (err) {
      setError((err as Error).message)
      setStatus('error')
    }
  }

  return (
    <aside className="booking-card" aria-labelledby="book-h">
      <div className="from">from</div>
      <div className="price">
        {formatPrice(tour.price, tour.currency)} <span className="from">{unitLabel(tour.priceUnit)}</span>
      </div>
      {tour.freeCancel && (
        <p className="tag-green" style={{ margin: '6px 0 0', display: 'flex', gap: 6, alignItems: 'center' }}>
          <CheckIcon size={16} /> Free cancellation up to 24 hours before
        </p>
      )}

      {status === 'sent' ? (
        <div className="notice success" style={{ marginTop: 16 }} role="status">
          {USING_SAMPLE_DATA ? (
            <>
              <strong>Preview only.</strong> On the live site this request goes to {tour.host ? tour.host.name : 'the business'} by email.
            </>
          ) : (
            <>
              <strong>Request sent!</strong> {tour.host ? tour.host.name : 'Our team'} will email you to confirm availability.
            </>
          )}{' '}
          {user ? (
            <Link to="/account/bookings">See it in My bookings</Link>
          ) : (
            <Link to={`/signin?type=client&next=${encodeURIComponent('/account/bookings')}`}>Sign in with the same email to track it</Link>
          )}
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <h2 id="book-h" style={{ fontSize: '1.1rem' }}>
            {isRestaurant ? 'Request a table' : 'Check availability'}
          </h2>
          <div className="form-row">
            <div className="field">
              <label htmlFor="bk-date">{isStay ? 'Check-in' : 'Date'}</label>
              <input id="bk-date" name="date" type="date" className="input" required min={today()} />
            </div>
            <div className="field">
              <label htmlFor="bk-guests">{isStay || isRestaurant ? 'Guests' : 'Travelers'}</label>
              <select id="bk-guests" className="select" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                {Array.from({ length: Math.min(tour.groupSize || 12, 20) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {isStay && (
            <div className="field">
              <label htmlFor="bk-nights">Nights</label>
              <select id="bk-nights" className="select" value={nights} onChange={(e) => setNights(Number(e.target.value))}>
                {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!isRestaurant && tour.price > 0 && (
            <div className="total-row" aria-live="polite">
              <span>
                {tour.priceUnit === 'per_group'
                  ? 'Group price'
                  : `${isStay ? nights : guests} × ${formatPrice(tour.price, tour.currency)}`}
              </span>
              <strong>{formatPrice(total, tour.currency)}</strong>
            </div>
          )}
          <div className="field">
            <label htmlFor="bk-name">Full name</label>
            <input id="bk-name" name="name" className="input" required autoComplete="name" defaultValue={user?.name} />
          </div>
          <div className="field">
            <label htmlFor="bk-email">Email</label>
            <input id="bk-email" name="email" type="email" className="input" required autoComplete="email" defaultValue={user?.email} />
          </div>
          <div className="field">
            <label htmlFor="bk-phone">Phone (optional)</label>
            <input id="bk-phone" name="phone" type="tel" className="input" autoComplete="tel" defaultValue={user?.phone} />
          </div>
          <div className="field">
            <label htmlFor="bk-msg">Message (optional)</label>
            <textarea id="bk-msg" name="message" className="textarea" rows={3} />
          </div>
          <div className="hp" aria-hidden="true">
            <label htmlFor="bk-website">Website</label>
            <input id="bk-website" name="website" tabIndex={-1} autoComplete="off" />
          </div>
          {status === 'error' && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-brand btn-block" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : isRestaurant ? 'Request a table' : 'Request to book'}
          </button>
          <p className="fine">No payment now. {tour.host ? tour.host.name : 'Our team'} confirms availability and the final price by email.</p>
        </form>
      )}
    </aside>
  )
}
