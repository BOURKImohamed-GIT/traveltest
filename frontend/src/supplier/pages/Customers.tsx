import { Link } from 'react-router-dom'
import { useAsync } from '../../useAsync'
import { supplierApi } from '../api'

/** Travellers who sent requests, grouped by email. */
export default function Customers() {
  const { data, loading } = useAsync(() => supplierApi.bookings(), [])
  const byEmail = new Map<string, { name: string; email: string; phone: string; requests: number; confirmed: number; last: string }>()
  for (const b of data ?? []) {
    const c = byEmail.get(b.email.toLowerCase()) ?? { name: b.name, email: b.email, phone: b.phone, requests: 0, confirmed: 0, last: b.date }
    c.requests++
    if (b.status === 'confirmed' || b.status === 'completed') c.confirmed++
    if (b.date > c.last) c.last = b.date
    c.phone ||= b.phone
    byEmail.set(b.email.toLowerCase(), c)
  }
  const customers = [...byEmail.values()].sort((a, b) => b.last.localeCompare(a.last))

  return (
    <>
      <h1 className="dash-title">Customers</h1>
      <p className="card-meta">Contact details are for answering bookings only; please don't add travellers to mailing lists without their consent.</p>
      {loading && !data ? (
        <p>Loading…</p>
      ) : customers.length === 0 ? (
        <p className="panel card-meta">
          No customers yet. They appear here when travellers send <Link to="/supplier/bookings">booking requests</Link>.
        </p>
      ) : (
        <div className="panel table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Requests</th>
                <th>Confirmed</th>
                <th>Latest date</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.email}>
                  <td>{c.name}</td>
                  <td>
                    <a href={`mailto:${c.email}`}>{c.email}</a>
                    {c.phone && (
                      <>
                        <br />
                        <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</a>
                      </>
                    )}
                  </td>
                  <td>{c.requests}</td>
                  <td>{c.confirmed}</td>
                  <td>{c.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
