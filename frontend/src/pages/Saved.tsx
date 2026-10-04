import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import ListingCard from '../components/ListingCard'
import type { Listing } from '../types'

function savedSlugs(): string[] {
  try {
    return JSON.parse(localStorage.getItem('rihla:saved') ?? '[]')
  } catch {
    return []
  }
}

export default function Saved() {
  const [items, setItems] = useState<Listing[] | null>(null)

  useEffect(() => {
    const slugs = savedSlugs()
    Promise.allSettled(slugs.map((s) => api.listing(s))).then((results) =>
      setItems(results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))),
    )
  }, [])

  return (
    <div className="container">
      <div className="page-title">
        <h1>Saved</h1>
        <p>Places you've saved on this device.</p>
      </div>
      {items && items.length === 0 && (
        <div className="empty">
          <h2>Nothing saved yet</h2>
          <p>Tap the heart on any listing to save it here.</p>
          <Link to="/search" className="btn btn-primary" style={{ marginTop: 16 }}>
            Start exploring
          </Link>
        </div>
      )}
      <div className="grid section">{items?.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
    </div>
  )
}
