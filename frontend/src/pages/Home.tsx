import { Link } from 'react-router-dom'
import { api } from '../api'
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
  const categories = useAsync(() => api.categories(), [])
  const destinations = useAsync(() => api.destinations(), [])
  const topRated = useAsync(() => api.tours({ sort: 'rating', perPage: 8 }), [])
  const dayTrips = useAsync(() => api.tours({ category: 'day-trips', sort: 'rating', perPage: 4 }), [])
  const adventures = useAsync(() => api.tours({ category: 'desert-adventure', sort: 'rating', perPage: 4 }), [])
  const promoImage = destinations.data?.[0]?.image

  return (
    <>
      <section className="hero container">
        <h1>Find your next tour</h1>
        <p className="hero-sub">Guided day trips, walking tours and desert adventures, booked with a local agency.</p>
        <SearchBar placeholder="Search tours or destinations" />
        <div className="cat-chips" aria-label="Tour categories">
          {categories.data?.map((c) => (
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
            <h2 id="top-h">Top-rated tours</h2>
            <p>Our travelers' favourites, by review score</p>
          </div>
          <Link to="/search?sort=rating">See all tours</Link>
        </div>
        <div className="grid">
          {topRated.data ? topRated.data.items.map((t) => <TourCard key={t.id} tour={t} />) : <Skeletons n={4} />}
        </div>
        {topRated.error && <p className="notice error">Couldn't load tours: {topRated.error.message}</p>}
      </section>

      <section className="section container" aria-labelledby="dest-h">
        <div className="section-head">
          <div>
            <h2 id="dest-h">Tours by destination</h2>
            <p>Where our guides will take you</p>
          </div>
        </div>
        <div className="scroller">
          {destinations.data ? destinations.data.map((d) => <DestinationCard key={d.id} destination={d} />) : <Skeletons n={4} />}
        </div>
        {destinations.error && <p className="notice error">Couldn't load destinations: {destinations.error.message}</p>}
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
          {dayTrips.data ? dayTrips.data.items.map((t) => <TourCard key={t.id} tour={t} />) : <Skeletons n={3} />}
        </div>
      </section>

      <section className="section container">
        <div className="promo">
          <div className="promo-copy">
            <h2>Private tours, your way.</h2>
            <p>Travelling as a family or group? Request any tour as a private trip and our agents will tailor the dates and pace.</p>
            <Link to="/search" className="btn btn-primary">
              Browse tours
            </Link>
          </div>
          <div className="promo-media">
            <Img src={promoImage} alt="" fallbackText="" />
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="adv-h">
        <div className="section-head">
          <div>
            <h2 id="adv-h">Desert & adventure</h2>
            <p>Camel treks, volcano sunrises and mountain hikes</p>
          </div>
          <Link to="/search?category=desert-adventure">See all</Link>
        </div>
        <div className="grid">
          {adventures.data ? adventures.data.items.map((t) => <TourCard key={t.id} tour={t} />) : <Skeletons n={2} />}
        </div>
      </section>

      <section className="section container" aria-labelledby="cat-h">
        <div className="section-head">
          <h2 id="cat-h">Browse by tour type</h2>
        </div>
        <div className="cat-grid">
          {categories.data?.map((c) => (
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
              <h3>Small groups, local guides</h3>
              <p>We vet every guide and keep group sizes small.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
