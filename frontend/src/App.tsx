import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import AccountLayout from './pages/account/AccountLayout'
import MyBookings from './pages/account/MyBookings'
import Profile from './pages/account/Profile'
import Camping from './pages/Camping'
import Contact from './pages/Contact'
import ContentPage from './pages/ContentPage'
import Destination from './pages/Destination'
import Home from './pages/Home'
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

/** Pages written in WordPress, served at /<slug>. */
const CONTENT_PAGES = ['about-us', 'faqs', 'booking-cancellation-policy', 'privacy-policy', 'terms-and-conditions']

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="destinations/:slug" element={<Destination />} />
        <Route path="listings/:slug" element={<TourDetail />} />
        <Route path="tours/:slug" element={<TourRedirect />} />
        <Route path="camping" element={<Camping />} />
        <Route path="contact" element={<Contact />} />
        {CONTENT_PAGES.map((slug) => (
          <Route key={slug} path={slug} element={<ContentPage slug={slug} key={slug} />} />
        ))}
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
          <Route index element={<Navigate to="/account/bookings" replace />} />
          <Route path="bookings" element={<MyBookings />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
