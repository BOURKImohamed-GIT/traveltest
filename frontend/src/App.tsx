import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import Contact from './pages/Contact'
import ContentPage from './pages/ContentPage'
import Destination from './pages/Destination'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Saved from './pages/Saved'
import Search from './pages/Search'
import TourDetail from './pages/TourDetail'

/** Tours live at /tour/:slug, the same address WordPress uses ("View" in wp-admin). Older links keep working. */
function TourRedirect() {
  const { slug = '' } = useParams()
  return <Navigate to={`/tour/${slug}/`} replace />
}

function DestinationRedirect() {
  const { slug = '' } = useParams()
  return <Navigate to={`/destination/${slug}/`} replace />
}

/** Pages written in WordPress, served at /<slug>. */
const CONTENT_PAGES = ['about-us', 'faqs', 'booking-cancellation-policy', 'privacy-policy', 'terms-and-conditions']

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="destination/:slug" element={<Destination />} />
        <Route path="destinations/:slug" element={<DestinationRedirect />} />
        <Route path="tour/:slug" element={<TourDetail />} />
        <Route path="listings/:slug" element={<TourRedirect />} />
        <Route path="tours/:slug" element={<TourRedirect />} />
        <Route path="contact" element={<Contact />} />
        {CONTENT_PAGES.map((slug) => (
          <Route key={slug} path={slug} element={<ContentPage slug={slug} key={slug} />} />
        ))}
        <Route path="saved" element={<Saved />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
