import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronIcon, XIcon } from './Icons'
import Img from './Img'

interface Props {
  photos: (string | null)[]
  /** Photo to open on. */
  start: number
  title: string
  onClose: () => void
}

/**
 * Full-screen photo slider: arrows, swipe, keyboard (← → Esc), counter and thumbnails.
 */
export default function Lightbox({ photos, start, title, onClose }: Props) {
  const [index, setIndex] = useState(start)
  const closeRef = useRef<HTMLButtonElement>(null)
  const touchX = useRef<number | null>(null)
  const count = photos.length
  const go = (step: number) => setIndex((i) => (i + step + count) % count)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % count)
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + count) % count)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [count, onClose])

  // Keep the current thumbnail in view.
  useEffect(() => {
    document.querySelector('.lightbox-thumbs [aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [index])

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${title}: photos`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="lightbox-top">
        <span className="lightbox-count">
          {index + 1} / {count}
        </span>
        <button ref={closeRef} type="button" className="lightbox-btn" onClick={onClose} aria-label="Close photos">
          <XIcon size={24} />
        </button>
      </div>

      <div
        className="lightbox-stage"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
          touchX.current = null
        }}
      >
        {count > 1 && (
          <button type="button" className="lightbox-btn lightbox-prev" onClick={() => go(-1)} aria-label="Previous photo">
            <ChevronIcon size={28} />
          </button>
        )}
        <figure className="lightbox-figure" key={index}>
          <Img src={photos[index]} alt={`${title}, photo ${index + 1} of ${count}`} loading="eager" />
        </figure>
        {count > 1 && (
          <button type="button" className="lightbox-btn lightbox-next" onClick={() => go(1)} aria-label="Next photo">
            <ChevronIcon size={28} />
          </button>
        )}
      </div>

      {count > 1 && (
        <div className="lightbox-thumbs">
          {photos.map((src, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
            >
              <Img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  )
}
