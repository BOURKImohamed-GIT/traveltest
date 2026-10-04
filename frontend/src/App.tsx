import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuth } from './auth'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import AccountLayout from './pages/account/AccountLayout'
import MyBookings from './pages/account/MyBookings'
import Profile from './pages/account/Profile'
import Requests from './pages/account/Requests'
import Destination from './pages/Destination'
import Home from './pages/Home'
import HostDashboard from './pages/HostDashboard'
import ListingForm from './pages/ListingForm'
import NotFound from './pages/NotFound'
import Saved from './pages/Saved'
import Search from './pages/Search'
import SignIn from './pages/SignIn'
import TourDetail from './pages/TourDetail'

/** Old /tours/:slug links keep working. */
function TourRedirect() {
  const { slug = '' } = useParams()
  return <Navigate to={`/listings/${slug}`} replace />
}

/** Old /host/listings/:id/edit links keep working. */
function HostEditRedirect() {
  const { id = '' } = useParams()
  return <Navigate to={`/account/listings/${id}/edit`} replace />
}

/** /account opens the most useful tab for the account type. */
function AccountHome() {
  const { user } = useAuth()
  return <Navigate to={user?.accountType === 'supplier' ? '/account/listings' : '/account/bookings'} replace />
}

/** Business-only tabs send travellers to their bookings. */
function SupplierOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user?.accountType === 'supplier' ? <>{children}</> : <Navigate to="/account/bookings" replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="destinations/:slug" element={<Destination />} />
        <Route path="listings/:slug" element={<TourDetail />} />
        <Route path="tours/:slug" element={<TourRedirect />} />
        <Route path="saved" element={<Saved />} />
        <Route path="signin" element={<SignIn />} />
        <Route
          path="account"
          element={
            <RequireAuth>
              <AccountLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AccountHome />} />
          <Route path="bookings" element={<MyBookings />} />
          <Route path="profile" element={<Profile />} />
          <Route
            path="listings"
            element={
              <SupplierOnly>
                <HostDashboard />
              </SupplierOnly>
            }
          />
          <Route path="listings/new" element={<ListingForm />} />
          <Route path="listings/:id/edit" element={<ListingForm />} />
          <Route
            path="requests"
            element={
              <SupplierOnly>
                <Requests />
              </SupplierOnly>
            }
          />
        </Route>
        <Route path="host" element={<Navigate to="/account/listings" replace />} />
        <Route path="host/new" element={<Navigate to="/account/listings/new" replace />} />
        <Route path="host/listings/:id/edit" element={<HostEditRedirect />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
