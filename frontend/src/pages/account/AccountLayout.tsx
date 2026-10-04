import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth'

export default function AccountLayout() {
  const { user, signOut } = useAuth()
  if (!user) return null
  const supplier = user.accountType === 'supplier'

  return (
    <div className="container account">
      <div className="account-head">
        <span className="avatar" aria-hidden="true">
          {user.avatar ? <img src={user.avatar} alt="" referrerPolicy="no-referrer" /> : user.name.charAt(0).toUpperCase()}
        </span>
        <div>
          <h1>{user.name}</h1>
          <p className="card-meta">
            {supplier ? 'Business account' : 'Traveller account'} · {user.email}
          </p>
        </div>
        <button type="button" className="btn btn-ghost account-signout" onClick={signOut}>
          Sign out
        </button>
      </div>
      <nav className="account-tabs" aria-label="Account">
        {supplier && <NavLink to="/account/listings">My listings</NavLink>}
        {supplier && <NavLink to="/account/requests">Booking requests</NavLink>}
        <NavLink to="/account/bookings">My bookings</NavLink>
        <NavLink to="/account/profile">Profile</NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
