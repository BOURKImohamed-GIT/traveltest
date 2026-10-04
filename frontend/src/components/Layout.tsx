import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { SITE_NAME, USING_SAMPLE_DATA } from '../config'
import { FlagIcon, HeartIcon, HotelIcon, LogoMark, TicketIcon } from './Icons'
import SearchBar from './SearchBar'

const YEAR = new Date().getFullYear()

export default function Layout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      {USING_SAMPLE_DATA && (
        <div className="sample-banner">Showing sample data. Set VITE_WP_API_URL to connect WordPress.</div>
      )}
      <header className="site-header">
        <div className="container">
          <Link to="/" className="logo" aria-label={`${SITE_NAME} home`}>
            <LogoMark />
            <span>{SITE_NAME}</span>
          </Link>
          {pathname !== '/' && (
            <div className="header-search">
              <SearchBar compact key={pathname} />
            </div>
          )}
          <nav className="main-nav" aria-label="Main">
            <Link to="/search?type=hotels" className="nav-text">
              Hotels
            </Link>
            <Link to="/search?type=tours" className="nav-text">
              Tours
            </Link>
            <NavLink to="/saved" aria-label="Saved">
              <HeartIcon size={20} />
            </NavLink>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Link to="/" className="logo" style={{ marginBottom: 10 }}>
                <LogoMark />
                <span>{SITE_NAME}</span>
              </Link>
              <p style={{ margin: 0, color: 'var(--muted)' }}>Hand-picked tours, stays and experiences, reviewed by real travelers.</p>
            </div>
            <div>
              <h3>Explore</h3>
              <ul>
                <li>
                  <Link to="/search?type=hotels">
                    <HotelIcon size={14} /> Hotels
                  </Link>
                </li>
                <li>
                  <Link to="/search?type=things-to-do">
                    <TicketIcon size={14} /> Things to do
                  </Link>
                </li>
                <li>
                  <Link to="/search?type=tours">
                    <FlagIcon size={14} /> Tours
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3>Destinations</h3>
              <ul>
                <li><Link to="/destinations/marrakech">Marrakech</Link></li>
                <li><Link to="/destinations/lisbon">Lisbon</Link></li>
                <li><Link to="/destinations/kyoto">Kyoto</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {YEAR} {SITE_NAME}</span>
            <span>Prices are per person unless stated.</span>
          </div>
        </div>
      </footer>
    </>
  )
}
