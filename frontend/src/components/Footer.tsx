import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCategories } from '../categories'
import { asset, SITE_NAME } from '../config'
import { useSettings } from '../settings'
import { useSupplier } from '../supplier/sessionContext'
import type { MenuItem } from '../types'
import MenuLink from './MenuLink'
import SocialLinks from './SocialLinks'

const YEAR = new Date().getFullYear()

const DEFAULT_ABOUT =
  'A Morocco travel marketplace: desert adventures, day trips, multi-day tours, cooking classes and more, run by local guides and operators.'

/** The only networks shown (Agency details → Social media). */
const NETWORKS = ['facebook', 'x', 'instagram', 'pinterest', 'linkedin']

const EXPLORE = [
  ['Multi-day tours', '/search?category=tour-packages'],
  ['Day trips', '/search?category=day-trips'],
  ['Desert adventures', '/search?category=desert-adventures'],
  ['Desert camps & experiences', '/search?category=desert-camps'],
  ['City tours', '/search?category=city-tours'],
  ['Food & cooking', '/search?category=food-culinary'],
  ['Saved', '/saved'],
]

const LEGAL = [
  ['Terms & Conditions', '/terms-and-conditions'],
  ['Privacy Policy', '/privacy-policy'],
  ['Booking & Cancellation Policy', '/booking-cancellation-policy'],
  ['Contact us', '/contact'],
]

/** ["PayPal", "Wise", "Cash"] → "PayPal, Wise and Cash" */
function joinList(items: string[]) {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function Col({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="footer-col">
      <h3>{title}</h3>
      {children}
    </div>
  )
}

/** Light footer in the Tripadvisor style: link columns, then ©, policy links and social icons. links: the footer menu. */
export default function Footer({ links }: { links: MenuItem[] }) {
  const settings = useSettings()
  const { user } = useSupplier()
  const { tree } = useCategories()
  const [more, setMore] = useState(false)
  const social = settings?.social.filter((s) => NETWORKS.includes(s.network)) ?? []
  const about = [settings?.about || DEFAULT_ABOUT, settings?.payments.length ? `We accept ${joinList(settings.payments)}.` : ''].filter(Boolean).join(' ')

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <Col title={`About ${SITE_NAME}`}>
          <ul className="footer-links">
            {links.map((l, i) => (
              <li key={i}>
                <MenuLink entry={l} />
              </li>
            ))}
          </ul>
        </Col>

        <Col title="Explore">
          <ul className="footer-links">
            {EXPLORE.map(([label, to]) => (
              <li key={to}>
                <Link to={to}>{label}</Link>
              </li>
            ))}
          </ul>
        </Col>

        <div className="footer-col">
          <h3>Do business with us</h3>
          <ul className="footer-links">
            <li>
              <Link to="/supplier/join">List your experience</Link>
            </li>
            <li>{user ? <Link to="/supplier">Supplier dashboard</Link> : <Link to="/supplier/login">Supplier sign in</Link>}</li>
            <li>
              <Link to="/terms-and-conditions">Supplier terms</Link>
            </li>
          </ul>
          <h3 className="footer-sub">Travellers</h3>
          <ul className="footer-links">
            <li>
              <Link to="/signin">Sign in / create account</Link>
            </li>
            <li>
              <Link to="/account">My bookings</Link>
            </li>
            <li>
              <Link to="/contact">Help & contact</Link>
            </li>
          </ul>
        </div>

        <Col title="Top destinations">
          <ul className="footer-sentences">
            {(tree?.packages ?? []).slice(0, 6).map((p) => (
              <li key={p.slug}>
                Morocco tours from <Link to={`/search?category=${p.slug}`}>{p.name.replace(/^Morocco Tours From /, '')}</Link>
              </li>
            ))}
          </ul>
        </Col>
      </div>

      <div className="container footer-bottom">
        <div className="footer-legal">
          <div className="footer-brand">
            <span className="footer-logo">
              <img src={settings?.logo || asset('images/logo-white.png')} alt={SITE_NAME} />
            </span>
            <span>
              © {YEAR} {SITE_NAME}. All rights reserved.
            </span>
          </div>
          <nav aria-label="Policies" className="footer-policy">
            {LEGAL.map(([label, to]) => (
              <Link key={to} to={to}>
                {label}
              </Link>
            ))}
          </nav>
          <p className={`footer-about${more ? ' open' : ''}`}>{about}</p>
          {about.length > 160 && (
            <button type="button" className="footer-more" aria-expanded={more} onClick={() => setMore((m) => !m)}>
              {more ? 'Read less' : 'Read more'}
            </button>
          )}
        </div>
        {social.length > 0 && <SocialLinks links={social} className="footer-social" />}
      </div>
    </footer>
  )
}
