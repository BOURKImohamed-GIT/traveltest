import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAsync } from '../../useAsync'
import { supplierApi } from '../api'
import { BOOKING_DETAIL_LABELS, BOOKING_STATUS, type BookingStatus, type SupplierBooking } from '../types'

const FILTERS: (BookingStatus | 'open' | 'all')[] = ['open', 'confirmed', 'completed', 'all']
const FILTER_LABEL = { open: 'Need an answer', all: 'All' } as const

const isOpen = (b: SupplierBooking) => b.status === 'requested' || b.status === 'quoted'

/** Booking requests for the supplier's listings: answer with an offer, confirm, decline, mark completed. */
export default function Bookings() {
  const { hash } = useLocation()
  // A link to one request (#b123) shows all, so it is in the list.
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(() => (hash.startsWith('#b') ? 'all' : 'open'))
  const { data, loading, error } = useAsync(() => supplierApi.bookings(), [])
  const [changed, setChanged] = useState<Record<number, SupplierBooking>>({})
  const items = (data ?? []).map((b) => changed[b.id] ?? b)

  const shown = items.filter((b) => (filter === 'all' ? true : filter === 'open' ? isOpen(b) : b.status === filter))
  const update = (b: SupplierBooking) => setChanged((c) => ({ ...c, [b.id]: b }))

  return (
    <>
      <h1 className="dash-title">Bookings & inquiries</h1>
      <p className="card-meta">Requests from travellers. You also get each one by email and can simply reply to it.</p>
      <div className="pills" role="group" aria-label="Show">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={`pill${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'open' || f === 'all' ? FILTER_LABEL[f] : BOOKING_STATUS[f]} (
            {items.filter((b) => (f === 'all' ? true : f === 'open' ? isOpen(b) : b.status === f)).length})
          </button>
        ))}
      </div>
      {error && <p className="notice error">{error.message}</p>}
      {loading && !data ? (
        <p>Loading…</p>
      ) : shown.length === 0 ? (
        <p className="panel card-meta">Nothing here.</p>
      ) : (
        <ul className="booking-list">
          {shown.map((b) => (
            <BookingItem key={b.id} booking={b} onUpdate={update} open={hash === `#b${b.id}`} />
          ))}
        </ul>
      )}
    </>
  )
}

function BookingItem({ booking: b, onUpdate, open }: { booking: SupplierBooking; onUpdate: (b: SupplierBooking) => void; open: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function answer(status: BookingStatus | undefined, form?: HTMLFormElement) {
    const f = form ? new FormData(form) : null
    setBusy(true)
    setError('')
    try {
      onUpdate(
        await supplierApi.answerBooking(b.id, {
          status,
          ...(f ? { quote: String(f.get('quote') ?? '').trim(), reply: String(f.get('reply') ?? '').trim(), note: String(f.get('note') ?? '').trim() } : {}),
        }),
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const action = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value as BookingStatus | ''
    answer(action || undefined, e.currentTarget)
  }

  const closed = b.status === 'cancelled' || b.status === 'declined' || b.status === 'completed'

  return (
    <li id={`b${b.id}`} className="panel booking-item">
      <details open={open || b.status === 'requested'}>
        <summary>
          <span className={`status-pill status-${b.status}`}>{BOOKING_STATUS[b.status]}</span>
          <strong>{b.name}</strong>
          <span>{b.listing?.title ?? 'Listing removed'}</span>
          <span className="card-meta">
            {b.date} · {b.guests} {b.guests === 1 ? 'guest' : 'guests'}
          </span>
        </summary>
        <div className="booking-body">
          <dl className="facts">
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${b.email}`}>{b.email}</a>
            </dd>
            {b.phone && (
              <>
                <dt>Phone</dt>
                <dd>
                  <a href={`tel:${b.phone.replace(/[^\d+]/g, '')}`}>{b.phone}</a>
                </dd>
              </>
            )}
            {Object.entries(b.details).map(([k, v]) => (
              <div key={k} className="facts-pair">
                <dt>{BOOKING_DETAIL_LABELS[k] ?? k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            <dt>Received</dt>
            <dd>{new Date(b.createdAt).toLocaleString()}</dd>
          </dl>
          {b.message && <blockquote className="quote">{b.message}</blockquote>}
          {b.listing?.live && (
            <p className="fine">
              <Link to={`/tour/${b.listing.slug}/`}>View the listing</Link>
            </p>
          )}

          <form className="form" onSubmit={onSubmit}>
            {!closed && (
              <div className="form-row">
                <div className="field">
                  <label htmlFor={`q-${b.id}`}>Price of your offer</label>
                  <input id={`q-${b.id}`} name="quote" className="input" defaultValue={b.quote} placeholder="e.g. €240 for 3 people, transfer included" />
                </div>
              </div>
            )}
            <div className="field">
              <label htmlFor={`r-${b.id}`}>Message to the traveller</label>
              <textarea id={`r-${b.id}`} name="reply" className="textarea" rows={3} defaultValue={b.reply} placeholder="Pickup time and place, what to bring, how to pay…" />
              <span className="fine">Emailed with your answer; the traveller can reply to you directly.</span>
            </div>
            <div className="field">
              <label htmlFor={`n-${b.id}`}>Private note (only you see it)</label>
              <input id={`n-${b.id}`} name="note" className="input" defaultValue={b.note} />
            </div>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <div className="booking-actions">
              {!closed && (
                <>
                  <button type="submit" value="quoted" className="btn btn-outline" disabled={busy}>
                    Send offer
                  </button>
                  <button type="submit" value="confirmed" className="btn btn-brand" disabled={busy}>
                    Confirm booking
                  </button>
                  <button type="submit" value="declined" className="btn btn-ghost danger" disabled={busy}>
                    Decline
                  </button>
                </>
              )}
              {b.status === 'confirmed' && (
                <button type="submit" value="completed" className="btn btn-outline" disabled={busy}>
                  Mark completed
                </button>
              )}
              <button type="submit" value="" className="btn btn-ghost" disabled={busy}>
                Save note
              </button>
            </div>
          </form>
        </div>
      </details>
    </li>
  )
}
