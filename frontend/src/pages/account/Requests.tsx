import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import type { SupplierRequest } from '../../types'
import { useAsync } from '../../useAsync'
import { formatDay } from '../../format'
import StatusPill from './BookingStatus'

function Row({ request, onChange }: { request: SupplierRequest; onChange: () => void }) {
  const [answer, setAnswer] = useState<'confirmed' | 'declined' | null>(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    if (!answer) return
    setBusy(true)
    setError('')
    try {
      await api.answerRequest(request.id, answer, reply)
      onChange()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <li className="request-row">
      <div className="request-main">
        <StatusPill status={request.status} />
        <h3>{request.listing?.title ?? 'Listing removed'}</h3>
        <p className="card-meta">
          {formatDay(request.date)} · {request.guests} {request.guests === 1 ? 'guest' : 'guests'}
        </p>
        <p className="request-client">
          <strong>{request.client.name}</strong> · <a href={`mailto:${request.client.email}`}>{request.client.email}</a>
          {request.client.phone && ` · ${request.client.phone}`}
        </p>
        {request.message && <p className="reply">“{request.message}”</p>}
        {request.reply && <p className="fine">Your reply: {request.reply}</p>}
      </div>
      {request.status === 'requested' && (
        <div className="request-actions">
          {answer ? (
            <div className="form">
              <div className="field">
                <label htmlFor={`reply-${request.id}`}>{answer === 'confirmed' ? 'Message to the client (optional)' : 'Reason (optional)'}</label>
                <textarea
                  id={`reply-${request.id}`}
                  className="textarea"
                  rows={2}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={answer === 'confirmed' ? 'Pickup time, what to bring…' : 'Fully booked that day…'}
                />
              </div>
              <div className="form-actions">
                <button type="button" className={`btn ${answer === 'confirmed' ? 'btn-brand' : 'btn-danger'}`} onClick={send} disabled={busy}>
                  {busy ? 'Sending…' : answer === 'confirmed' ? 'Confirm booking' : 'Decline request'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setAnswer(null)}>
                  Back
                </button>
              </div>
              <p className="fine">The client gets an email with your answer.</p>
            </div>
          ) : (
            <div className="form-actions">
              <button type="button" className="btn btn-brand" onClick={() => setAnswer('confirmed')}>
                Confirm
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setAnswer('declined')}>
                Decline
              </button>
            </div>
          )}
          {error && <p className="notice error">{error}</p>}
        </div>
      )}
    </li>
  )
}

export default function Requests() {
  const [version, setVersion] = useState(0)
  const requests = useAsync(() => api.myRequests(), [version])
  const waiting = requests.data?.filter((r) => r.status === 'requested').length ?? 0

  return (
    <section aria-labelledby="rq-h">
      <h2 id="rq-h" className="account-title">
        Booking requests {waiting > 0 && <span className="count-badge">{waiting} waiting</span>}
      </h2>
      {requests.error && <p className="notice error">Couldn't load requests: {requests.error.message}</p>}
      {requests.loading && !requests.data && <p className="card-meta">Loading…</p>}
      {requests.data?.length === 0 && (
        <div className="empty">
          <h2>No requests yet</h2>
          <p>When travellers request one of your listings, it appears here and in your inbox.</p>
          <Link to="/account/listings" className="btn btn-outline" style={{ marginTop: 16 }}>
            See your listings
          </Link>
        </div>
      )}
      <ul className="host-list">
        {requests.data?.map((r) => (
          <Row key={r.id} request={r} onChange={() => setVersion((v) => v + 1)} />
        ))}
      </ul>
    </section>
  )
}
