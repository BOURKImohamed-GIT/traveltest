import { Link } from 'react-router-dom'
import { formatPrice, unitLabel } from '../format'
import { optionLabel } from '../listingSchema'
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

const KIND: Record<string, string> = {
  multi_day: 'Pack tour',
  scheduled_excursion: 'Day trip',
  timed_activity: 'Activity',
  class_workshop: 'Class',
  experience_package: 'Experience',
  event_ticket: 'Event',
  transfer: 'Transfer',
}

/** "Pack tour", "Day trip", "Class"… from the listing type (older listings: from the category). */
function kindLabel(tour: Tour) {
  if (tour.listingType && KIND[tour.listingType]) return tour.category?.slug === 'city-tours' ? 'City tour' : KIND[tour.listingType]
  const slug = tour.category?.slug ?? ''
  if (slug.startsWith('tours-from-') || slug === 'tour-packages') return 'Pack tour'
  if (slug === 'day-trips') return 'Day trip'
  return slug ? 'Activity' : ''
}

export default function TourCard({ tour }: { tour: Tour }) {
  const kind = kindLabel(tour)
  const style = tour.tourStyle ? optionLabel('tour_style', tour.tourStyle) : ''
  return (
    <div className="card tour-card">
      <Link to={`/tour/${tour.slug}/`} className="tour-card-link">
        <div className="card-media">
          <Img src={tour.image} alt="" fallbackText={tour.title} />
        </div>
        <div className="card-body">
          <span className="card-kind">{[kind, tour.startPoint && `From ${tour.startPoint}`].filter(Boolean).join(' · ')}</span>
          <h3 className="card-title">{tour.title}</h3>
          <p className="card-facts">
            {tour.duration && <span>{tour.duration}</span>}
            {style && <span>{style}</span>}
            {tour.freeCancel && <span className="ok">Free cancellation</span>}
          </p>
          {tour.reviewCount > 0 && <Rating value={tour.rating} count={tour.reviewCount} showValue />}
          <p className="card-price">
            {tour.price > 0 ? (
              <>
                From <strong>{formatPrice(tour.price, tour.currency)}</strong> {unitLabel(tour.priceUnit)}
              </>
            ) : (
              <strong>Price on request</strong>
            )}
          </p>
        </div>
      </Link>
      <SaveButton slug={tour.slug} title={tour.title} />
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="card tour-card" aria-hidden="true">
      <div className="card-media skeleton" />
      <div className="card-body">
        <div className="skeleton" style={{ height: 12, width: '40%' }} />
        <div className="skeleton" style={{ height: 18, width: '90%' }} />
        <div className="skeleton" style={{ height: 18, width: '35%', marginTop: 8 }} />
      </div>
    </div>
  )
}
