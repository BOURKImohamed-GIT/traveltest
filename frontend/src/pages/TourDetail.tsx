import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import BookingCard from '../components/BookingCard'
import { CalendarIcon, CheckIcon, ClockIcon, LanguageIcon, PinIcon, ShieldIcon, UsersIcon, XIcon } from '../components/Icons'
import Img from '../components/Img'
import Rating from '../components/Rating'
import Reviews from '../components/Reviews'
import { SaveButton } from '../components/TourCard'
import { useAsync } from '../useAsync'
import NotFound from './NotFound'

export default function TourDetail() {
  const { slug = '' } = useParams()
  const { data: tour, error } = useAsync(() => api.tour(slug), [slug])

  if (error && 'status' in error && error.status === 404) return <NotFound />
  if (error) return <p className="container notice error">{error.message}</p>
  if (!tour) {
    return (
      <div className="container" aria-busy="true">
        <div className="skeleton" style={{ height: 36, width: '60%', margin: '32px 0 12px' }} />
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    )
  }

  const gallery = (tour.gallery?.length ? tour.gallery : [tour.image]).slice(0, 3)

  return (
    <div className="container">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        {tour.destination && (
          <>
            <span aria-hidden="true">›</span>
            <Link to={`/destinations/${tour.destination.slug}`}>{tour.destination.name} tours</Link>
          </>
        )}
        {tour.category && (
          <>
            <span aria-hidden="true">›</span>
            <Link to={`/search?category=${tour.category.slug}`}>{tour.category.name}</Link>
          </>
        )}
      </nav>

      <header className="detail-head">
        <h1>{tour.title}</h1>
        <div className="detail-meta">
          {tour.reviewCount > 0 ? (
            <a href="#reviews" style={{ textDecoration: 'none' }}>
              <Rating value={tour.rating} count={tour.reviewCount} showValue size="lg" />
            </a>
          ) : (
            <span className="card-meta">No reviews yet</span>
          )}
          {tour.location && (
            <span className="card-icon-row">
              <PinIcon size={16} /> {tour.location}
            </span>
          )}
        </div>
      </header>

      <div className={`gallery count-${gallery.length}`} style={{ position: 'relative' }}>
        {gallery.map((src, i) => (
          <div key={i}>
            <Img src={src} alt={i === 0 ? tour.title : ''} loading={i === 0 ? 'eager' : 'lazy'} fallbackText={i === 0 ? tour.title : ''} />
          </div>
        ))}
        <SaveButton slug={tour.slug} title={tour.title} />
      </div>

      <div className="detail-layout">
        <div>
          <section className="detail-section" aria-labelledby="about-h">
            <h2 id="about-h">About</h2>
            {/* Content comes from WordPress editors and is already filtered by the_content. */}
            <div className="prose" dangerouslySetInnerHTML={{ __html: tour.description ?? '' }} />
            <div className="fact-grid">
              {tour.duration && (
                <div className="fact">
                  <ClockIcon />
                  <div>
                    <strong>Duration</strong>
                    <span>{tour.duration}</span>
                  </div>
                </div>
              )}
              {tour.groupSize > 0 && (
                <div className="fact">
                  <UsersIcon />
                  <div>
                    <strong>Group size</strong>
                    <span>Up to {tour.groupSize} people</span>
                  </div>
                </div>
              )}
              {tour.languages && tour.languages.length > 0 && (
                <div className="fact">
                  <LanguageIcon />
                  <div>
                    <strong>Languages</strong>
                    <span>{tour.languages.join(', ')}</span>
                  </div>
                </div>
              )}
              <div className="fact">
                {tour.freeCancel ? <ShieldIcon /> : <CalendarIcon />}
                <div>
                  <strong>Cancellation</strong>
                  <span>{tour.freeCancel ? 'Free up to 24 hours before' : 'Ask when you book'}</span>
                </div>
              </div>
            </div>
          </section>

          {tour.highlights && tour.highlights.length > 0 && (
            <section className="detail-section" aria-labelledby="hl-h">
              <h2 id="hl-h">Highlights</h2>
              <ul className="highlights">
                {tour.highlights.map((h) => (
                  <li key={h}>
                    <CheckIcon size={18} /> {h}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tour.amenities && tour.amenities.length > 0 && (
            <section className="detail-section" aria-labelledby="am-h">
              <h2 id="am-h">{tour.priceUnit === 'per_night' ? 'Amenities' : 'Features'}</h2>
              <ul className="highlights">
                {tour.amenities.map((a) => (
                  <li key={a}>
                    <CheckIcon size={18} /> {a}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tour.itinerary && tour.itinerary.length > 0 && (
            <section className="detail-section" aria-labelledby="it-h">
              <h2 id="it-h">Itinerary</h2>
              <ol className="itinerary">
                {tour.itinerary.map((stop, i) => (
                  <li key={i}>
                    <h3>{stop.title}</h3>
                    {stop.details && <p>{stop.details}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {((tour.included?.length ?? 0) > 0 || (tour.notIncluded?.length ?? 0) > 0) && (
            <section className="detail-section" aria-labelledby="inc-h">
              <h2 id="inc-h">What's included</h2>
              <div className="incl-grid">
                <ul className="incl-list yes" aria-label="Included">
                  {tour.included?.map((x) => (
                    <li key={x}>
                      <CheckIcon size={18} /> {x}
                    </li>
                  ))}
                </ul>
                <ul className="incl-list no" aria-label="Not included">
                  {tour.notIncluded?.map((x) => (
                    <li key={x}>
                      <XIcon size={18} /> {x}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {tour.meetingPoint && (
            <section className="detail-section" aria-labelledby="mp-h">
              <h2 id="mp-h">Meeting point</h2>
              <p className="prose card-icon-row" style={{ margin: 0 }}>
                <PinIcon size={18} /> {tour.meetingPoint}
              </p>
            </section>
          )}

          <Reviews tour={tour} />
        </div>

        <BookingCard tour={tour} />
      </div>
    </div>
  )
}
