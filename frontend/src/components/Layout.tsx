import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { PACKAGES, useCategories, type CategoryTree } from '../categories'
import { CONTACT, SITE_NAME, USING_SAMPLE_DATA } from '../config'
import { CategoryIcon, ChevronIcon, HeartIcon, LogoMark, MailIcon, MenuIcon, PhoneIcon } from './Icons'
import SearchBar from './SearchBar'

const YEAR = new Date().getFullYear()

const categoryHref = (slug: string) => `/search?category=${slug}`

function PackagesList({ tree }: { tree: CategoryTree }) {
  return (
    <ul className="menu-list">
      {tree.packages.map((c) => (
        <li key={c.slug}>
          <Link to={categoryHref(c.slug)}>{c.name}</Link>
        </li>
      ))}
      <li className="menu-all">
        <Link to={categoryHref(PACKAGES)}>All tour packages</Link>
      </li>
    </ul>
  )
}

function MainNav({ tree }: { tree: CategoryTree | undefined }) {
  const packagesName = tree?.bySlug[PACKAGES]?.name ?? 'Tour packages'
  return (
    <>
      <div className="nav-desktop">
        {tree && (
          <details className="nav-menu">
            <summary>
              {packagesName} <ChevronIcon size={16} />
            </summary>
            <div className="menu-panel">
              <PackagesList tree={tree} />
            </div>
          </details>
        )}
        {tree?.others.map((c) => (
          <Link key={c.slug} to={categoryHref(c.slug)}>
            {c.name}
          </Link>
        ))}
      </div>
      <details className="nav-menu nav-mobile">
        <summary aria-label="Menu">
          <MenuIcon size={22} />
        </summary>
        <div className="menu-panel menu-panel-right">
          {tree && (
            <>
              <p className="menu-heading">{packagesName}</p>
              <PackagesList tree={tree} />
              <ul className="menu-list menu-split">
                {tree.others.map((c) => (
                  <li key={c.slug}>
                    <Link to={categoryHref(c.slug)}>{c.name}</Link>
                  </li>
                ))}
                <li>
                  <Link to="/search">All tours</Link>
                </li>
                <li>
                  <Link to="/saved">Saved tours</Link>
                </li>
              </ul>
            </>
          )}
        </div>
      </details>
    </>
  )
}

export default function Layout() {
  const { pathname, search } = useLocation()
  const { tree } = useCategories()

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
            {/* Remount on navigation so open menus close. */}
            <MainNav tree={tree} key={pathname + search} />
            <NavLink to="/saved" aria-label="Saved tours" className="nav-saved">
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
              <h3>{tree?.bySlug[PACKAGES]?.name ?? 'Tour packages'}</h3>
              <ul>
                {tree?.packages.map((c) => (
                  <li key={c.slug}>
                    <Link to={categoryHref(c.slug)}>{c.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>More ways to explore</h3>
              <ul>
                {tree?.others.map((c) => (
                  <li key={c.slug}>
                    <Link to={categoryHref(c.slug)}>
                      <CategoryIcon slug={c.slug} size={14} /> {c.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/search">All tours</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3>Destinations</h3>
              <ul>
                <li><Link to="/destinations/marrakech">Tours from Marrakech</Link></li>
                <li><Link to="/destinations/fes">Tours from Fes</Link></li>
                <li><Link to="/destinations/tangier">Tours from Tangier</Link></li>
                <li><Link to="/destinations/casablanca">Tours from Casablanca</Link></li>
                <li><Link to="/destinations/ouarzazate">Tours from Ouarzazate</Link></li>
                <li><Link to="/destinations/errachidia">Tours from Errachidia</Link></li>
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
