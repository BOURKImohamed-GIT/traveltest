import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import Contact from './pages/Contact'
import ContentPage from './pages/ContentPage'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Provider from './pages/Provider'
import Saved from './pages/Saved'
import Search from './pages/Search'
import TourDetail from './pages/TourDetail'
import Account from './supplier/pages/Account'
import Bookings from './supplier/pages/Bookings'
import Customers from './supplier/pages/Customers'
import DashboardLayout from './supplier/pages/DashboardLayout'
import Join from './supplier/pages/Join'
import Listings from './supplier/pages/Listings'
import Login from './supplier/pages/Login'
import NewListing from './supplier/pages/NewListing'
import Overview from './supplier/pages/Overview'
import Profile from './supplier/pages/Profile'
import Wizard from './supplier/pages/Wizard'
import { SupplierProvider } from './supplier/session'

/** Tours live at /tour/:slug, the same address WordPress uses ("View" in wp-admin). Older links keep working. */
function TourRedirect() {
  const { slug = '' } = useParams()
  return <Navigate to={`/tour/${slug}/`} replace />
}

/** City pages were replaced by the "Morocco Tours From …" lists. */
function DestinationRedirect() {
  const { slug = '' } = useParams()
  return <Navigate to={`/search?category=tours-from-${slug}`} replace />
}

/** Pages written in WordPress, served at /<slug>. */
const CONTENT_PAGES = ['about-us', 'faqs', 'booking-cancellation-policy', 'privacy-policy', 'terms-and-conditions']

export default function App() {
  return (
    <SupplierProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="destination/:slug" element={<DestinationRedirect />} />
          <Route path="destinations/:slug" element={<DestinationRedirect />} />
          <Route path="tour/:slug" element={<TourDetail />} />
          <Route path="listings/:slug" element={<TourRedirect />} />
          <Route path="tours/:slug" element={<TourRedirect />} />
          <Route path="contact" element={<Contact />} />
          {CONTENT_PAGES.map((slug) => (
            <Route key={slug} path={slug} element={<ContentPage slug={slug} key={slug} />} />
          ))}
          <Route path="saved" element={<Saved />} />
          <Route path="provider/:slug" element={<Provider />} />
          <Route path="supplier/join" element={<Join />} />
          <Route path="supplier/login" element={<Login />} />
          <Route path="supplier" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="listings" element={<Listings />} />
            <Route path="listings/new" element={<NewListing />} />
            <Route path="listings/:id/:step?" element={<Wizard />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="customers" element={<Customers />} />
            <Route path="profile" element={<Profile />} />
            <Route path="account" element={<Account />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </SupplierProvider>
  )
}
