import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { USING_SAMPLE_DATA } from '../config'
import { formatMonth } from '../format'
import type { Review, Tour } from '../types'
import { useAsync } from '../useAsync'
import Rating from './Rating'

const LABELS = ['Terrible', 'Poor', 'Average', 'Very good', 'Excellent']
const TRIP_TYPES: Record<string, string> = {
  business: 'Business',
  couples: 'Couples',
  family: 'Family',
  friends: 'Friends',
  solo: 'Solo',
}

function ReviewForm({ tour, onDone }: { tour: Tour; onDone: () => void }) {
  const [rating, setRating] = useState(0)
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!rating) {
      setError('Please choose a rating.')
      setStatus('error')
      return
    }
    const f = new FormData(e.currentTarget)
    setStatus('sending')
    try {
      await api.createReview(tour.id, {
        author: String(f.get('author')),
        email: String(f.get('email')),
        rating,
        title: String(f.get('title')),
        content: String(f.get('content')),
        tripType: String(f.get('tripType') ?? ''),
        travelDate: String(f.get('travelDate') ?? ''),
        website: String(f.get('website') ?? ''),
      })
      onDone()
    } catch (err) {
      setError((err as Error).message)
      setStatus('error')
    }
  }

  return (
    <form className="form" onSubmit={submit} style={{ maxWidth: 560 }}>
      <div className="field">
        <span className="label" id="rate-label">
          Your rating {rating > 0 && `— ${LABELS[rating - 1]}`}
        </span>
        <div className="rating-input" role="radiogroup" aria-labelledby="rate-label">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} – ${LABELS[n - 1]}`}
              className={n <= rating ? 'on' : ''}
              onClick={() => setRating(n)}
            />
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="rv-title">Title</label>
        <input id="rv-title" name="title" className="input" required maxLength={120} />
      </div>
      <div className="field">
        <label htmlFor="rv-content">Your review</label>
        <textarea id="rv-content" name="content" className="textarea" rows={5} required minLength={20} />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="rv-trip">Who did you go with?</label>
          <select id="rv-trip" name="tripType" className="select" defaultValue="">
            <option value="">—</option>
            {Object.entries(TRIP_TYPES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rv-date">When?</label>
          <input id="rv-date" name="travelDate" type="month" className="input" />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="rv-author">Name</label>
          <input id="rv-author" name="author" className="input" required autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="rv-email">Email (not published)</label>
          <input id="rv-email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor="rv-website">Website</label>
        <input id="rv-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {status === 'error' && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div>
        <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
          {status === 'sending' ? 'Submitting…' : 'Submit review'}
        </button>
      </div>
    </form>
  )
}

function ReviewItem({ review }: { review: Review }) {
  const meta = [review.travelDate && `Traveled ${formatMonth(review.travelDate)}`, TRIP_TYPES[review.tripType]].filter(Boolean)
  return (
    <article className="review">
      <div className="review-author">
        <span className="avatar" aria-hidden="true">
          {review.author.charAt(0).toUpperCase()}
        </span>
        <strong>{review.author}</strong>
      </div>
      <Rating value={review.rating} />
      <h3>{review.title}</h3>
      <p>{review.content}</p>
      {meta.length > 0 && <div className="review-foot">{meta.join(' · ')}</div>}
    </article>
  )
}

export default function Reviews({ tour }: { tour: Tour }) {
  const reviews = useAsync(() => api.reviews(tour.id), [tour.id])
  const [writing, setWriting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const list = reviews.data ?? []
  const counts = [5, 4, 3, 2, 1].map((n) => list.filter((r) => r.rating === n).length)

  return (
    <section className="detail-section" id="reviews" aria-labelledby="reviews-h">
      <div className="section-head">
        <h2 id="reviews-h">Reviews</h2>
        {!writing && !submitted && (
          <button type="button" className="btn btn-outline" onClick={() => setWriting(true)}>
            Write a review
          </button>
        )}
      </div>

      {submitted && (
        <p className="notice success" role="status">
          {USING_SAMPLE_DATA
            ? 'Preview only. On the live site your review is sent to the team and appears once approved.'
            : 'Thanks! Your review has been sent and will appear once our team has checked it.'}
        </p>
      )}
      {writing && (
        <ReviewForm
          tour={tour}
          onDone={() => {
            setWriting(false)
            setSubmitted(true)
          }}
        />
      )}

      {tour.reviewCount > 0 && (
        <div className="review-summary" style={{ marginTop: 16 }}>
          <div>
            <div className="score">{tour.rating.toFixed(1)}</div>
            <Rating value={tour.rating} size="lg" />
            <div className="card-meta">{tour.reviewCount} reviews</div>
          </div>
          <div className="bars">
            {counts.map((c, i) => (
              <div className="bar-row" key={i}>
                <span>{LABELS[4 - i]}</span>
                <span className="bar">
                  <span style={{ width: `${list.length ? (c / list.length) * 100 : 0}%` }} />
                </span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {reviews.error && <p className="notice error">Couldn't load reviews: {reviews.error.message}</p>}
      {reviews.data && list.length === 0 && !writing && <p className="card-meta">No reviews yet. Took this tour? Be the first to review it.</p>}
      <div style={{ marginTop: 16 }}>
        {list.map((r) => (
          <ReviewItem key={r.id} review={r} />
        ))}
      </div>
    </section>
  )
}
