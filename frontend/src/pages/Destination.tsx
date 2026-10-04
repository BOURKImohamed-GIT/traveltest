import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import Img from '../components/Img'
import ListingCard, { CardSkeleton } from '../components/ListingCard'
import { useAsync } from '../useAsync'
import NotFound from './NotFound'

export default function Destination() {
  const { slug = '' } = useParams()
  const [type, setType] = useState<string | undefined>()
  const dest = useAsync(() => api.destination(slug), [slug])
  const types = useAsync(() => api.listingTypes(), [])
  const listings = useAsync(() => api.listings({ destination: slug, type, sort: 'rating', perPage: 24 }), [slug, type])

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
          <h2>Explore {dest.data?.name}</h2>
        </div>
        <div className="type-pills">
          <button type="button" className={`pill${!type ? ' active' : ''}`} onClick={() => setType(undefined)}>
            All
          </button>
          {types.data?.map((t) => (
            <button key={t.slug} type="button" className={`pill${type === t.slug ? ' active' : ''}`} onClick={() => setType(t.slug)}>
              {t.name}
            </button>
          ))}
        </div>
        <div className="grid" style={{ marginTop: 16 }}>
          {listings.data
            ? listings.data.items.map((l) => <ListingCard key={l.id} listing={l} />)
            : Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)}
        </div>
        {listings.data?.items.length === 0 && (
          <div className="empty">
            <p>Nothing here yet. Try another category.</p>
          </div>
        )}
      </section>
    </div>
  )
}
