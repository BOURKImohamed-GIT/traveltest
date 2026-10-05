import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useCategories, type CategoryTree } from '../categories'
import { SITE_NAME, USING_SAMPLE_DATA } from '../config'
import { useSettings } from '../settings'
import type { SocialLink } from '../types'
import Footer from './Footer'
import { ChevronIcon, HeartIcon, LogoMark, MailIcon, MenuIcon, PhoneIcon, PinIcon } from './Icons'
import SocialLinks from './SocialLinks'

const categoryHref = (slug: string) => `/search?category=${slug}`

/** Agency pages after the tour menus, in menu order. */
const PAGES = [
  { to: '/about-us', label: 'About Us' },
  { to: '/contact', label: 'Contact Us' },
  { to: '/faqs', label: 'FAQs' },
]

/** Small links in the orange tab under the menu. */
const TAB_LINKS = [{ to: '/', label: 'Home' }, ...PAGES]

/** Address, phone and email on the left; square icon links on the right. */
function TopBar() {
  const settings = useSettings()
  const c = settings?.contact
  if (!settings) return <div className="topbar" />
  const icons: SocialLink[] = [
    ...(c?.phone ? [{ network: 'phone', label: `Call ${c.phone}`, url: `tel:${c.phone.replace(/[^\d+]/g, '')}` }] : []),
    ...(c?.whatsapp ? [{ network: 'whatsapp', label: 'WhatsApp', url: `https://wa.me/${c.whatsapp}` }] : []),
    ...settings.social,
  ]
  return (
    <div className="topbar">
      <div className="container">
        <ul className="topbar-contact">
          {c?.address && (
            <li>
              <PinIcon size={16} /> {c.address.split('\n')[0]}
            </li>
          )}
          {c?.phone && (
            <li>
              <PhoneIcon size={16} /> <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</a>
            </li>
          )}
          {c?.email && (
            <li>
              <MailIcon size={16} /> <a href={`mailto:${c.email}`}>{c.email}</a>
            </li>
          )}
        </ul>
        <SocialLinks links={icons} className="topbar-icons" />
      </div>
    </div>
  )
}

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
  const { pathname, search } = useLocation()
  const here = pathname + search
  const category = new URLSearchParams(search).get('category')
  const tops = tree?.all.filter((c) => !c.parent) ?? []
  const hasKids = (slug: string) => !!tree?.all.some((c) => c.parent === slug)
  // A group is current when its own page or one of its sub-categories is open.
  const inGroup = (slug: string) => !!category && (category === slug || tree?.bySlug[category]?.parent === slug)
  const cls = (active: boolean) => (active ? 'active' : undefined)
  return (
    <>
      <div className="nav-desktop">
        <Link to="/" className={cls(pathname === '/')}>
          Home
        </Link>
        {tops.map((top) =>
          hasKids(top.slug) ? (
            <details className={`nav-menu${inGroup(top.slug) ? ' active' : ''}`} key={top.slug}>
              <summary>
                {top.name} <ChevronIcon size={16} />
              </summary>
              <div className="menu-panel">{tree && <GroupList tree={tree} slug={top.slug} />}</div>
            </details>
          ) : (
            <Link key={top.slug} to={categoryHref(top.slug)} className={cls(here === categoryHref(top.slug))}>
              {top.name}
            </Link>
          ),
        )}
        <Link to="/about-us" className={cls(pathname === '/about-us')}>
          About Us
        </Link>
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
            {TAB_LINKS.map((p) => (
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
              <MainNav tree={tree} key={pathname + search} />
              <SavedLink />
            </nav>
          </div>
        </div>
        <div className="container tab-row">
          <nav className="header-tab" aria-label="Quick links">
            {TAB_LINKS.map((p) => (
              <Link key={p.to} to={p.to}>
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
