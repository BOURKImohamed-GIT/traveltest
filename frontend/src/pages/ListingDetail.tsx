import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import BookingCard from '../components/BookingCard'
import { CheckIcon, ClockIcon, PinIcon } from '../components/Icons'
import Img from '../components/Img'
import { SaveButton } from '../components/ListingCard'
import Rating from '../components/Rating'
import Reviews from '../components/Reviews'
import { useAsync } from '../useAsync'
import NotFound from './NotFound'

export default function ListingDetail() {
  const { slug = '' } = useParams()
  const { data: listing, error } = useAsync(() => api.listing(slug), [slug])

  if (error && 'status' in error && error.status === 404) return <NotFound />
  if (error) return <p className="container notice error">{error.message}</p>
  if (!listing) {
    return (
      <div className="container" aria-busy="true">
        <div className="skeleton" style={{ height: 36, width: '60%', margin: '32px 0 12px' }} />
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    )
  }

  const gallery = listing.gallery?.length ? listing.gallery : [listing.image]

  return (
    <div className="container">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        {listing.destination && (
          <>
            <span aria-hidden="true">›</span>
            <Link to={`/destinations/${listing.destination.slug}`}>{listing.destination.name}</Link>
          </>
        )}
        {listing.type && (
          <>
            <span aria-hidden="true">›</span>
            <Link to={`/search?type=${listing.type.slug}${listing.destination ? `&destination=${listing.destination.slug}` : ''}`}>
              {listing.type.name}
            </Link>
          </>
        )}
      </nav>

      <header className="detail-head">
        <h1>{listing.title}</h1>
        <div className="detail-meta">
          {listing.reviewCount > 0 ? (
            <a href="#reviews" style={{ textDecoration: 'none' }}>
              <Rating value={listing.rating} count={listing.reviewCount} showValue size="lg" />
            </a>
          ) : (
            <span className="card-meta">No reviews yet</span>
          )}
          {listing.location && (
            <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              <PinIcon size={16} /> {listing.location}
            </span>
          )}
          {listing.duration && listing.duration !== 'per night' && (
            <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              <ClockIcon size={16} /> {listing.duration}
            </span>
          )}
        </div>
      </header>

      <div className="gallery" style={{ position: 'relative' }}>
        {gallery.slice(0, 3).map((src, i) => (
          <div key={i}>
            <Img src={src} alt={i === 0 ? listing.title : ''} loading={i === 0 ? 'eager' : 'lazy'} fallbackText={i === 0 ? listing.title : ''} />
          </div>
        ))}
        <SaveButton slug={listing.slug} title={listing.title} />
      </div>

      <div className="detail-layout">
        <div>
          <section className="detail-section" aria-labelledby="about-h">
            <h2 id="about-h">About</h2>
            {/* Content comes from WordPress editors and is already filtered by the_content. */}
            <div className="prose" dangerouslySetInnerHTML={{ __html: listing.description ?? '' }} />
          </section>

          {listing.highlights && listing.highlights.length > 0 && (
            <section className="detail-section" aria-labelledby="hl-h">
              <h2 id="hl-h">Highlights</h2>
              <ul className="highlights">
                {listing.highlights.map((h) => (
                  <li key={h}>
                    <CheckIcon size={18} /> {h}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Reviews listing={listing} />
        </div>

        <BookingCard listing={listing} />
      </div>
    </div>
  )
}
