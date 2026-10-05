import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useCategories } from '../categories'
import DestinationCard from '../components/DestinationCard'
import { CategoryIcon, ChatIcon, ShieldIcon, UsersIcon } from '../components/Icons'
import SearchBar from '../components/SearchBar'
import TourCard, { CardSkeleton } from '../components/TourCard'
import type { TourQuery } from '../types'
import { useAsync } from '../useAsync'

const TABS = [
  { slug: '', name: 'Search all', placeholder: 'Where to? Search tours, day trips, activities…' },
  { slug: 'tour-packages', name: 'Tours', placeholder: 'Desert tour, city or itinerary' },
  { slug: 'day-trips', name: 'Day trips', placeholder: 'Ourika, Essaouira, Chefchaouen…' },
  { slug: 'activities', name: 'Activities', placeholder: 'Quad, camel ride, balloon, surf…' },
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

/** A home page row of listings, with a sign-up prompt when the category is still empty. */
function Row({ id, title, sub, query, emptyText }: { id: string; title: string; sub: string; query: TourQuery; emptyText: string }) {
  const rows = useAsync(() => api.tours({ perPage: 4, ...query }), [])
  return (
    <section className="section container" aria-labelledby={id}>
      <div className="section-head">
        <div>
          <h2 id={id}>{title}</h2>
          <p>{sub}</p>
        </div>
        {!!rows.data?.total && <Link to={`/search?category=${query.category}`}>See all</Link>}
      </div>
      {rows.data && rows.data.total === 0 ? (
        <div className="empty-cta">
          <p>{emptyText}</p>
          <Link to="/account/listings/new" className="btn btn-brand">
            List your business
          </Link>
        </div>
      ) : (
        <div className="grid">{rows.data ? rows.data.items.map((t) => <TourCard key={t.id} tour={t} />) : <Skeletons n={4} />}</div>
      )}
      {rows.error && <p className="notice error">Couldn't load listings: {rows.error.message}</p>}
    </section>
  )
}

export default function Home() {
  const [tab, setTab] = useState(TABS[0])
  const { tree } = useCategories()
  const destinations = useAsync(() => api.destinations(), [])

  return (
    <>
      <section className="hero container">
        <div className="hero-banner" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/sahara-caravan.jpg)` }}>
          <h1>Discover Morocco</h1>
          <p className="hero-sub">Desert tours, day trips and activities across Morocco, reviewed by travellers.</p>
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

      <section className="section container" aria-labelledby="dest-h">
        <div className="section-head">
          <div>
            <h2 id="dest-h">Explore Morocco by city</h2>
            <p>Tours and things to do in each destination</p>
          </div>
        </div>
        <div className="scroller">
          {destinations.data ? destinations.data.map((d) => <DestinationCard key={d.id} destination={d} />) : <Skeletons n={4} />}
        </div>
      </section>

      <Row id="pop-h" title="Popular tours" sub="Our most booked trips across Morocco" query={{ category: 'tour-packages', sort: 'recommended' }} emptyText="No tours yet." />
      <Row id="act-h" title="Things to do" sub="Quads, camel rides, balloon flights, surf and more" query={{ category: 'activities', sort: 'rating' }} emptyText="Run an activity? List it here." />
      <Row id="day-h" title="Day trips" sub="Back at your hotel by evening" query={{ category: 'day-trips' }} emptyText="No day trips yet." />

      <section className="section container">
        <div className="cta-band">
          <div>
            <h2>Own a business in Morocco?</h2>
            <p>Tour companies, guides and activity providers can list for free. Sign in with Google and publish in minutes.</p>
          </div>
          <Link to="/account/listings/new" className="btn btn-primary">
            List your business
          </Link>
        </div>
      </section>

      <section className="section container" aria-labelledby="cat-h">
        <div className="section-head">
          <h2 id="cat-h">Browse everything</h2>
          <Link to="/search">See all</Link>
        </div>
        <div className="cat-grid">
          {tree?.leaves.map((c) => (
            <Link key={c.slug} to={`/search?category=${c.slug}`} className="cat-tile">
              <CategoryIcon slug={c.slug} size={28} />
              <strong>{c.name}</strong>
              <span>{c.count ? `${c.count} listed` : 'Be the first'}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section container">
        <div className="trust-strip">
          <div className="trust-item">
            <ChatIcon size={28} />
            <div>
              <h3>Real traveller reviews</h3>
              <p>Every review is checked before it goes live.</p>
            </div>
          </div>
          <div className="trust-item">
            <ShieldIcon size={28} />
            <div>
              <h3>Checked listings</h3>
              <p>Our team reviews every business before it appears.</p>
            </div>
          </div>
          <div className="trust-item">
            <UsersIcon size={28} />
            <div>
              <h3>Book direct with locals</h3>
              <p>Your request goes straight to the guide or tour company.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
