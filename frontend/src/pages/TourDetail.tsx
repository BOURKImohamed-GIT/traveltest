import { useCallback, useState, type ReactElement } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import BookingCard from '../components/BookingCard'
import FaqList from '../components/FaqList'
import {
  CalendarIcon,
  CarIcon,
  CheckIcon,
  ClockIcon,
  InfoIcon,
  LanguageIcon,
  PinIcon,
  ShieldIcon,
  UsersIcon,
  XIcon,
} from '../components/Icons'
import Img from '../components/Img'
import ListingDetails from '../components/ListingDetails'
import Lightbox from '../components/Lightbox'
import Rating from '../components/Rating'
import Reviews from '../components/Reviews'
import SupplierCard from '../components/SupplierCard'
import TourCard, { SaveButton } from '../components/TourCard'
import { detailGroups } from '../listingDetails'
import { optionLabel } from '../listingSchema'
import { formatPrice, unitLabel } from '../format'
import type { Tour } from '../types'
import { useAsync } from '../useAsync'
import NotFound from './NotFound'

/** Places on the route, e.g. "Marrakech → Merzouga → Fes". */
function routeStops(tour: Tour) {
  if (tour.location.includes('→')) return tour.location.split('→').map((s) => s.trim())
  const ends = [tour.startPoint, tour.endPoint].filter((s): s is string => !!s)
  if (ends.length === 2 && ends[0] !== ends[1]) return ends
  return [tour.location || ends[0] || ''].filter(Boolean)
}

/** Google Maps embed (no API key needed): a driving route, or a single place. */
function mapUrls(stops: string[]) {
  const place = (s: string) => encodeURIComponent(`${s}, Morocco`)
  if (stops.length > 1) {
    const [from, ...to] = stops
    const q = `saddr=${place(from)}&daddr=${to.map(place).join('+to:')}`
    return { embed: `https://maps.google.com/maps?${q}&output=embed`, link: `https://maps.google.com/maps?${q}` }
  }
  return {
    embed: `https://maps.google.com/maps?q=${place(stops[0])}&z=9&output=embed`,
    link: `https://maps.google.com/maps?q=${place(stops[0])}`,
  }
}

/** A few more tours in the same category, plus a day trip from the same starting city. */
async function loadRelated(tour: Tour) {
  const [same, days] = await Promise.all([
    tour.category ? api.tours({ category: tour.category.slug, perPage: 5 }) : null,
    tour.category?.slug !== 'day-trips' ? api.tours({ category: 'day-trips', perPage: 20 }) : null,
  ])
  const pick = (rows: Tour[] | undefined, n: number) => (rows ?? []).filter((t) => t.id !== tour.id).slice(0, n)
  const dayTrips = days?.items ?? []
  const dayTrip = dayTrips.filter((t) => t.startPoint && t.startPoint === tour.startPoint).slice(0, 1)
  return [...pick(same?.items, 4 - dayTrip.length), ...dayTrip]
}

const SECTIONS = [
  ['overview', 'About'],
  ['itinerary', 'Itinerary'],
  ['details', 'Details'],
  ['included', 'Included'],
  ['photos', 'Gallery'],
  ['map', 'Map'],
  ['faq', 'FAQ'],
  ['reviews', 'Reviews'],
] as const

export default function TourDetail() {
  const { slug = '' } = useParams()
  const { data: tour, error } = useAsync(() => api.tour(slug), [slug])
  const related = useAsync(() => (tour ? loadRelated(tour) : Promise.resolve([])), [tour?.id])
  const faq = useAsync(() => api.page('faqs').catch(() => null), [])
  // Index of the photo open in the slider, or null.
  const [slide, setSlide] = useState<number | null>(null)
  const closeSlider = useCallback(() => setSlide(null), [])
  const [allFaq, setAllFaq] = useState(false)

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

  const photos = tour.gallery?.length ? tour.gallery : [tour.image]
  const hero = photos.slice(0, 3)
  const stops = routeStops(tour)
  const map = stops.length ? mapUrls(stops) : null
  const hasItinerary = (tour.itinerary?.length ?? 0) > 0
  const hasIncluded = (tour.included?.length ?? 0) > 0 || (tour.notIncluded?.length ?? 0) > 0
  const shown: Record<string, boolean> = {
    overview: true,
    itinerary: hasItinerary,
    details: detailGroups(tour).length > 0,
    included: hasIncluded,
    photos: photos.length > 1,
    map: !!map,
    faq: !!faq.data,
    reviews: true,
  }

  const style = tour.tourStyle ? optionLabel('tour_style', tour.tourStyle) : ''
  const policy = String(tour.fields?.cancellation_policy ?? '')
  const days = ([] as unknown[]).concat(tour.fields?.operating_days ?? []).map(String)
  const runs = days.length === 7 ? 'Every day' : days.map((d) => optionLabel('operating_days', d)).join(', ')

  const pickup = tour.fields?.pickup_offered
  const languages = tour.languages ?? []
  // "About this activity": the key facts, GetYourGuide style.
  const facts = [
    {
      icon: <ShieldIcon />,
      label: policy && policy !== 'non_refundable' && policy !== 'custom' ? 'Free cancellation' : tour.freeCancel ? 'Free cancellation' : 'Cancellation policy',
      value: policy ? optionLabel('cancellation_policy', policy) : tour.freeCancel ? 'Cancel up to 24 hours in advance for a full refund' : 'Ask when you book',
    },
    { icon: <CalendarIcon />, label: 'Request now & pay later', value: 'Nothing to pay online: you pay once the date and price are confirmed' },
    tour.duration && { icon: <ClockIcon />, label: `Duration ${tour.duration}`, value: runs ? `Runs: ${runs}` : 'Check availability to see starting times' },
    languages.length > 0 && { icon: <LanguageIcon />, label: 'Live tour guide', value: languages.join(', ') },
    (pickup || tour.startPoint) && {
      icon: <CarIcon />,
      label: pickup ? 'Pickup included' : `Starts in ${tour.startPoint}`,
      value: pickup ? 'From your hotel or riad; confirm the address when you book' : tour.endPoint && tour.endPoint !== tour.startPoint ? `Ends in ${tour.endPoint}` : 'Meeting point below',
    },
    (style || tour.groupSize > 0) && {
      icon: <UsersIcon />,
      label: style ? `${style}${style === 'Private' ? ' tour' : ''}` : 'Group size',
      value: tour.groupSize > 0 ? `Up to ${tour.groupSize} participants` : '',
    },
  ].filter((f): f is { icon: ReactElement; label: string; value: string } => !!f)
  const kindLine = [tour.category?.name, tour.subtype?.name].filter(Boolean).join(' · ')
  const provider = tour.supplier

  return (
    <div className="container">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        {tour.category && (
          <>
            <span aria-hidden="true">›</span>
            <Link to={`/search?category=${tour.category.slug}`}>{tour.category.name}</Link>
          </>
        )}
      </nav>

      <header className="detail-head">
        {kindLine && <p className="detail-kind">{kindLine}</p>}
        <h1>{tour.title}</h1>
        <div className="detail-meta">
          {tour.reviewCount > 0 ? (
            <a href="#reviews" className="detail-rating">
              <Rating value={tour.rating} count={tour.reviewCount} showValue />
            </a>
          ) : (
            <span className="card-meta">New · no reviews yet</span>
          )}
          {provider && (
            <span className="card-meta">
              Activity provider:{' '}
              {provider.slug ? <Link to={`/provider/${provider.slug}`}>{provider.name}</Link> : <strong>{provider.name}</strong>}
              {provider.verified && ' ✓'}
            </span>
          )}
          {tour.location && (
            <span className="card-icon-row card-meta">
              <PinIcon size={16} /> {tour.location}
            </span>
          )}
        </div>
      </header>

      <div className={`gallery count-${hero.length}`} style={{ position: 'relative' }}>
        {hero.map((src, i) => (
          <button key={i} type="button" className="gallery-tile" onClick={() => setSlide(i)} aria-label={`Open photo ${i + 1} of ${photos.length}`}>
            <Img src={src} alt={i === 0 ? tour.title : ''} loading={i === 0 ? 'eager' : 'lazy'} fallbackText={i === 0 ? tour.title : ''} />
          </button>
        ))}
        <SaveButton slug={tour.slug} title={tour.title} />
        {photos.length > 1 && (
          <button type="button" className="gallery-all" onClick={() => setSlide(0)}>
            See all {photos.length} photos
          </button>
        )}
      </div>
      {slide != null && <Lightbox photos={photos} start={slide} title={tour.title} onClose={closeSlider} />}

      <nav className="section-nav" aria-label="On this page">
        {SECTIONS.filter(([id]) => shown[id]).map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>

      <div className="detail-layout">
        <div>
          {tour.excerpt && <p className="detail-lead">{tour.excerpt}</p>}

          <section className="detail-section" id="overview" aria-labelledby="ov-h">
            <h2 id="ov-h">About this activity</h2>
            <ul className="about-list">
              {facts.map((f) => (
                <li key={f.label}>
                  {f.icon}
                  <div>
                    <strong>{f.label}</strong>
                    {f.value && <span>{f.value}</span>}
                  </div>
                </li>
              ))}
            </ul>
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

          <section className="detail-section" aria-labelledby="fd-h">
            <h2 id="fd-h">Full description</h2>
            {/* Content comes from WordPress editors and is already filtered by the_content. */}
            <div className="prose" dangerouslySetInnerHTML={{ __html: tour.description ?? '' }} />
          </section>

          {tour.amenities && tour.amenities.length > 0 && (
            <section className="detail-section" aria-labelledby="am-h">
              <h2 id="am-h">Features</h2>
              <ul className="highlights">
                {tour.amenities.map((a) => (
                  <li key={a}>
                    <CheckIcon size={18} /> {a}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tour.supplier && <SupplierCard supplier={tour.supplier} />}

          {hasItinerary && (
            <section className="detail-section" id="itinerary" aria-labelledby="it-h">
              <h2 id="it-h">Itinerary</h2>
              <ol className="itinerary">
                {tour.itinerary!.map((stop, i) => (
                  <li key={i}>
                    <h3>{stop.title}</h3>
                    {/* Written with the WordPress text editor; filtered by wp_kses_post. */}
                    {stop.details && <div className="prose itinerary-details" dangerouslySetInnerHTML={{ __html: stop.details }} />}
                    {stop.distance && (
                      <p className="distance">
                        <CarIcon size={16} /> {stop.distance}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <ListingDetails tour={tour} />

          {tour.notes && tour.notes.length > 0 && (
            <section className="detail-section" aria-labelledby="nt-h">
              <h2 id="nt-h">Important notes</h2>
              <ul className="notes-list">
                {tour.notes.map((n) => (
                  <li key={n}>
                    <InfoIcon size={18} /> {n}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hasIncluded && (
            <section className="detail-section" id="included" aria-labelledby="inc-h">
              <h2 id="inc-h">What's included</h2>
              <div className="incl-grid">
                {(tour.included?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="incl-title">Included</h3>
                    <ul className="incl-list yes">
                      {tour.included!.map((x) => (
                        <li key={x}>
                          <CheckIcon size={18} /> {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(tour.notIncluded?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="incl-title">Not included</h3>
                    <ul className="incl-list no">
                      {tour.notIncluded!.map((x) => (
                        <li key={x}>
                          <XIcon size={18} /> {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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

          {photos.length > 1 && (
            <section className="detail-section" id="photos" aria-labelledby="ph-h">
              <h2 id="ph-h">Gallery</h2>
              <div className="photo-grid">
                {photos.map((src, i) => (
                  <button key={i} type="button" onClick={() => setSlide(i)} aria-label={`Open photo ${i + 1} of ${photos.length}`}>
                    <Img src={src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {map && (
            <section className="detail-section" id="map" aria-labelledby="map-h">
              <h2 id="map-h">Map</h2>
              {stops.length > 1 && <p className="route-line">{stops.join(' → ')}</p>}
              <div className="map-frame">
                <iframe src={map.embed} title={`Map: ${stops.join(' to ')}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
              <a className="map-link" href={map.link} target="_blank" rel="noreferrer">
                Open in Google Maps
              </a>
            </section>
          )}

          {faq.data && (
            <section className="detail-section" id="faq" aria-labelledby="faq-h">
              <h2 id="faq-h">Frequently asked questions</h2>
              <div className={`faq-fold${allFaq ? ' open' : ''}`}>
                <FaqList html={faq.data.content} headingLevel={3} />
              </div>
              {!allFaq && (
                <button type="button" className="btn btn-outline" onClick={() => setAllFaq(true)}>
                  Show all questions
                </button>
              )}
            </section>
          )}

          <Reviews tour={tour} />
        </div>

        <BookingCard tour={tour} />
      </div>

      {/* Phones: price and a shortcut to the booking form, always in view. */}
      <div className="mobile-book">
        <div>
          {tour.price > 0 ? (
            <>
              <span className="card-meta">From</span> <strong>{formatPrice(tour.price, tour.currency)}</strong>{' '}
              <span className="card-meta">{unitLabel(tour.priceUnit)}</span>
            </>
          ) : (
            <strong>Price on request</strong>
          )}
        </div>
        <a href="#book" className="btn btn-brand">
          Check availability
        </a>
      </div>

      {related.data && related.data.length > 0 && (
        <section className="related" aria-labelledby="rel-h">
          <h2 id="rel-h">Related tours</h2>
          <div className="grid">
            {related.data.map((t) => (
              <TourCard key={t.id} tour={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
