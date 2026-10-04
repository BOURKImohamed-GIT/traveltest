import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Destination from './pages/Destination'
import Home from './pages/Home'
import ListingDetail from './pages/ListingDetail'
import NotFound from './pages/NotFound'
import Saved from './pages/Saved'
import Search from './pages/Search'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="destinations/:slug" element={<Destination />} />
        <Route path="listings/:slug" element={<ListingDetail />} />
        <Route path="saved" element={<Saved />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
