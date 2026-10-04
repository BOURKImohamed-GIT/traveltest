import { Link } from 'react-router-dom'
import { api } from '../api'
import { PACKAGES, useCategories } from '../categories'
import DestinationCard from '../components/DestinationCard'
import { CategoryIcon, ChatIcon, ShieldIcon, UsersIcon } from '../components/Icons'
import Img from '../components/Img'
import SearchBar from '../components/SearchBar'
import TourCard, { CardSkeleton } from '../components/TourCard'
import { useAsync } from '../useAsync'

function Skeletons({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </>
  )
}

export default function Home() {
  const { tree } = useCategories()
  const destinations = useAsync(() => api.destinations(), [])
  const popular = useAsync(() => api.tours({ sort: 'recommended', perPage: 8 }), [])
  const dayTrips = useAsync(() => api.tours({ category: 'day-trips', perPage: 4 }), [])
  const marrakechDesert = useAsync(() => api.tours({ category: 'marrakech-desert-tours', sort: 'price_asc', perPage: 4 }), [])
  const activities = useAsync(() => api.tours({ category: 'desert-activities', sort: 'price_asc', perPage: 4 }), [])
  const promoImage = destinations.data?.[0]?.image

  return (
    <>
      <section className="hero container">
        <div className="hero-banner" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/sahara-caravan.jpg)` }}>
          <h1>Discover Morocco with us</h1>
          <p className="hero-sub">Sahara desert tours, day trips and grand tours of Morocco, with local drivers and guides.</p>
          <SearchBar placeholder="Search tours or destinations" />
        </div>
        <div className="cat-chips" aria-label="Tour categories">
          {tree?.leaves.map((c) => (
            <Link key={c.slug} to={`/search?category=${c.slug}`} className="cat-chip">
              <CategoryIcon slug={c.slug} size={18} />
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="section container" aria-labelledby="top-h">
        <div className="section-head">
          <div>
            <h2 id="top-h">Popular tours</h2>
            <p>Our most booked trips across Morocco</p>
          </div>
          <Link to="/search">See all tours</Link>
        </div>
        <div className="grid">
          {popular.data ? popular.data.items.map((t) => <TourCard key={t.id} tour={t} />) : <Skeletons n={4} />}
        </div>
        {popular.error && <p className="notice error">Couldn't load tours: {popular.error.message}</p>}
      </section>

      <section className="section container" aria-labelledby="dest-h">
        <div className="section-head">
          <div>
            <h2 id="dest-h">Tours by starting city</h2>
            <p>Pick where your trip begins</p>
          </div>
        </div>
        <div className="scroller">
          {destinations.data ? destinations.data.map((d) => <DestinationCard key={d.id} destination={d} />) : <Skeletons n={4} />}
        </div>
        {destinations.error && <p className="notice error">Couldn't load destinations: {destinations.error.message}</p>}
      </section>

      <section className="section container" aria-labelledby="mk-h">
        <div className="section-head">
          <div>
            <h2 id="mk-h">Marrakech desert tours</h2>
            <p>From Marrakech to the dunes of Zagora and Merzouga</p>
          </div>
          <Link to="/search?category=marrakech-desert-tours">See all</Link>
        </div>
        <div className="grid">
          {marrakechDesert.data ? marrakechDesert.data.items.map((t) => <TourCard key={t.id} tour={t} />) : <Skeletons n={4} />}
        </div>
      </section>

      <section className="section container">
        <div className="promo">
          <div className="promo-copy">
            <h2>Private tours, your way.</h2>
            <p>Every itinerary can be adjusted. Tell us your dates, starting city and pace, and our team will tailor the route for you.</p>
            <Link to="/search" className="btn btn-primary">
              Browse tours
            </Link>
          </div>
          <div className="promo-media">
            <Img src={promoImage} alt="" fallbackText="" />
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="day-h">
        <div className="section-head">
          <div>
            <h2 id="day-h">Day trips</h2>
            <p>Back at your hotel by evening</p>
          </div>
          <Link to="/search?category=day-trips">See all</Link>
        </div>
        <div className="grid">
          {dayTrips.data ? dayTrips.data.items.map((t) => <TourCard key={t.id} tour={t} />) : <Skeletons n={4} />}
        </div>
      </section>

      <section className="section container" aria-labelledby="act-h">
        <div className="section-head">
          <div>
            <h2 id="act-h">Desert activities</h2>
            <p>Camel treks, quad biking and sandboarding in Merzouga and Agafay</p>
          </div>
          <Link to="/search?category=desert-activities">See all</Link>
        </div>
        <div className="grid">
          {activities.data ? activities.data.items.map((t) => <TourCard key={t.id} tour={t} />) : <Skeletons n={4} />}
        </div>
      </section>

      <section className="section container" aria-labelledby="cat-h">
        <div className="section-head">
          <h2 id="cat-h">{tree?.bySlug[PACKAGES]?.name ?? 'Tour packages'}</h2>
          <Link to={`/search?category=${PACKAGES}`}>See all</Link>
        </div>
        <div className="cat-grid">
          {tree?.packages.map((c) => (
            <Link key={c.slug} to={`/search?category=${c.slug}`} className="cat-tile">
              <CategoryIcon slug={c.slug} size={28} />
              <strong>{c.name}</strong>
              <span>
                {c.count} {c.count === 1 ? 'tour' : 'tours'}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section container">
        <div className="trust-strip">
          <div className="trust-item">
            <ChatIcon size={28} />
            <div>
              <h3>Real traveler reviews</h3>
              <p>Every review is checked by our team before it goes live.</p>
            </div>
          </div>
          <div className="trust-item">
            <ShieldIcon size={28} />
            <div>
              <h3>Free cancellation</h3>
              <p>Most tours can be cancelled free up to 24 hours before.</p>
            </div>
          </div>
          <div className="trust-item">
            <UsersIcon size={28} />
            <div>
              <h3>Local drivers and guides</h3>
              <p>Moroccan drivers who know every road from Tangier to the Sahara.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
