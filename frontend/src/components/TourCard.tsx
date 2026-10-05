import { Link } from 'react-router-dom'
import { formatPrice, unitLabel } from '../format'
import { useSaved } from '../saved'
import type { Tour } from '../types'
import { HeartIcon } from './Icons'
import Img from './Img'
import Rating from './Rating'

export function SaveButton({ slug, title }: { slug: string; title: string }) {
  const [saved, toggle] = useSaved(slug)
  return (
    <button
      type="button"
      className="save-btn"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      onClick={(e) => {
        e.preventDefault()
        toggle()
      }}
    >
      <HeartIcon size={18} />
    </button>
  )
}

/** "Pack tour", "Day trip"… from the tour's category. */
function kindLabel(tour: Tour) {
  const slug = tour.category?.slug ?? ''
  if (slug.startsWith('tours-from-') || slug === 'tour-packages') return 'Pack tour'
  if (slug === 'day-trips') return 'Day trip'
  if (slug === 'camping') return 'Camping'
  return slug ? 'Activity' : ''
}

/** Split "4 days / 3 nights", "3 days" or "6 hours" into the big and small parts of the card. */
function durationParts(duration: string): { main: string; sub: string } {
  const days = /(\d+)\s*days?/i.exec(duration)
  const nights = /(\d+)\s*nights?/i.exec(duration)
  if (days) {
    const d = Number(days[1])
    const n = nights ? Number(nights[1]) : d - 1
    return { main: `${d} ${d === 1 ? 'day' : 'days'}`, sub: n > 0 ? `${n} ${n === 1 ? 'night' : 'nights'}` : '' }
  }
  return { main: duration, sub: '' }
}

export default function TourCard({ tour }: { tour: Tour }) {
  const from = tour.startPoint || tour.destination?.name
  const { main, sub } = durationParts(tour.duration)
  const kind = kindLabel(tour)
  return (
    <div className="card tour-card">
      <SaveButton slug={tour.slug} title={tour.title} />
      <Link to={`/listings/${tour.slug}`} className="tour-card-link">
        <div className="card-media">
          <Img src={tour.image} alt="" fallbackText={tour.title} />
          {tour.excerpt && (
            <div className="card-overlay" aria-hidden="true">
              <p>{tour.excerpt}</p>
            </div>
          )}
        </div>
        <div className="card-panel">
          {from && <span className="card-tag">From {from}</span>}
          <div className="card-facts">
            {tour.price > 0 ? (
              <span className="card-price">
                from <strong>{formatPrice(tour.price, tour.currency)}</strong>
                <span>{unitLabel(tour.priceUnit)}</span>
              </span>
            ) : (
              <span className="card-price">
                <strong>Price</strong>
                <span>on request</span>
              </span>
            )}
            <span className="card-duration">
              {kind && <span className="card-kind">{kind}</span>}
              {main && (
                <span>
                  <strong>{main}</strong>
                  {sub && <> / <small>{sub}</small></>}
                </span>
              )}
            </span>
          </div>
          <h3 className="card-title">{tour.title}</h3>
          {tour.reviewCount > 0 && <Rating value={tour.rating} count={tour.reviewCount} />}
          <span className="card-cta">Read more details</span>
        </div>
      </Link>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="card tour-card" aria-hidden="true">
      <div className="card-media skeleton" />
      <div className="card-panel">
        <div className="skeleton" style={{ height: 24, width: '45%', marginLeft: 'auto' }} />
        <div className="skeleton" style={{ height: 16, width: '85%' }} />
      </div>
    </div>
  )
}
