import { Link } from 'react-router-dom'
import { formatPrice, priceUnit } from '../format'
import { useSaved } from '../saved'
import type { Listing } from '../types'
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

export default function ListingCard({ listing }: { listing: Listing }) {
  return (
    <div className="card">
      <SaveButton slug={listing.slug} title={listing.title} />
      <Link to={`/listings/${listing.slug}`} className="card" style={{ textDecoration: 'none' }}>
        <div className="card-media">
          {listing.rating >= 4.5 && listing.reviewCount > 0 && <span className="badge">Guest favourite</span>}
          <Img src={listing.image} alt="" fallbackText={listing.title} />
        </div>
        <div className="card-body">
          <h3 className="card-title">{listing.title}</h3>
          {listing.reviewCount > 0 ? (
            <Rating value={listing.rating} count={listing.reviewCount} />
          ) : (
            <span className="card-meta">No reviews yet</span>
          )}
          <span className="card-meta">
            {listing.type?.name}
            {listing.destination && ` · ${listing.destination.name}`}
          </span>
          <span className="card-price">
            from <strong>{formatPrice(listing.price, listing.currency)}</strong> {priceUnit(listing.duration)}
          </span>
        </div>
      </Link>
    </div>
  )
}

export function ListingRow({ listing }: { listing: Listing }) {
  return (
    <div className="card">
      <SaveButton slug={listing.slug} title={listing.title} />
      <Link to={`/listings/${listing.slug}`} className="row-card">
        <div className="card-media">
          <Img src={listing.image} alt="" fallbackText={listing.title} />
        </div>
        <div className="row-body">
          <span className="card-meta">
            {listing.type?.name}
            {listing.location && ` · ${listing.location}`}
          </span>
          <h3>{listing.title}</h3>
          {listing.reviewCount > 0 ? (
            <Rating value={listing.rating} count={listing.reviewCount} />
          ) : (
            <span className="card-meta">No reviews yet</span>
          )}
          <p className="excerpt">{listing.excerpt}</p>
          <div className="row-foot">
            <span>
              {listing.duration && <span className="card-meta">{listing.duration}</span>}
              {listing.freeCancel && (
                <>
                  <br />
                  <span className="tag-green">Free cancellation</span>
                </>
              )}
            </span>
            <span className="card-price">
              from <strong>{formatPrice(listing.price, listing.currency)}</strong>
            </span>
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
