import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { TourQuery } from '../types'
import { useAsync } from '../useAsync'
import { ChevronIcon } from './Icons'
import TourCard, { CardSkeleton } from './TourCard'

interface Props {
  id: string
  title: string
  sub?: string
  query: TourQuery
  /** "See all" link. */
  more?: string
}

/** A row of tour cards with arrow buttons (swipe on phones); hidden when nothing matches. */
export default function TourSlider({ id, title, sub, query, more }: Props) {
  const tours = useAsync(() => api.tours({ perPage: 12, ...query }).then((r) => r.items), [])
  const track = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })

  const update = () => {
    const el = track.current
    if (!el) return
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }
  useEffect(update, [tours.data])

  // Move by one card.
  const step = (dir: 1 | -1) => {
    const el = track.current
    const card = el?.firstElementChild as HTMLElement | null
    if (el && card) el.scrollBy({ left: dir * (card.offsetWidth + 24), behavior: 'smooth' })
  }

  if (tours.data && tours.data.length === 0) return null
  return (
    <section className="section container" aria-labelledby={id}>
      <div className="section-head slider-head">
        <div>
          <h2 id={id}>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        <div className="slider-arrows">
          {more && (
            <Link to={more} className="see-all">
              See all
            </Link>
          )}
          <button type="button" className="slider-arrow slider-prev" onClick={() => step(-1)} disabled={edge.start} aria-label="Previous tours">
            <ChevronIcon size={22} />
          </button>
          <button type="button" className="slider-arrow slider-next" onClick={() => step(1)} disabled={edge.end} aria-label="Next tours">
            <ChevronIcon size={22} />
          </button>
        </div>
      </div>
      <div className="slider-track" ref={track} onScroll={update} role="region" aria-label={title} tabIndex={0}>
        {tours.data ? tours.data.map((t) => <TourCard key={t.id} tour={t} />) : [0, 1, 2].map((i) => <CardSkeleton key={i} />)}
      </div>
    </section>
  )
}
