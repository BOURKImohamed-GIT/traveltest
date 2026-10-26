import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSupplier } from '../sessionContext'
import { VERIFICATION } from '../types'

const NAV = [
  ['/supplier', 'Overview', true],
  ['/supplier/listings', 'My listings', false],
  ['/supplier/bookings', 'Bookings & inquiries', false],
  ['/supplier/customers', 'Customers', false],
  ['/supplier/profile', 'Business profile', false],
  ['/supplier/account', 'Account & verification', false],
] as const

/** Signed-in supplier area: side menu + the section. */
export default function DashboardLayout() {
  const { user, signOut } = useSupplier()
  const { pathname } = useLocation()

  if (user === undefined) return <div className="container section">Loading…</div>
  if (!user) return <Navigate to="/supplier/login" replace state={{ from: pathname }} />

  return (
    <div className="container dashboard">
      <aside className="dash-nav" aria-label="Supplier dashboard">
        <div className="dash-who">
          {user.logo ? <img src={user.logo} alt="" /> : <span className="dash-initial">{(user.name || '?').charAt(0)}</span>}
          <div>
            <strong>{user.name}</strong>
            <span className={`status-pill status-${user.verification.status}`}>{VERIFICATION[user.verification.status]}</span>
          </div>
        </div>
        <nav>
          {NAV.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end}>
              {label}
              {to === '/supplier/bookings' && user.newBookings > 0 && (
                <b className="notif-badge" aria-label={`${user.newBookings} new`}>
                  {user.newBookings}
                </b>
              )}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="btn btn-ghost" onClick={signOut}>
          Sign out
        </button>
      </aside>
      <div className="dash-main">
        <Outlet />
      </div>
    </div>
  )
}

