import { Link } from 'react-router-dom'
import type { PublicSupplier } from '../types'
import { CheckIcon } from './Icons'

/** "Run by …": who answers the booking request. */
export default function SupplierCard({ supplier }: { supplier: PublicSupplier }) {
  const name = supplier.slug ? (
    <Link to={`/provider/${supplier.slug}`}>{supplier.name}</Link>
  ) : (
    supplier.name
  )
  return (
    <section className="detail-section supplier-card" aria-labelledby="sp-h">
      <h2 id="sp-h">Your host</h2>
      <div className="supplier-card-body">
        {supplier.logo ? <img src={supplier.logo} alt="" /> : <span className="dash-initial">{supplier.name.charAt(0)}</span>}
        <div>
          <p className="supplier-name">
            <strong>{name}</strong>
            {supplier.verified && (
              <span className="verified-badge">
                <CheckIcon size={14} /> Verified
              </span>
            )}
          </p>
          <p className="card-meta">{[supplier.type, supplier.since && `Member since ${supplier.since}`, supplier.languages].filter(Boolean).join(' · ')}</p>
          {supplier.bio && <p className="supplier-bio">{supplier.bio}</p>}
        </div>
      </div>
    </section>
  )
}
