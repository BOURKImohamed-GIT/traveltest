import { api } from '../api'
import TourCard, { CardSkeleton } from '../components/TourCard'
import { useAsync } from '../useAsync'

export default function Camping() {
  const page = useAsync(() => api.page('camping'), [])
  const camps = useAsync(() => api.tours({ category: 'camping', sort: 'price_asc', perPage: 24 }), [])

  return (
    <div className="container">
      <div className="dest-hero camping-hero" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/sahara-couple-camel.jpg)` }}>
        <div className="dest-hero-copy">
          <h1>{page.data?.title ?? 'Camping'}</h1>
          <p>Nights under the stars in the Sahara and the Agafay Desert</p>
        </div>
      </div>
      {page.data && (
        <section className="detail-section">
          {/* Written by the site team in wp-admin (Pages → Camping). */}
          <div className="prose long" dangerouslySetInnerHTML={{ __html: page.data.content }} />
        </section>
      )}
      <section className="section" aria-labelledby="camps-h">
        <div className="section-head">
          <h2 id="camps-h">Choose your camp</h2>
        </div>
        <div className="grid">
          {camps.data ? camps.data.items.map((t) => <TourCard key={t.id} tour={t} />) : Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)}
        </div>
        {camps.error && <p className="notice error">Couldn't load camps: {camps.error.message}</p>}
      </section>
    </div>
  )
}
