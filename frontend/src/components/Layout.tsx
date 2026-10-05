import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useCategories, type CategoryTree } from '../categories'
import { SITE_NAME, USING_SAMPLE_DATA } from '../config'
import { useSettings } from '../settings'
import { CategoryIcon, ChevronIcon, HeartIcon, LogoMark, MenuIcon } from './Icons'
import SearchBar from './SearchBar'
import SocialLinks from './SocialLinks'

const YEAR = new Date().getFullYear()

const categoryHref = (slug: string) => (slug === 'camping' ? '/camping' : `/search?category=${slug}`)

/** Agency pages after the tour menus, in menu order. */
const PAGES = [
  { to: '/about-us', label: 'About Us' },
  { to: '/contact', label: 'Contact Us' },
  { to: '/faqs', label: 'FAQs' },
]

const LEGAL = [
  { to: '/booking-cancellation-policy', label: 'Booking & Cancellation Policy' },
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/terms-and-conditions', label: 'Terms & Conditions' },
]

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
        <Link to={categoryHref(slug)}>{slug === 'tour-packages' ? 'All tours' : `All ${parent?.name.toLowerCase()}`}</Link>
      </li>
    </ul>
  )
}

function SavedLink() {
  return (
    <Link to="/saved" className="nav-saved" aria-label="Saved tours" title="Saved tours">
      <HeartIcon size={20} />
    </Link>
  )
}

function MainNav({ tree }: { tree: CategoryTree | undefined }) {
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
        {PAGES.map((p) => (
          <Link key={p.to} to={p.to}>
            {p.label}
          </Link>
        ))}
      </div>
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
            {PAGES.map((p) => (
              <li key={p.to}>
                <Link to={p.to}>{p.label}</Link>
              </li>
            ))}
          </ul>
          <ul className="menu-list menu-split">
            <li>
              <Link to="/saved">Saved tours</Link>
            </li>
          </ul>
        </div>
      </details>
    </>
  )
}

export default function Layout() {
  const { pathname, search } = useLocation()
  const { tree } = useCategories()
  const settings = useSettings()

  // Only one header menu open at a time; clicking elsewhere closes them.
  useEffect(() => {
    const menus = () => Array.from(document.querySelectorAll<HTMLDetailsElement>('.nav-menu[open]'))
    const onClick = (e: MouseEvent) => {
      const inside = (e.target as Element).closest('.nav-menu')
      menus().forEach((m) => m !== inside && m.removeAttribute('open'))
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') menus().forEach((m) => m.removeAttribute('open'))
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      {USING_SAMPLE_DATA && (
        <div className="sample-banner">Preview mode: sample tours. Forms are not sent anywhere.</div>
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
            <SavedLink />
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
              <p style={{ margin: 0, color: 'var(--muted)' }}>Private desert tours, day trips, camping and activities across Morocco, with our own local team.</p>
              {settings && <SocialLinks links={settings.social} className="footer-social" />}
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
              <h3>Explore</h3>
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
                {PAGES.map((p) => (
                  <li key={p.to}>
                    <Link to={p.to}>{p.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {YEAR} {SITE_NAME}
            </span>
            <nav className="footer-legal" aria-label="Legal">
              {LEGAL.map((l) => (
                <Link key={l.to} to={l.to}>
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </>
  )
}
