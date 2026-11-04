import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container empty">
      <h2>We couldn't find that page</h2>
      <p>It may have moved, or the link may be wrong.</p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
        Back to home
      </Link>
    </div>
  )
}
