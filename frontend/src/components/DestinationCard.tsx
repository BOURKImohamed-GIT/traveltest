import { Link } from 'react-router-dom'
import type { Destination } from '../types'
import Img from './Img'

export default function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <Link to={`/destinations/${destination.slug}`} className="card dest-card">
      <div className="card-media">
        <Img src={destination.image} alt="" fallbackText="" />
        <div className="dest-label">
          <h3>{destination.name}</h3>
          <p>
            {destination.country} · {destination.tourCount} {destination.tourCount === 1 ? 'listing' : 'listings'}
          </p>
        </div>
      </div>
    </Link>
  )
}
