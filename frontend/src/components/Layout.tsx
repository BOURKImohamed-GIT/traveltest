import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useCategories } from '../categories'
import { SITE_NAME, USING_SAMPLE_DATA } from '../config'
import { DEFAULT_FOOTER, DEFAULT_QUICK, defaultPrimary, isCurrent, useMenus } from '../menus'
import { useSettings } from '../settings'
import { useSupplier } from '../supplier/sessionContext'
import { useTraveller } from '../traveller/sessionContext'
import type { MenuItem } from '../types'
import Footer from './Footer'
import MenuLink from './MenuLink'
import { ChevronIcon, HeartIcon, LogoMark, MenuIcon, UserIcon } from './Icons'

/** Orange top bar: a short promise on the left, account buttons on the right. */
function TopBar() {
  const { user: traveller } = useTraveller()
  const { user: supplier } = useSupplier()
  return (
    <div className="topbar">
      <div className="container">
        <p className="topbar-tagline">Tours & activities with local experts across Morocco</p>
        <div className="topbar-actions">
          <Link to={supplier ? '/supplier' : '/supplier/join'} className="tb-btn tb-outline">
            {supplier ? 'Supplier dashboard' : 'List your experience'}
          </Link>
          <Link to={traveller ? '/account' : '/signin'} className="tb-btn tb-solid">
            <UserIcon size={16} /> {traveller ? 'My bookings' : 'Sign in'}
          </Link>
        </div>
      </div>
    </div>
  )
}

function SavedLink() {
  return (
    <Link to="/saved" className="nav-saved" aria-label="Saved tours" title="Saved tours">
      <HeartIcon size={20} />
    </Link>
  )
}

/** Dropdown entries: the children, then the parent's own page ("All …"). */
function SubList({ entry }: { entry: MenuItem }) {
  return (
    <ul className="menu-list">
      {entry.children.map((c, i) => (
        <li key={i}>
          <MenuLink entry={c} />
        </li>
      ))}
      {entry.url && (
        <li className="menu-all">
          <MenuLink entry={{ ...entry, title: entry.url === '/search?category=tour-packages' ? 'All tours' : `All ${entry.title.toLowerCase()}` }} />
        </li>
      )}
    </ul>
  )
}

function MainNav({ items, quick }: { items: MenuItem[]; quick: MenuItem[] }) {
  const { pathname, search } = useLocation()
  const here = pathname + search
  return (
    <>
      <div className="nav-desktop">
        {items.map((entry, i) =>
          entry.children.length ? (
            <details className={`nav-menu${isCurrent(entry, here) ? ' active' : ''}`} key={i}>
              <summary>
                {entry.title} <ChevronIcon size={16} />
              </summary>
              <div className="menu-panel">
                <SubList entry={entry} />
              </div>
            </details>
          ) : (
            <MenuLink key={i} entry={entry} className={isCurrent(entry, here) ? 'active' : undefined} />
          ),
        )}
      </div>
      <details className="nav-menu nav-mobile">
        <summary aria-label="Menu">
          <MenuIcon size={22} />
        </summary>
        <div className="menu-panel menu-panel-right menu-scroll">
          {items.map((entry, i) =>
            entry.children.length ? (
              <div key={i}>
                <p className="menu-heading">{entry.title}</p>
                <SubList entry={entry} />
              </div>
            ) : (
              <ul className="menu-list menu-split" key={i}>
                <li>
                  <MenuLink entry={entry} />
                </li>
              </ul>
            ),
          )}
          <ul className="menu-list menu-split">
            {quick
              .filter((q) => !items.some((m) => m.url === q.url))
              .map((q, i) => (
                <li key={i}>
                  <MenuLink entry={q} />
                </li>
              ))}
          </ul>
          <ul className="menu-list menu-split">
            <li>
              <Link to="/saved">Saved tours</Link>
            </li>
            <li>
              <Link to="/signin">Sign in / My bookings</Link>
            </li>
            <li>
              <Link to="/supplier/join">List your experience</Link>
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
  const menus = useMenus()
  const primary = menus?.primary ?? defaultPrimary(tree)
  const quick = menus?.quick ?? DEFAULT_QUICK

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
      <header className={`site-header${pathname === '/' ? ' over-hero' : ''}`}>
        <TopBar />
        <div className="mainbar">
          <div className="container">
            <Link to="/" className="logo logo-box" aria-label={`${SITE_NAME} home`}>
              {settings?.logo ? (
                <img src={settings.logo} alt={SITE_NAME} />
              ) : (
                <>
                  <LogoMark />
                  <span>{SITE_NAME}</span>
                </>
              )}
            </Link>
            <nav className="main-nav" aria-label="Main">
              {/* Remount on navigation so open menus close. */}
              <MainNav items={primary} quick={quick} key={pathname + search} />
              <SavedLink />
            </nav>
          </div>
        </div>
        <div className="container tab-row">
          <nav className="header-tab" aria-label="Quick links">
            {quick.map((q, i) => (
              <MenuLink key={i} entry={q} />
            ))}
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <Footer links={menus?.footer ?? DEFAULT_FOOTER} />
    </>
  )
}
