import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { CONTACT, SITE_NAME, USING_SAMPLE_DATA } from '../config'
import { CategoryIcon, HeartIcon, LogoMark, MailIcon, PhoneIcon } from './Icons'
import SearchBar from './SearchBar'

const YEAR = new Date().getFullYear()

const CATEGORIES = [
  ['desert-adventure', 'Sahara desert tours'],
  ['multi-day', 'Grand tours of Morocco'],
  ['day-trips', 'Day trips'],
  ['walking-tours', 'City & walking tours'],
  ['activities', 'Activities'],
]

export default function Layout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      {USING_SAMPLE_DATA && (
        <div className="sample-banner">Preview mode: sample tours. Booking and review forms are not sent anywhere.</div>
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
            <Link to="/search" className="nav-text">
              All tours
            </Link>
            <Link to="/search?category=desert-adventure" className="nav-text">
              Desert tours
            </Link>
            <NavLink to="/saved" aria-label="Saved tours">
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
              <p style={{ margin: 0, color: 'var(--muted)' }}>Private and small-group tours across Morocco, from Tangier to the Sahara.</p>
            </div>
            <div>
              <h3>Tour types</h3>
              <ul>
                {CATEGORIES.map(([slug, name]) => (
                  <li key={slug}>
                    <Link to={`/search?category=${slug}`}>
                      <CategoryIcon slug={slug} size={14} /> {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Destinations</h3>
              <ul>
                <li><Link to="/destinations/marrakech">Tours from Marrakech</Link></li>
                <li><Link to="/destinations/fes">Tours from Fes</Link></li>
                <li><Link to="/destinations/tangier">Tours from Tangier</Link></li>
                <li><Link to="/destinations/casablanca">Tours from Casablanca</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-contact">
            <h3>Plan your trip</h3>
            <p>
              <PhoneIcon size={16} /> Call or WhatsApp: <a href={CONTACT.whatsappHref}>{CONTACT.phone}</a>
            </p>
            <p>
              <MailIcon size={16} /> Email: <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            </p>
          </div>
          <div className="footer-bottom">
            <span>© {YEAR} {SITE_NAME}</span>
            <span>Tour prices are per adult unless stated.</span>
          </div>
        </div>
      </footer>
    </>
  )
}
