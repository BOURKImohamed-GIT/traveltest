import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useCategories } from '../categories'
import { CategoryIcon, ChatIcon, ShieldIcon, UsersIcon } from '../components/Icons'
import Img from '../components/Img'
import SearchBar from '../components/SearchBar'
import TourCard, { CardSkeleton } from '../components/TourCard'
import type { TourQuery } from '../types'
import { useAsync } from '../useAsync'

const TABS = [
  { slug: '', name: 'Search all', placeholder: 'Where to? Search tours, day trips, activities…' },
  { slug: 'tour-packages', name: 'Tours', placeholder: 'Desert tour, starting city or itinerary' },
  { slug: 'day-trips', name: 'Day Trips', placeholder: 'Ourika, Essaouira, Chefchaouen…' },
  { slug: 'activities', name: 'Activities', placeholder: 'Quad, camel ride, balloon…' },
  { slug: 'camping', name: 'Camping', placeholder: 'Desert camp in Merzouga or Agafay' },
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

function Row({ id, title, sub, query, more }: { id: string; title: string; sub: string; query: TourQuery; more: string }) {
  const rows = useAsync(() => api.tours({ perPage: 4, ...query }), [])
  if (rows.data && rows.data.total === 0) return null
  return (
    <section className="section container" aria-labelledby={id}>
      <div className="section-head">
        <div>
          <h2 id={id}>{title}</h2>
          <p>{sub}</p>
        </div>
        <Link to={more}>See all</Link>
      </div>
      <div className="grid">{rows.data ? rows.data.items.map((t) => <TourCard key={t.id} tour={t} />) : <Skeletons n={4} />}</div>
      {rows.error && <p className="notice error">Couldn't load tours: {rows.error.message}</p>}
    </section>
  )
}

export default function Home() {
  const [tab, setTab] = useState(TABS[0])
  const { tree } = useCategories()
  const destinations = useAsync(() => api.destinations(), [])
  const cityImage = (slug: string) => destinations.data?.find((d) => `tours-from-${d.slug}` === slug)?.image

  return (
    <>
      <section className="hero container">
        <div className="hero-banner" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/sahara-caravan.jpg)` }}>
          <h1>Discover Morocco with us</h1>
          <p className="hero-sub">Private desert tours, day trips, camping and activities, with our own local drivers and guides.</p>
          <div className="hero-tabs" role="tablist" aria-label="Search category">
            {TABS.map((t) => (
              <button key={t.slug || 'all'} type="button" role="tab" className="hero-tab" aria-selected={tab.slug === t.slug} onClick={() => setTab(t)}>
                <CategoryIcon slug={t.slug || undefined} />
                {t.name}
              </button>
            ))}
          </div>
          <SearchBar category={tab.slug || undefined} placeholder={tab.placeholder} key={tab.slug} />
        </div>
      </section>

      <section className="section container" aria-labelledby="start-h">
        <div className="section-head">
          <div>
            <h2 id="start-h">Where does your trip start?</h2>
            <p>Morocco tours from your arrival city</p>
          </div>
          <Link to="/search?category=tour-packages">All tours</Link>
        </div>
        <div className="scroller">
          {tree
            ? tree.packages.map((c) => (
                <Link key={c.slug} to={`/search?category=${c.slug}`} className="card dest-card">
                  <div className="card-media">
                    <Img src={cityImage(c.slug)} alt="" fallbackText="" />
                    <div className="dest-label">
                      <h3>{c.name.replace(/^Morocco Tours From /, '')}</h3>
                      <p>
                        {c.count} {c.count === 1 ? 'tour' : 'tours'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            : <Skeletons n={4} />}
        </div>
      </section>

      <Row id="pop-h" title="Popular tours" sub="Our most booked trips across Morocco" query={{ category: 'tour-packages', sort: 'recommended' }} more="/search?category=tour-packages" />
      <Row id="day-h" title="Day trips" sub="Back at your hotel by evening" query={{ category: 'day-trips' }} more="/search?category=day-trips" />
      <Row id="act-h" title="Activities" sub="Quads, camel rides, balloon flights and more" query={{ category: 'activities', sort: 'rating' }} more="/search?category=activities" />
      <Row id="camp-h" title="Camping" sub="Nights under the stars in the Sahara and Agafay" query={{ category: 'camping', sort: 'price_asc' }} more="/camping" />

      <section className="section container">
        <div className="cta-band">
          <div>
            <h2>Want a tour made for you?</h2>
            <p>Tell us your dates, starting city and interests. We'll suggest an itinerary and a price within 24 hours.</p>
          </div>
          <Link to="/contact" className="btn btn-primary">
            Contact us
          </Link>
        </div>
      </section>

      <section className="section container">
        <div className="trust-strip">
          <div className="trust-item">
            <UsersIcon size={28} />
            <div>
              <h3>Local team</h3>
              <p>Our drivers and guides grew up in the regions we visit.</p>
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
            <ChatIcon size={28} />
            <div>
              <h3>Real reviews</h3>
              <p>Every review comes from a traveller and is checked before it goes live.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
