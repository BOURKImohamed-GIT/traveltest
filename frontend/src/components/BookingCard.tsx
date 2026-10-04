import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { formatPrice, priceUnit } from '../format'
import type { Listing } from '../types'
import { CheckIcon } from './Icons'

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function BookingCard({ listing }: { listing: Listing }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  const [guests, setGuests] = useState(2)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setStatus('sending')
    try {
      await api.createInquiry({
        tourId: listing.id,
        name: String(f.get('name')),
        email: String(f.get('email')),
        phone: String(f.get('phone') ?? ''),
        date: String(f.get('date')),
        guests,
        message: String(f.get('message') ?? ''),
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
        {formatPrice(listing.price, listing.currency)} <span className="from">{priceUnit(listing.duration)}</span>
      </div>
      {listing.freeCancel && (
        <p className="tag-green" style={{ margin: '6px 0 0', display: 'flex', gap: 6, alignItems: 'center' }}>
          <CheckIcon size={16} /> Free cancellation up to 24 hours before
        </p>
      )}

      {status === 'sent' ? (
        <div className="notice success" style={{ marginTop: 16 }} role="status">
          <strong>Request sent!</strong> Our team will email you within 24 hours to confirm availability.
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <h2 id="book-h" style={{ fontSize: '1.1rem' }}>
            Check availability
          </h2>
          <div className="form-row">
            <div className="field">
              <label htmlFor="bk-date">Date</label>
              <input id="bk-date" name="date" type="date" className="input" required min={today()} />
            </div>
            <div className="field">
              <label htmlFor="bk-guests">{listing.duration === 'per night' ? 'Guests' : 'Travelers'}</label>
              <select id="bk-guests" className="select" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="bk-name">Full name</label>
            <input id="bk-name" name="name" className="input" required autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="bk-email">Email</label>
            <input id="bk-email" name="email" type="email" className="input" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="bk-phone">Phone (optional)</label>
            <input id="bk-phone" name="phone" type="tel" className="input" autoComplete="tel" />
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
            {status === 'sending' ? 'Sending…' : 'Request to book'}
          </button>
          <p className="fine">No payment now. An agent confirms availability and price by email.</p>
        </form>
      )}
    </aside>
  )
}
