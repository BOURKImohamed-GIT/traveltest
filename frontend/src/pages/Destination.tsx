import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import Img from '../components/Img'
import TourCard, { CardSkeleton } from '../components/TourCard'
import { useAsync } from '../useAsync'
import NotFound from './NotFound'

export default function Destination() {
  const { slug = '' } = useParams()
  const [category, setCategory] = useState<string | undefined>()
  const dest = useAsync(() => api.destination(slug), [slug])
  const categories = useAsync(() => api.categories(), [])
  const tours = useAsync(() => api.tours({ destination: slug, category, sort: 'rating', perPage: 24 }), [slug, category])

  if (dest.error && 'status' in dest.error && dest.error.status === 404) return <NotFound />

  return (
    <div className="container">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> <span aria-hidden="true">›</span> <span>{dest.data?.name ?? '…'}</span>
      </nav>

      {dest.data ? (
        <div className="dest-hero">
          <Img src={dest.data.image} alt="" loading="eager" />
          <div className="dest-hero-copy">
            <h1>{dest.data.name}</h1>
            <p>{dest.data.tagline}</p>
          </div>
        </div>
      ) : (
        <div className="dest-hero skeleton" />
      )}
      {dest.error && <p className="notice error">{dest.error.message}</p>}

      {dest.data?.description && (
        <section className="detail-section">
          <h2>About {dest.data.name}</h2>
          <div className="prose" dangerouslySetInnerHTML={{ __html: dest.data.description }} />
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Tours in {dest.data?.name}</h2>
        </div>
        <div className="type-pills">
          <button type="button" className={`pill${!category ? ' active' : ''}`} onClick={() => setCategory(undefined)}>
            All tours
          </button>
          {categories.data?.map((c) => (
            <button key={c.slug} type="button" className={`pill${category === c.slug ? ' active' : ''}`} onClick={() => setCategory(c.slug)}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="grid" style={{ marginTop: 16 }}>
          {tours.data
            ? tours.data.items.map((t) => <TourCard key={t.id} tour={t} />)
            : Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)}
        </div>
        {tours.data?.items.length === 0 && (
          <div className="empty">
            <p>No tours of this type here yet. Try another type.</p>
          </div>
        )}
      </section>
    </div>
  )
}
