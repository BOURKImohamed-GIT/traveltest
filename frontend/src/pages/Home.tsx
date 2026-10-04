import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import DestinationCard from '../components/DestinationCard'
import { ChatIcon, ShieldIcon, TypeIcon } from '../components/Icons'
import Img from '../components/Img'
import ListingCard, { CardSkeleton } from '../components/ListingCard'
import SearchBar from '../components/SearchBar'
import { useAsync } from '../useAsync'

const TABS = [
  { slug: '', name: 'Search All', placeholder: 'Places to go, things to do, hotels…' },
  { slug: 'hotels', name: 'Hotels', placeholder: 'Hotel name or destination' },
  { slug: 'things-to-do', name: 'Things to Do', placeholder: 'Attraction, activity or destination' },
  { slug: 'tours', name: 'Tours', placeholder: 'Tour or destination' },
  { slug: 'restaurants', name: 'Restaurants', placeholder: 'Restaurant or destination' },
]

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
  const [tab, setTab] = useState(TABS[0])
  const destinations = useAsync(() => api.destinations(), [])
  const topRated = useAsync(() => api.listings({ sort: 'rating', perPage: 8 }), [])
  const experiences = useAsync(() => api.listings({ type: 'things-to-do', perPage: 4 }), [])
  const hotels = useAsync(() => api.listings({ type: 'hotels', sort: 'rating', perPage: 4 }), [])
  const promoImage = destinations.data?.[0]?.image

  return (
    <>
      <section className="hero container">
        <h1>Where to?</h1>
        <div className="hero-tabs" role="tablist" aria-label="Search category">
          {TABS.map((t) => (
            <button
              key={t.slug || 'all'}
              type="button"
              role="tab"
              className="hero-tab"
              aria-selected={tab.slug === t.slug}
              onClick={() => setTab(t)}
            >
              <TypeIcon slug={t.slug || undefined} />
              {t.name}
            </button>
          ))}
        </div>
        <SearchBar type={tab.slug || undefined} placeholder={tab.placeholder} key={tab.slug} />
      </section>

      <section className="section container" aria-labelledby="dest-h">
        <div className="section-head">
          <div>
            <h2 id="dest-h">Top destinations</h2>
            <p>Places our travelers love right now</p>
          </div>
        </div>
        <div className="scroller">
          {destinations.data ? destinations.data.map((d) => <DestinationCard key={d.id} destination={d} />) : <Skeletons n={4} />}
        </div>
        {destinations.error && <p className="notice error">Couldn't load destinations: {destinations.error.message}</p>}
      </section>

      <section className="section container" aria-labelledby="top-h">
        <div className="section-head">
          <div>
            <h2 id="top-h">Top-rated experiences</h2>
            <p>The highest-rated tours, stays and activities</p>
          </div>
          <Link to="/search?sort=rating">See all</Link>
        </div>
        <div className="grid">
          {topRated.data ? topRated.data.items.map((l) => <ListingCard key={l.id} listing={l} />) : <Skeletons n={4} />}
        </div>
        {topRated.error && <p className="notice error">Couldn't load listings: {topRated.error.message}</p>}
      </section>

      <section className="section container">
        <div className="promo">
          <div className="promo-copy">
            <h2>Plan less. Travel more.</h2>
            <p>Tell us where and when. Our local experts reply within 24 hours with availability and a personal quote.</p>
            <Link to="/search" className="btn btn-primary">
              Start exploring
            </Link>
          </div>
          <div className="promo-media">
            <Img src={promoImage} alt="" fallbackText="" />
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="todo-h">
        <div className="section-head">
          <div>
            <h2 id="todo-h">Things to do</h2>
            <p>Day trips, cruises and must-see sights</p>
          </div>
          <Link to="/search?type=things-to-do">See all</Link>
        </div>
        <div className="grid">
          {experiences.data ? experiences.data.items.map((l) => <ListingCard key={l.id} listing={l} />) : <Skeletons n={4} />}
        </div>
      </section>

      <section className="section container" aria-labelledby="stay-h">
        <div className="section-head">
          <div>
            <h2 id="stay-h">Stays guests love</h2>
            <p>Riads, ryokans and villas with top reviews</p>
          </div>
          <Link to="/search?type=hotels">See all</Link>
        </div>
        <div className="grid">
          {hotels.data ? hotels.data.items.map((l) => <ListingCard key={l.id} listing={l} />) : <Skeletons n={4} />}
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
              <h3>Book with confidence</h3>
              <p>Many experiences offer free cancellation up to 24 hours before.</p>
            </div>
          </div>
          <div className="trust-item">
            <TypeIcon slug="tours" size={28} />
            <div>
              <h3>Local experts</h3>
              <p>Our agents personally vet every guide, hotel and tour.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
