import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { CheckIcon, GlobeIcon, LanguageIcon, PinIcon, ShieldIcon, UsersIcon } from '../components/Icons'
import Img from '../components/Img'
import Rating from '../components/Rating'
import TourCard from '../components/TourCard'
import { SITE_NAME } from '../config'
import { formatDay } from '../format'
import { useAsync } from '../useAsync'
import NotFound from './NotFound'

type Sort = 'recommended' | 'rating' | 'price_asc' | 'price_desc'

const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

/** A business's public page: who they are, why to trust them, and all their live experiences. */
export default function Provider() {
  const { slug = '' } = useParams()
  const { data, error } = useAsync(() => api.supplier(slug), [slug])
  const [cat, setCat] = useState('')
  const [sort, setSort] = useState<Sort>('recommended')
  const [shared, setShared] = useState(false)

  useEffect(() => {
    if (data) document.title = `${data.supplier.name} · ${SITE_NAME}`
  }, [data])

  const tours = useMemo(() => data?.tours ?? [], [data])
  const categories = useMemo(() => {
    const seen = new Map<string, { name: string; n: number }>()
    for (const t of tours) {
      if (!t.category) continue
      const c = seen.get(t.category.slug) ?? { name: t.category.name, n: 0 }
      c.n++
      seen.set(t.category.slug, c)
    }
    return [...seen.entries()]
  }, [tours])
  const shown = useMemo(() => {
    const list = cat ? tours.filter((t) => t.category?.slug === cat) : [...tours]
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    if (sort === 'price_asc') list.sort((a, b) => (a.price || Infinity) - (b.price || Infinity))
    if (sort === 'price_desc') list.sort((a, b) => b.price - a.price)
    if (sort === 'recommended') list.sort((a, b) => b.reviewCount - a.reviewCount)
    return list
  }, [tours, cat, sort])

  if (error && 'status' in error && error.status === 404) return <NotFound />
  if (error) return <p className="container notice error">{error.message}</p>
  if (!data) return <div className="container section">Loading…</div>

  const s = data.supplier
  const stats = s.stats ?? { listings: tours.length, reviews: 0, rating: 0 }
  const cover = tours.find((t) => t.image)?.image ?? null
  const languages = (s.languages ?? '').split(',').map((l) => l.trim()).filter(Boolean)
  const locations = s.locations ?? []
  const reviews = data.reviews ?? []

  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: s.name, url })
      else {
        await navigator.clipboard.writeText(url)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      }
    } catch {
      // Share sheet closed: nothing to do.
    }
  }

  return (
    <div className="biz-page">
      <div className="container">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link> <span aria-hidden="true">›</span> <Link to="/search">Experiences</Link> <span aria-hidden="true">›</span>{' '}
          <span aria-current="page">{s.name}</span>
        </nav>
      </div>
      <div className={`biz-cover${cover ? '' : ' biz-cover-plain'}`}>
        {cover && <Img src={cover} alt="" fallbackText="" />}
      </div>

      <div className="container">

        <header className="biz-head">
          <div className="biz-logo">{s.logo ? <img src={s.logo} alt={`${s.name} logo`} /> : <span>{s.name.charAt(0)}</span>}</div>
          <div className="biz-title">
            <h1>{s.name}</h1>
            <p className="biz-tags">
              {s.verified && (
                <span className="verified-badge">
                  <CheckIcon size={14} /> Verified business
                </span>
              )}
              {s.type && <span>{s.type}</span>}
              {s.since && <span>On {SITE_NAME} since {s.since}</span>}
            </p>
            {locations.length > 0 && (
              <p className="biz-where">
                <PinIcon size={16} /> {locations.join(' · ')}
              </p>
            )}
          </div>
          <div className="biz-actions">
            <a href="#experiences" className="btn btn-brand">
              See {stats.listings === 1 ? 'the experience' : `all ${stats.listings} experiences`}
            </a>
            <button type="button" className="btn btn-outline" onClick={share}>
              {shared ? 'Link copied ✓' : 'Share'}
            </button>
          </div>
        </header>

        <dl className="biz-stats">
          <div>
            <dt>Experiences</dt>
            <dd>{stats.listings}</dd>
          </div>
          <div>
            <dt>Rating</dt>
            <dd>{stats.reviews > 0 ? <Rating value={stats.rating} count={stats.reviews} showValue /> : <span className="muted">New, no reviews yet</span>}</dd>
          </div>
          <div>
            <dt>Reviews</dt>
            <dd>{stats.reviews}</dd>
          </div>
          <div>
            <dt>Languages</dt>
            <dd>{languages.length || '—'}</dd>
          </div>
        </dl>

        <div className="biz-layout">
          <main className="biz-main">
            {s.bio && (
              <section className="biz-section">
                <h2>About {s.name}</h2>
                <p className="biz-bio">{s.bio}</p>
              </section>
            )}

            <section className="biz-section" id="experiences">
              <div className="biz-section-head">
                <h2>Experiences by {s.name}</h2>
                {tours.length > 1 && (
                  <label className="biz-sort">
                    Sort by{' '}
                    <select className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                      <option value="recommended">Most booked</option>
                      <option value="rating">Best rated</option>
                      <option value="price_asc">Price: low to high</option>
                      <option value="price_desc">Price: high to low</option>
                    </select>
                  </label>
                )}
              </div>
              {categories.length > 1 && (
                <div className="chip-row" role="group" aria-label="Filter by category">
                  <button type="button" className={`chip${cat ? '' : ' active'}`} aria-pressed={!cat} onClick={() => setCat('')}>
                    All ({tours.length})
                  </button>
                  {categories.map(([key, c]) => (
                    <button key={key} type="button" className={`chip${cat === key ? ' active' : ''}`} aria-pressed={cat === key} onClick={() => setCat(key)}>
                      {c.name} ({c.n})
                    </button>
                  ))}
                </div>
              )}
              {shown.length ? (
                <div className="grid">
                  {shown.map((t) => (
                    <TourCard key={t.id} tour={t} />
                  ))}
                </div>
              ) : (
                <p className="panel empty-cta">{s.name} has no experiences online right now. Check back soon.</p>
              )}
            </section>

            {reviews.length > 0 && (
              <section className="biz-section">
                <h2>What travellers say</h2>
                <ul className="biz-reviews">
                  {reviews.map((r) => (
                    <li key={r.id} className="panel">
                      <Rating value={r.rating} />
                      {r.title && <h3>{r.title}</h3>}
                      <p>{r.content}</p>
                      <p className="card-meta">
                        {r.author} · {formatDay(r.date.slice(0, 10))} · <Link to={`/tour/${r.listing.slug}/`}>{r.listing.title}</Link>
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </main>

          <aside className="biz-side">
            <section className="panel biz-card">
              <h2>Business details</h2>
              <ul className="biz-facts">
                {s.type && (
                  <li>
                    <UsersIcon size={18} />
                    <span>
                      <strong>Business type</strong>
                      {s.type}
                    </span>
                  </li>
                )}
                {locations.length > 0 && (
                  <li>
                    <PinIcon size={18} />
                    <span>
                      <strong>Operates in</strong>
                      {locations.join(', ')}
                    </span>
                  </li>
                )}
                {s.coverage && (
                  <li>
                    <PinIcon size={18} />
                    <span>
                      <strong>Service area</strong>
                      {s.coverage}
                    </span>
                  </li>
                )}
                {languages.length > 0 && (
                  <li>
                    <LanguageIcon size={18} />
                    <span>
                      <strong>Languages</strong>
                      <span className="biz-langs">
                        {languages.map((l) => (
                          <span key={l} className="pill">
                            {l}
                          </span>
                        ))}
                      </span>
                    </span>
                  </li>
                )}
                {s.website && (
                  <li>
                    <GlobeIcon size={18} />
                    <span>
                      <strong>Website</strong>
                      <a href={s.website} target="_blank" rel="noopener noreferrer nofollow">
                        {host(s.website)} ↗
                      </a>
                    </span>
                  </li>
                )}
              </ul>
            </section>

            <section className={`panel biz-trust${s.verified ? ' ok' : ''}`}>
              <ShieldIcon size={22} />
              <div>
                <strong>{s.verified ? `Verified by ${SITE_NAME}` : 'Listed on ' + SITE_NAME}</strong>
                <p>
                  {s.verified
                    ? 'Our team checked this business: its website, contact details and the licences its activities need.'
                    : 'Every listing is reviewed by our team before it goes live.'}
                </p>
              </div>
            </section>

            <section className="panel biz-how">
              <h2>How booking works</h2>
              <ol>
                <li>Choose an experience and send a booking request. It's free.</li>
                <li>{s.name} answers you directly, usually within 24 hours.</li>
                <li>You confirm with them. Nothing is charged until you agree.</li>
              </ol>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
