import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useAsync } from '../useAsync'
import { ChevronIcon } from './Icons'
import TourCard, { CardSkeleton } from './TourCard'

/**
 * Horizontal slider of tour cards with arrow buttons (swipe on phones).
 * Shows tour packages after the first few, which the "Popular tours" row already lists.
 */
export default function TourSlider({ id, title, sub }: { id: string; title: string; sub: string }) {
  const tours = useAsync(() => api.tours({ category: 'tour-packages', perPage: 15 }).then((r) => r.items.slice(3)), [])
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
          <p>{sub}</p>
        </div>
        <div className="slider-arrows">
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
