import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useCategories } from '../categories'
import { logoUrl, SITE_NAME, USING_SAMPLE_DATA } from '../config'
import { DEFAULT_FOOTER, DEFAULT_QUICK, defaultPrimary, isCurrent, useMenus } from '../menus'
import { useSettings } from '../settings'
import { useSupplier } from '../supplier/sessionContext'
import { useTraveller } from '../traveller/sessionContext'
import type { MenuItem } from '../types'
import Footer from './Footer'
import MenuLink from './MenuLink'
import { BriefcaseIcon, ChevronIcon, HeartIcon, MenuIcon, UserIcon } from './Icons'
import SearchBar from './SearchBar'

/** Right side of the header: list your experience, saved, sign in (or the dashboards). */
function HeaderActions() {
  const { user: traveller } = useTraveller()
  const { user: supplier } = useSupplier()
  return (
    <div className="head-actions">
      <Link to={supplier ? '/supplier' : '/supplier/join'} className="head-link head-supplier">
        <span className="head-icon">
          <BriefcaseIcon size={20} />
          {!!supplier && supplier.newBookings + (supplier.unreadMessages ?? 0) > 0 && (
            <b className="notif-badge" aria-label={`${supplier.newBookings} new booking requests, ${supplier.unreadMessages ?? 0} unread messages`}>
              {supplier.newBookings + (supplier.unreadMessages ?? 0)}
            </b>
          )}
        </span>
        <span>{supplier ? 'Supplier dashboard' : 'List your experience'}</span>
      </Link>
      <Link to="/saved" className="head-link" aria-label="Saved">
        <HeartIcon size={20} />
        <span>Saved</span>
      </Link>
      {supplier || traveller ? (
        <AccountMenu />
      ) : (
        <Link to="/signin" className="head-signin">
          <UserIcon size={18} />
          <span>Sign in</span>
        </Link>
      )}
    </div>
  )
}

/** Signed in (business or traveller): their name, with their pages and Sign out. */
function AccountMenu() {
  const { user: traveller, signOut: travellerOut } = useTraveller()
  const { user: supplier, signOut: supplierOut } = useSupplier()
  const navigate = useNavigate()
  const menu = useRef<HTMLDetailsElement>(null)
  const { pathname } = useLocation()
  // Close the menu after moving to another page.
  useEffect(() => menu.current?.removeAttribute('open'), [pathname])
  // …and when clicking anywhere else.
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node)) menu.current.removeAttribute('open')
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const name = supplier?.name || traveller?.name || 'Account'
  const signOut = () => {
    menu.current?.removeAttribute('open')
    // Leave the private page first, so its "please sign in" redirect doesn't win.
    navigate('/')
    window.setTimeout(() => {
      if (supplier) supplierOut()
      if (traveller) travellerOut()
    }, 0)
  }

  return (
    <details className="head-account" ref={menu}>
      <summary className="head-signin" aria-label={`Account menu for ${name}`}>
        {supplier?.logo ? <img src={supplier.logo} alt="" className="head-account-logo" /> : <UserIcon size={18} />}
        <span className="head-account-name">{name}</span>
        <ChevronIcon size={14} />
      </summary>
      <div className="head-account-menu" role="menu" onClick={(e) => (e.target as HTMLElement).closest('a') && menu.current?.removeAttribute('open')}>
        <p className="head-account-who" onClick={(e) => e.stopPropagation()}>
          Signed in as <strong>{supplier ? supplier.email : traveller?.email}</strong>
        </p>
        {supplier && (
          <>
            <Link to="/supplier" role="menuitem">
              Supplier dashboard
            </Link>
            <Link to="/supplier/messages" role="menuitem">
              Messages
              {supplier.unreadMessages > 0 && <b className="notif-badge">{supplier.unreadMessages}</b>}
            </Link>
            <Link to="/supplier/bookings" role="menuitem">
              Bookings & inquiries
              {supplier.newBookings > 0 && <b className="notif-badge">{supplier.newBookings}</b>}
            </Link>
            <Link to="/supplier/profile" role="menuitem">
              Business profile
            </Link>
            <Link to="/supplier/account" role="menuitem">
              Account & password
            </Link>
          </>
        )}
        {traveller && (
          <>
            <Link to="/account" role="menuitem">
              My bookings
            </Link>
            <Link to="/account#settings-title" role="menuitem">
              Account settings
            </Link>
          </>
        )}
        <button type="button" role="menuitem" className="head-account-out" onClick={signOut}>
          Sign out
        </button>
      </div>
    </details>
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
      <header className="site-header">
        <div className="container head-grid">
          {/* The logo takes the full height on the left; search, account and menu sit to its right. */}
          <Link to="/" className="logo logo-box" aria-label={`${SITE_NAME} home`}>
            {/* Agency details → Logo image replaces it. */}
            <img src={settings?.logo || logoUrl()} alt={SITE_NAME} decoding="async" />
          </Link>
          <div className="head-rows">
            <div className="headbar">
              {pathname !== '/' && (
                <div className="head-search">
                  <SearchBar compact placeholder="Search tours, activities, places…" key={pathname} />
                </div>
              )}
              <HeaderActions />
              {/* Phones and tablets: the menu button. Remount on navigation so open menus close. */}
              <nav className="main-nav nav-compact" aria-label="Menu">
                <MainNav items={primary} quick={quick} key={pathname + search} />
              </nav>
            </div>
            <div className="navbar">
              <nav className="main-nav nav-wide" aria-label="Main">
                <MainNav items={primary} quick={quick} key={pathname + search} />
              </nav>
            </div>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <Footer links={menus?.footer ?? DEFAULT_FOOTER} />
    </>
  )
}
