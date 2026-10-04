import { Link } from 'react-router-dom'
import { formatPrice, unitLabel } from '../format'
import { useSaved } from '../saved'
import type { Tour } from '../types'
import { ClockIcon, HeartIcon } from './Icons'
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

function Reviews({ tour }: { tour: Tour }) {
  return tour.reviewCount > 0 ? (
    <Rating value={tour.rating} count={tour.reviewCount} />
  ) : (
    <span className="card-meta">No reviews yet</span>
  )
}

export default function TourCard({ tour }: { tour: Tour }) {
  return (
    <div className="card">
      <SaveButton slug={tour.slug} title={tour.title} />
      <Link to={`/listings/${tour.slug}`} className="card" style={{ textDecoration: 'none' }}>
        <div className="card-media">
          {tour.rating >= 4.8 && tour.reviewCount > 0 && <span className="badge">Top rated</span>}
          <Img src={tour.image} alt="" fallbackText={tour.title} />
        </div>
        <div className="card-body">
          <span className="card-meta">
            {tour.category?.name}
            {(tour.destination?.name ?? tour.location) && ` · ${tour.destination?.name ?? tour.location}`}
          </span>
          <h3 className="card-title">{tour.title}</h3>
          <Reviews tour={tour} />
          {tour.duration && (
            <span className="card-meta card-icon-row">
              <ClockIcon size={14} /> {tour.duration}
            </span>
          )}
          {tour.price > 0 && (
            <span className="card-price">
              from <strong>{formatPrice(tour.price, tour.currency)}</strong> {unitLabel(tour.priceUnit)}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}

export function TourRow({ tour }: { tour: Tour }) {
  return (
    <div className="card">
      <SaveButton slug={tour.slug} title={tour.title} />
      <Link to={`/listings/${tour.slug}`} className="row-card">
        <div className="card-media">
          <Img src={tour.image} alt="" fallbackText={tour.title} />
        </div>
        <div className="row-body">
          <span className="card-meta">
            {tour.category?.name}
            {tour.location && ` · ${tour.location}`}
          </span>
          <h3>{tour.title}</h3>
          <Reviews tour={tour} />
          <p className="excerpt">{tour.excerpt}</p>
          <div className="row-foot">
            <span className="row-facts">
              {tour.duration && (
                <span className="card-meta card-icon-row">
                  <ClockIcon size={14} /> {tour.duration}
                </span>
              )}
              {tour.freeCancel && <span className="tag-green">Free cancellation</span>}
            </span>
            {tour.price > 0 && (
              <span className="card-price">
                from <strong>{formatPrice(tour.price, tour.currency)}</strong>
                <span className="card-meta"> {unitLabel(tour.priceUnit)}</span>
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="card" aria-hidden="true">
      <div className="card-media skeleton" />
      <div className="card-body">
        <div className="skeleton" style={{ height: 18, width: '85%' }} />
        <div className="skeleton" style={{ height: 14, width: '50%' }} />
      </div>
    </div>
  )
}
