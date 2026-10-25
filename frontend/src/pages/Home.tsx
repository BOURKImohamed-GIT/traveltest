import { Link } from 'react-router-dom'
import { useCategories } from '../categories'
import { asset } from '../config'
import { CalendarIcon, CategoryIcon, ChatIcon, ShieldIcon, UsersIcon } from '../components/Icons'
import Img from '../components/Img'
import SearchBar from '../components/SearchBar'
import { CardSkeleton } from '../components/TourCard'
import TourSlider from '../components/TourSlider'
import { listingSchema } from '../listingSchema'

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
  { icon: <ShieldIcon size={26} />, title: 'Free cancellation', text: 'Look for the green label: cancel free up to 24 hours before on many experiences.' },
  { icon: <CalendarIcon size={26} />, title: 'Request now, pay later', text: 'Nothing to pay online. You pay once your guide confirms the date and price.' },
  { icon: <UsersIcon size={26} />, title: 'Local experts', text: 'Tours and activities run by Moroccan guides, drivers and hosts.' },
  { icon: <ChatIcon size={26} />, title: 'Real reviews', text: 'Every review comes from a traveller and is checked before it goes live.' },
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

      {ROWS.map((r) => (
        <TourSlider key={r.slug} id={`row-${r.slug}`} title={r.title} sub={r.sub} query={{ category: r.slug, sort: 'recommended' }} more={`/search?category=${r.slug}`} />
      ))}

      <section className="section container" aria-labelledby="dest-h">
        <div className="section-head">
          <div>
            <h2 id="dest-h">Top destinations</h2>
            <p>Multi-day tours by starting city</p>
          </div>
        </div>
        <div className="scroller">
          {tree
            ? tree.packages.map((c) => (
                <Link key={c.slug} to={`/search?category=${c.slug}`} className="card dest-card">
                  <div className="card-media">
                    <Img src={c.image} alt="" fallbackText="" />
                    <div className="dest-label">
                      <h3>{c.name.replace(/^Morocco Tours From /, '')}</h3>
                      <p>
                        {c.count} {c.count === 1 ? 'tour' : 'tours'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            : [0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      </section>

      <section className="section container" aria-label="Why book with us">
        <div className="perks">
          {PERKS.map((p) => (
            <div key={p.title} className="perk">
              {p.icon}
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section container">
        <div className="duo-bands">
          <div className="cta-band">
            <div>
              <h2>Want a trip made for you?</h2>
              <p>Tell us your dates and interests; we'll suggest an itinerary and a price within 24 hours.</p>
            </div>
            <Link to="/contact" className="btn btn-primary">
              Contact us
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
