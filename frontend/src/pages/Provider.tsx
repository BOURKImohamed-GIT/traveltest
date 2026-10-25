import { useParams } from 'react-router-dom'
import { api } from '../api'
import { CheckIcon, PinIcon } from '../components/Icons'
import TourCard from '../components/TourCard'
import { useAsync } from '../useAsync'
import NotFound from './NotFound'

/** A supplier's public page: who they are and their live listings. */
export default function Provider() {
  const { slug = '' } = useParams()
  const { data, error } = useAsync(() => api.supplier(slug), [slug])

  if (error && 'status' in error && error.status === 404) return <NotFound />
  if (error) return <p className="container notice error">{error.message}</p>
  if (!data) return <div className="container section">Loading…</div>
  const s = data.supplier

  return (
    <div className="container section provider-page">
      <header className="provider-head">
        {s.logo ? <img src={s.logo} alt="" /> : <span className="dash-initial">{s.name.charAt(0)}</span>}
        <div>
          <h1>{s.name}</h1>
          <p className="card-meta">
            {s.verified && (
              <span className="verified-badge">
                <CheckIcon size={14} /> Verified supplier
              </span>
            )}{' '}
            {[s.type, s.since && `Member since ${s.since}`, s.languages].filter(Boolean).join(' · ')}
          </p>
          {s.locations && s.locations.length > 0 && (
            <p className="card-icon-row">
              <PinIcon size={16} /> {s.locations.join(', ')}
            </p>
          )}
        </div>
      </header>
      {s.bio && <p className="supplier-bio lead">{s.bio}</p>}
      <h2>Experiences by {s.name}</h2>
      {data.tours.length ? (
        <div className="grid">
          {data.tours.map((t) => (
            <TourCard key={t.id} tour={t} />
          ))}
        </div>
      ) : (
        <p className="card-meta">No experiences online right now.</p>
      )}
    </div>
  )
}
