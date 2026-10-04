import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
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
          path="host"
          element={
            <RequireAuth>
              <HostDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="host/new"
          element={
            <RequireAuth>
              <ListingForm />
            </RequireAuth>
          }
        />
        <Route
          path="host/listings/:id/edit"
          element={
            <RequireAuth>
              <ListingForm />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
