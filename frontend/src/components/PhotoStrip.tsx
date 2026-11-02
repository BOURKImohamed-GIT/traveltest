import { useEffect, useState } from 'react'

export interface PhotoRef {
  id: number
  thumb: string
  url: string
}

/** Small thumbnails; a click shows the photo large (Esc or a click closes it). */
export default function PhotoStrip({ photos, label = 'Photo' }: { photos: PhotoRef[]; label?: string }) {
  const [open, setOpen] = useState<number | null>(null)
  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') setOpen((i) => (i === null ? i : (i + 1) % photos.length))
      if (e.key === 'ArrowLeft') setOpen((i) => (i === null ? i : (i - 1 + photos.length) % photos.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, photos.length])
  if (!photos.length) return null
  return (
    <>
      <ul className="photo-strip">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button type="button" onClick={() => setOpen(i)} aria-label={`Open ${label.toLowerCase()} ${i + 1} of ${photos.length}`}>
              <img src={p.thumb || p.url} alt="" loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
      {open !== null && (
        <div className="photo-view" role="dialog" aria-modal="true" aria-label={`${label} ${open + 1} of ${photos.length}`} onClick={() => setOpen(null)}>
          <img src={photos[open].url} alt="" />
          <button type="button" className="photo-view-close" aria-label="Close" onClick={() => setOpen(null)}>
            ✕
          </button>
        </div>
      )}
    </>
  )
}
