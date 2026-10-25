import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { USING_SAMPLE_DATA } from '../config'
import { formatPrice, unitLabel } from '../format'
import { listingTypeDef, optionLabel } from '../listingSchema'
import type { Tour } from '../types'
import { CheckIcon } from './Icons'

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Row = Record<string, string>

const rowsOf = (v: unknown) => (Array.isArray(v) ? (v as Row[]).filter((r) => r && typeof r === 'object' && (r.name || r.from)) : [])
const listOf = (v: unknown) => (Array.isArray(v) ? (v as string[]).filter((x) => typeof x === 'string' && x) : [])
const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)

const CANCELLATION: Record<string, string> = {
  free_24h: 'Free cancellation up to 24 hours before',
  free_48h: 'Free cancellation up to 48 hours before',
  free_7d: 'Free cancellation up to 7 days before',
}

/**
 * "Request to book": the questions depend on the listing type (time slot, package, ticket,
 * pickup and flight…). No payment; the supplier or the agency answers by email.
 */
export default function BookingCard({ tour }: { tour: Tour }) {
  const f = tour.fields ?? {}
  const asks = new Set(listingTypeDef(tour.listingType)?.bookingFields ?? ['date', 'adults'])
  const isEvent = asks.has('ticket')
  const isTransfer = asks.has('pickup')

  // Choices the supplier set up in the listing.
  const options = rowsOf(f.seat_options)
  const packages = rowsOf(f.packages)
  const tickets = rowsOf(f.tickets)
  const routes = rowsOf(f.routes)
  const times = listOf(f.start_times).length ? listOf(f.start_times) : listOf(f.sun_sessions).map((v) => optionLabel('sun_sessions', v))
  const eventDates = listOf(f.event_dates)
  const max = Math.min(tour.groupSize || 12, 30)

  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  const [adults, setAdults] = useState(Math.min(2, max))
  const [children, setChildren] = useState(0)
  const [choice, setChoice] = useState(0)

  const priced = isEvent ? tickets : asks.has('package') ? packages : asks.has('option') ? options : isTransfer ? routes : []
  const chosen = priced[choice]
  const unitPrice = chosen && Number(chosen.price) > 0 ? Number(chosen.price) : tour.price
  const people = adults + children
  const perUnit = tour.priceUnit === 'per_group' || tour.priceUnit === 'per_vehicle' || (isTransfer && !!chosen)
  const total = perUnit ? unitPrice : unitPrice * people
  const showTotal = tour.showPrice !== false && unitPrice > 0 && tour.priceUnit !== 'custom_quote'

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const s = (k: string) => String(form.get(k) ?? '').trim()
    const details: Record<string, string | number> = isEvent ? { quantity: adults } : { adults, ...(children ? { children } : {}) }
    if (s('time')) details.time = s('time')
    if (chosen && isTransfer) Object.assign(details, { pickup: chosen.from, dropoff: chosen.to })
    else if (chosen) details[isEvent ? 'ticket' : asks.has('package') ? 'package' : 'option'] = chosen.name
    for (const k of ['pickup', 'dropoff', 'flight', 'luggage']) if (s(k)) details[k] = s(k)
    setStatus('sending')
    try {
      await api.createInquiry({
        tourId: tour.id,
        name: s('name'),
        email: s('email'),
        phone: s('phone'),
        date: s('date'),
        guests: people,
        message: s('message'),
        details,
        website: s('website'),
      })
      setStatus('sent')
    } catch (err) {
      setError((err as Error).message)
      setStatus('error')
    }
  }

  const cancellation = CANCELLATION[String(f.cancellation_policy ?? '')] ?? (tour.freeCancel ? CANCELLATION.free_24h : '')
  const answeredBy = tour.supplier?.slug ? tour.supplier.name : 'Our team'

  return (
    <aside className="booking-card" id="book" aria-labelledby="book-h">
      {tour.price > 0 && tour.priceUnit !== 'custom_quote' ? (
        <>
          <div className="from">from</div>
          <div className="price">
            {formatPrice(tour.price, tour.currency)} <span className="from">{unitLabel(tour.priceUnit)}</span>
          </div>
        </>
      ) : (
        <div className="price">Price on request</div>
      )}
      {cancellation && (
        <p className="tag-green" style={{ margin: '6px 0 0', display: 'flex', gap: 6, alignItems: 'center' }}>
          <CheckIcon size={16} /> {cancellation}
        </p>
      )}

      {status === 'sent' ? (
        <div className="notice success" style={{ marginTop: 16 }} role="status">
          {USING_SAMPLE_DATA ? (
            <>
              <strong>Preview only.</strong> On the live site this request goes to {answeredBy === 'Our team' ? 'our team' : answeredBy} by email.
            </>
          ) : (
            <>
              <strong>Request sent!</strong> {answeredBy} will email you to confirm availability and the price.
            </>
          )}
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <h2 id="book-h" style={{ fontSize: '1.1rem' }}>
            {isTransfer ? 'Request a transfer' : isEvent ? 'Request tickets' : 'Check availability'}
          </h2>

          {priced.length > 0 && (
            <div className="field">
              <label htmlFor="bk-choice">{isEvent ? 'Ticket type' : asks.has('package') ? 'Package' : isTransfer ? 'Route' : 'Option'}</label>
              <select id="bk-choice" className="select" value={choice} onChange={(e) => setChoice(Number(e.target.value))}>
                {priced.map((r, i) => (
                  <option key={i} value={i}>
                    {r.name || `${r.from} → ${r.to}`}
                    {Number(r.price) > 0 && tour.showPrice !== false ? ` – ${formatPrice(Number(r.price), tour.currency)}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-row">
            <div className="field">
              <label htmlFor="bk-date">{isEvent ? 'Event date' : isTransfer ? 'Pickup date' : 'Date'}</label>
              <input id="bk-date" name="date" type="date" className="input" required min={today()} />
              {isEvent && eventDates.length > 0 && <span className="fine">Dates: {eventDates.join(', ')}</span>}
            </div>
            {asks.has('time') && (
              <div className="field">
                <label htmlFor="bk-time">{isTransfer ? 'Pickup time' : 'Time'}</label>
                {times.length ? (
                  <select id="bk-time" name="time" className="select">
                    {times.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                ) : (
                  <input id="bk-time" name="time" type="time" className="input" />
                )}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="bk-adults">{isEvent ? 'Tickets' : isTransfer ? 'Passengers' : asks.has('children') ? 'Adults' : 'Travellers'}</label>
              <select id="bk-adults" className="select" value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
                {range(1, max).map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
            {asks.has('children') && (
              <div className="field">
                <label htmlFor="bk-children">Children</label>
                <select id="bk-children" className="select" value={children} onChange={(e) => setChildren(Number(e.target.value))}>
                  {range(0, Math.max(0, max - adults)).map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {isTransfer && (
            <>
              {!routes.length && (
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="bk-pickup">From</label>
                    <input id="bk-pickup" name="pickup" className="input" required placeholder="Airport, hotel or riad" />
                  </div>
                  <div className="field">
                    <label htmlFor="bk-dropoff">To</label>
                    <input id="bk-dropoff" name="dropoff" className="input" required />
                  </div>
                </div>
              )}
              <div className="form-row">
                <div className="field">
                  <label htmlFor="bk-flight">Flight number (optional)</label>
                  <input id="bk-flight" name="flight" className="input" placeholder="e.g. AT 803" />
                </div>
                <div className="field">
                  <label htmlFor="bk-luggage">Luggage (optional)</label>
                  <input id="bk-luggage" name="luggage" className="input" placeholder="e.g. 2 suitcases" />
                </div>
              </div>
            </>
          )}

          {showTotal && (
            <div className="total-row" aria-live="polite">
              <span>{perUnit ? (isTransfer ? 'Vehicle price' : 'Group price') : `${people} × ${formatPrice(unitPrice, tour.currency)}`}</span>
              <strong>{formatPrice(total, tour.currency)}</strong>
            </div>
          )}
          <div className="field">
            <label htmlFor="bk-name">Full name</label>
            <input id="bk-name" name="name" className="input" required autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="bk-email">Email</label>
            <input id="bk-email" name="email" type="email" className="input" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="bk-phone">Phone or WhatsApp (optional)</label>
            <input id="bk-phone" name="phone" type="tel" className="input" autoComplete="tel" />
          </div>
          <div className="field">
            <label htmlFor="bk-msg">Message (optional)</label>
            <textarea id="bk-msg" name="message" className="textarea" rows={3} placeholder={isTransfer ? 'Hotel address, child seats…' : 'Questions, dietary needs, pickup hotel…'} />
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
            {status === 'sending' ? 'Sending…' : f.booking_type === 'inquiry' ? 'Send inquiry' : 'Request to book'}
          </button>
          <p className="fine">No payment now. {answeredBy} confirms availability and the final price by email.</p>
        </form>
      )}
    </aside>
  )
}
