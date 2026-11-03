import { Link } from 'react-router-dom'
import { useCategories } from '../categories'
import { asset } from '../config'
import { CalendarIcon, CategoryIcon, ChatIcon, ShieldIcon, UsersIcon } from '../components/Icons'
import Img from '../components/Img'
import SearchBar from '../components/SearchBar'
import TourSlider from '../components/TourSlider'
import { listingSchema } from '../listingSchema'

/** A photo for a starting city without its own (Listing categories → photo sets the real one). */
const CITY_PHOTOS: Record<string, string> = {
  marrakech: 'images/marrakech-souk.jpg',
  fes: 'images/marrakech-souk.jpg',
  tangier: 'images/chefchaouen-blue-alley.jpg',
  casablanca: 'images/sahara-couple-camel.jpg',
  errachidia: 'images/sahara-caravan.jpg',
  ouarzazate: 'images/sahara-camel-ride.jpg',
}
const PHOTOS = Object.values(CITY_PHOTOS)
function cityPhoto(slug: string, i: number) {
  const city = Object.keys(CITY_PHOTOS).find((k) => slug.includes(k))
  return asset(city ? CITY_PHOTOS[city] : PHOTOS[i % PHOTOS.length])
}

/** Carousels on the home page; a row without listings is hidden. */
const ROWS = [
  { slug: 'desert-adventures', title: 'Unforgettable desert adventures', sub: 'Quad biking, camel rides and sandboarding in the dunes' },
  { slug: 'day-trips', title: 'Top day trips', sub: 'Mountains, waterfalls and coastal towns, back by evening' },
  { slug: 'tour-packages', title: 'Multi-day tours across Morocco', sub: 'From the imperial cities to the Sahara' },
  { slug: 'desert-camps', title: 'Agafay & Merzouga experiences', sub: 'Desert dinners, sunsets and nights under the stars' },
  { slug: 'city-tours', title: 'City tours', sub: 'Medinas, souks and hidden riads with a local guide' },
  { slug: 'food-culinary', title: 'Food & cooking', sub: 'Cooking classes, market visits and food tours' },
  { slug: 'outdoor-adventures', title: 'Outdoor adventures', sub: 'Hiking in the Atlas, canyons and gorges' },
  { slug: 'wellness', title: 'Hammams & wellness', sub: 'Traditional hammams, spas and yoga' },
]

const PERKS = [
  { icon: <ShieldIcon size={26} />, title: 'Free cancellation', short: 'Up to 24 h before on many experiences' },
  { icon: <CalendarIcon size={26} />, title: 'Request now, pay later', short: 'Nothing to pay online' },
  { icon: <UsersIcon size={26} />, title: 'Local experts', short: 'Moroccan guides, drivers and hosts' },
  { icon: <ChatIcon size={26} />, title: 'Real reviews', short: 'From travellers, checked before publishing' },
]

export default function Home() {
  const { tree } = useCategories()
  const count = (slug: string) => tree?.bySlug[slug]?.count ?? 0
  // Category chips: the ones with listings first.
  const chips = [...listingSchema.categories].sort((a, b) => Number(count(b.slug) > 0) - Number(count(a.slug) > 0))

  return (
    <>
      <section className="hero hero-full">
        <div className="hero-banner" style={{ backgroundImage: `url(${asset('images/sahara-caravan.jpg')})` }}>
          <div className="container hero-inner">
            <h1>Unforgettable experiences in Morocco</h1>
            <p className="hero-sub">Desert adventures, day trips, cooking classes and tours, run by local experts.</p>
            <SearchBar placeholder="Where are you going? Try Merzouga, quad, cooking class…" />
          </div>
        </div>
      </section>

      <nav className="container chip-row" aria-label="Browse by category">
        {chips.map((c) => (
          <Link key={c.slug} to={`/search?category=${c.slug}`} className="cat-chip">
            <CategoryIcon slug={c.slug} size={18} />
            {c.name}
          </Link>
        ))}
      </nav>

      <section className="container perks-strip" aria-label="Why book with us">
        {PERKS.map((p) => (
          <div key={p.title} className="perk-mini">
            {p.icon}
            <div>
              <strong>{p.title}</strong>
              <span>{p.short}</span>
            </div>
          </div>
        ))}
      </section>

      {ROWS.map((r) => (
        <TourSlider
          key={r.slug}
          id={`row-${r.slug}`}
          title={r.title}
          sub={r.sub}
          query={{ category: r.slug, sort: 'recommended' }}
          more={`/search?category=${r.slug}`}
          minItems={3}
        />
      ))}
      <TourSlider id="row-all" title="More experiences to discover" sub="Tours, classes and activities from local hosts" query={{ sort: 'rating' }} more="/search" minItems={3} />

      <section className="section container" aria-labelledby="dest-h">
        <div className="section-head">
          <div>
            <h2 id="dest-h">Top destinations</h2>
            <p>Multi-day tours by starting city</p>
          </div>
        </div>
        <ul className="dest-circles">
          {tree
            ? tree.packages.map((c, i) => {
                const city = c.name.replace(/^Morocco Tours From /, '')
                return (
                  <li key={c.slug}>
                    <Link to={`/search?category=${c.slug}`} className="dest-circle" aria-label={`Tours from ${city}`}>
                      <span className="dest-photo">
                        <Img src={c.image || cityPhoto(c.slug, i)} alt="" fallbackText="" />
                      </span>
                      <span className="dest-from">From</span>
                      <strong className="dest-city">{city}</strong>
                      {(c.count ?? 0) > 0 && (
                        <span className="dest-count">
                          {c.count} {c.count === 1 ? 'tour' : 'tours'}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })
            : [0, 1, 2, 3, 4, 5].map((i) => (
                <li key={i}>
                  <span className="dest-circle">
                    <span className="dest-photo skeleton" />
                  </span>
                </li>
              ))}
        </ul>
      </section>


      <section className="section container">
        <div className="duo-bands">
          <div className="cta-band">
            <div>
              <h2>Ready to explore Morocco?</h2>
              <p>Book desert adventures, day trips, tours and classes directly with local guides and operators. Request now, pay later.</p>
            </div>
            <Link to="/search" className="btn btn-primary">
              Find experiences
            </Link>
          </div>
          <div className="cta-band cta-supplier">
            <div>
              <h2>Run tours or activities?</h2>
              <p>List your experiences for free and get booking requests from travellers.</p>
            </div>
            <Link to="/supplier/join" className="btn btn-brand">
              List your experience
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
