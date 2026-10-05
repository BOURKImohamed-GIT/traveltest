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
  FlagIcon,
  InfoIcon,
  LanguageIcon,
  PinIcon,
  PlayIcon,
  ShieldIcon,
  UsersIcon,
  XIcon,
} from '../components/Icons'
import Img from '../components/Img'
import Lightbox from '../components/Lightbox'
import Rating from '../components/Rating'
import Reviews from '../components/Reviews'
import TourCard, { SaveButton } from '../components/TourCard'
import type { Tour } from '../types'
import { useAsync } from '../useAsync'
import NotFound from './NotFound'

/** Places on the route, e.g. "Marrakech → Merzouga → Fes". */
function routeStops(tour: Tour) {
  if (tour.location.includes('→')) return tour.location.split('→').map((s) => s.trim())
  const ends = [tour.startPoint, tour.endPoint].filter((s): s is string => !!s)
  if (ends.length === 2 && ends[0] !== ends[1]) return ends
  return [tour.location || ends[0] || tour.destination?.name || ''].filter(Boolean)
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

/** A few more tours in the same category, plus a day trip from the same city. */
async function loadRelated(tour: Tour) {
  const [same, days] = await Promise.all([
    tour.category ? api.tours({ category: tour.category.slug, perPage: 5 }) : null,
    tour.category?.slug !== 'day-trips' && tour.destination
      ? api.tours({ category: 'day-trips', destination: tour.destination.slug, perPage: 2 })
      : null,
  ])
  const pick = (rows: Tour[] | undefined, n: number) => (rows ?? []).filter((t) => t.id !== tour.id).slice(0, n)
  const dayTrip = pick(days?.items, 1)
  return [...pick(same?.items, 4 - dayTrip.length), ...dayTrip]
}

const SECTIONS = [
  ['overview', 'Overview'],
  ['itinerary', 'Itinerary'],
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
    included: hasIncluded,
    photos: photos.length > 1,
    map: !!map,
    faq: !!faq.data,
    reviews: true,
  }

  const facts = [
    tour.duration && { icon: <ClockIcon />, label: 'Duration', value: tour.duration },
    tour.startPoint && { icon: <PlayIcon />, label: 'Starts', value: tour.startPoint },
    tour.endPoint && { icon: <FlagIcon />, label: 'Ends', value: tour.endPoint },
    tour.tourStyle && { icon: <CarIcon />, label: 'Tour style', value: tour.tourStyle },
    tour.groupSize > 0 && { icon: <UsersIcon />, label: 'Group size', value: `Up to ${tour.groupSize} people` },
    (tour.languages?.length ?? 0) > 0 && { icon: <LanguageIcon />, label: 'Languages', value: tour.languages!.join(', ') },
    {
      icon: tour.freeCancel ? <ShieldIcon /> : <CalendarIcon />,
      label: 'Cancellation',
      value: tour.freeCancel ? 'Free up to 24 hours before' : 'Ask when you book',
    },
  ].filter((f): f is { icon: ReactElement; label: string; value: string } => !!f)

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
        {tour.tourStyle && <span className="style-badge">{tour.tourStyle} tour</span>}
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
          <section className="detail-section" id="overview" aria-labelledby="ov-h">
            <h2 id="ov-h">Overview</h2>
            {/* Content comes from WordPress editors and is already filtered by the_content. */}
            <div className="prose" dangerouslySetInnerHTML={{ __html: tour.description ?? '' }} />
            <dl className="fact-grid">
              {facts.map((f) => (
                <div className="fact" key={f.label}>
                  {f.icon}
                  <div>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
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

          {hasItinerary && (
            <section className="detail-section" id="itinerary" aria-labelledby="it-h">
              <h2 id="it-h">Itinerary</h2>
              <ol className="itinerary">
                {tour.itinerary!.map((stop, i) => (
                  <li key={i}>
                    <h3>{stop.title}</h3>
                    {stop.details && <p>{stop.details}</p>}
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
              <FaqList html={faq.data.content} headingLevel={3} />
            </section>
          )}

          <Reviews tour={tour} />
        </div>

        <BookingCard tour={tour} />
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
