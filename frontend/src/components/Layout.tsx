import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'
import { useCategories, type CategoryTree } from '../categories'
import { SITE_NAME, USING_SAMPLE_DATA } from '../config'
import { CategoryIcon, ChevronIcon, LogoMark, MenuIcon } from './Icons'
import SearchBar from './SearchBar'

const YEAR = new Date().getFullYear()

const categoryHref = (slug: string) => `/search?category=${slug}`

function GroupList({ tree, slug }: { tree: CategoryTree; slug: string }) {
  const parent = tree.bySlug[slug]
  return (
    <ul className="menu-list">
      {tree.all
        .filter((c) => c.parent === slug)
        .map((c) => (
          <li key={c.slug}>
            <Link to={categoryHref(c.slug)}>{c.name}</Link>
          </li>
        ))}
      <li className="menu-all">
        <Link to={categoryHref(slug)}>All {parent?.name.toLowerCase()}</Link>
      </li>
    </ul>
  )
}

function AccountMenu() {
  const { user, signOut } = useAuth()
  if (!user) {
    return (
      <Link to="/signin" className="nav-signin">
        Sign in
      </Link>
    )
  }
  return (
    <details className="nav-menu">
      <summary aria-label={`Account: ${user.name}`}>
        <span className="avatar small" aria-hidden="true">
          {user.avatar ? <img src={user.avatar} alt="" referrerPolicy="no-referrer" /> : user.name.charAt(0).toUpperCase()}
        </span>
      </summary>
      <div className="menu-panel menu-panel-right">
        <p className="menu-heading">{user.name}</p>
        <ul className="menu-list">
          {user.accountType === 'supplier' && (
            <>
              <li>
                <Link to="/account/listings">My listings</Link>
              </li>
              <li>
                <Link to="/account/requests">Booking requests</Link>
              </li>
            </>
          )}
          <li>
            <Link to="/account/bookings">My bookings</Link>
          </li>
          <li>
            <Link to="/account/profile">Profile</Link>
          </li>
          <li>
            <Link to="/saved">Saved</Link>
          </li>
          <li>
            <button type="button" className="menu-button" onClick={signOut}>
              Sign out
            </button>
          </li>
        </ul>
      </div>
    </details>
  )
}

function MainNav({ tree }: { tree: CategoryTree | undefined }) {
  const { user } = useAuth()
  const tops = tree?.all.filter((c) => !c.parent) ?? []
  const hasKids = (slug: string) => !!tree?.all.some((c) => c.parent === slug)
  return (
    <>
      <div className="nav-desktop">
        {tops.map((top) =>
          hasKids(top.slug) ? (
            <details className="nav-menu" key={top.slug}>
              <summary>
                {top.name} <ChevronIcon size={16} />
              </summary>
              <div className="menu-panel">{tree && <GroupList tree={tree} slug={top.slug} />}</div>
            </details>
          ) : (
            <Link key={top.slug} to={categoryHref(top.slug)}>
              {top.name}
            </Link>
          ),
        )}
      </div>
      <Link to="/account/listings/new" className="btn btn-outline nav-list-btn">
        List your business
      </Link>
      <details className="nav-menu nav-mobile">
        <summary aria-label="Menu">
          <MenuIcon size={22} />
        </summary>
        <div className="menu-panel menu-panel-right menu-scroll">
          {tree &&
            tops.map((top) =>
              hasKids(top.slug) ? (
                <div key={top.slug}>
                  <p className="menu-heading">{top.name}</p>
                  <GroupList tree={tree} slug={top.slug} />
                </div>
              ) : (
                <ul className="menu-list menu-split" key={top.slug}>
                  <li>
                    <Link to={categoryHref(top.slug)}>{top.name}</Link>
                  </li>
                </ul>
              ),
            )}
          <ul className="menu-list menu-split">
            <li>
              <Link to="/account/listings/new">List your business</Link>
            </li>
            <li>
              <Link to="/saved">Saved</Link>
            </li>
            <li>{user ? <Link to="/account">My account</Link> : <Link to="/signin">Sign in</Link>}</li>
          </ul>
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
        <div className="sample-banner">Preview mode: sample listings. Forms are not sent anywhere and nothing you add is published.</div>
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
            <AccountMenu key={'acct' + pathname + search} />
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
              <p style={{ margin: 0, color: 'var(--muted)' }}>Hotels, riads, desert camps, tours, activities and restaurants across Morocco, reviewed by travellers.</p>
            </div>
            {tree?.all
              .filter((c) => !c.parent && tree.all.some((k) => k.parent === c.slug))
              .map((top) => (
                <div key={top.slug}>
                  <h3>{top.name}</h3>
                  <ul>
                    {tree.all
                      .filter((c) => c.parent === top.slug)
                      .map((c) => (
                        <li key={c.slug}>
                          <Link to={categoryHref(c.slug)}>{c.name}</Link>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            <div>
              <h3>More</h3>
              <ul>
                {tree?.all
                  .filter((c) => !c.parent && !tree.all.some((k) => k.parent === c.slug))
                  .map((c) => (
                    <li key={c.slug}>
                      <Link to={categoryHref(c.slug)}>
                        <CategoryIcon slug={c.slug} size={14} /> {c.name}
                      </Link>
                    </li>
                  ))}
                <li>
                  <Link to="/search">Everything</Link>
                </li>
                <li>
                  <Link to="/account/listings/new">List your business</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3>Destinations</h3>
              <ul>
                <li><Link to="/destinations/marrakech">Marrakech</Link></li>
                <li><Link to="/destinations/fes">Fes</Link></li>
                <li><Link to="/destinations/tangier">Tangier</Link></li>
                <li><Link to="/destinations/casablanca">Casablanca</Link></li>
                <li><Link to="/destinations/ouarzazate">Ouarzazate</Link></li>
                <li><Link to="/destinations/errachidia">Errachidia</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {YEAR} {SITE_NAME}</span>
            <span>Listings are published by local businesses and checked by our team.</span>
          </div>
        </div>
      </footer>
    </>
  )
}
