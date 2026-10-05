import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { SITE_NAME } from '../config'
import { useSettings } from '../settings'
import type { Tour } from '../types'
import { useAsync } from '../useAsync'
import Img from './Img'
import SocialLinks from './SocialLinks'

const YEAR = new Date().getFullYear()

const DEFAULT_ABOUT =
  'A local Moroccan travel agency: private desert tours, day trips, camping and activities across Morocco, with our own drivers and guides.'

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

const REVIEW_SITES = ['google', 'tripadvisor', 'getyourguide', 'viator']

/** Tours for the footer lists, loaded once: 3 popular tours, 3 day trips, then more tour packages. */
async function loadFooterTours() {
  const [packages, dayTrips] = await Promise.all([
    api.tours({ category: 'tour-packages', perPage: 10 }),
    api.tours({ category: 'day-trips', perPage: 3 }),
  ])
  return { popular: packages.items.slice(0, 3), more: packages.items.slice(3), dayTrips: dayTrips.items }
}

function Thumbs({ tours }: { tours: Tour[] | undefined }) {
  return (
    <ul className="footer-thumbs">
      {tours?.map((t) => (
        <li key={t.id}>
          <Link to={`/listings/${t.slug}`}>
            <Img src={t.image} alt="" loading="lazy" />
            <span>{t.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="footer-col">
      <h3>{title}</h3>
      {children}
    </div>
  )
}

export default function Footer() {
  const settings = useSettings()
  const tours = useAsync(loadFooterTours, []).data
  const c = settings?.contact
  const reviewLinks = settings?.social.filter((s) => REVIEW_SITES.includes(s.network)) ?? []

  return (
    <footer className="site-footer">
      <div className="container footer-ribbon-row">
        <Link to="/contact" className="footer-ribbon">
          Questions or need more information? Contact us
        </Link>
      </div>
      <div className="container footer-grid">
        <FooterCol title="About us">
          <blockquote className="footer-about">{settings?.about || DEFAULT_ABOUT}</blockquote>
          {settings && <SocialLinks links={settings.social} className="footer-social" />}
        </FooterCol>

        <FooterCol title="Information">
          <ul className="footer-lines">
            {c?.phone && (
              <li>
                Phone: <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</a>
              </li>
            )}
            {c?.whatsapp && (
              <li>
                WhatsApp: <a href={`https://wa.me/${c.whatsapp}`}>+{c.whatsapp}</a>
              </li>
            )}
            {c?.email && (
              <li>
                <a href={`mailto:${c.email}`}>{c.email}</a>
              </li>
            )}
            {c?.address && <li>Address: {c.address}</li>}
            <li>
              <Link to="/contact">Send us a message</Link>
            </li>
          </ul>
        </FooterCol>

        <FooterCol title="Popular tours">
          <Thumbs tours={tours?.popular} />
        </FooterCol>

        <FooterCol title="Popular day trips">
          <Thumbs tours={tours?.dayTrips} />
        </FooterCol>

        <FooterCol title="Desert tours">
          <ul className="footer-lines">
            {tours?.more.map((t) => (
              <li key={t.id}>
                <Link to={`/listings/${t.slug}`}>{t.title}</Link>
              </li>
            ))}
          </ul>
        </FooterCol>

        {reviewLinks.length > 0 && (
          <FooterCol title="Reviews">
            <div className="footer-box">
              <p>Travelled with us? We'd love to hear from you.</p>
              <ul>
                {reviewLinks.map((r) => (
                  <li key={r.url}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="footer-box-btn">
                      {r.label} →
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </FooterCol>
        )}

        <FooterCol title="Useful links">
          <ul className="footer-lines">
            {[...PAGES, ...LEGAL].map((p) => (
              <li key={p.to}>
                <Link to={p.to}>{p.label}</Link>
              </li>
            ))}
          </ul>
        </FooterCol>

        {settings && settings.payments.length > 0 && (
          <FooterCol title="Accepted payment">
            <ul className="footer-box footer-payments">
              {settings.payments.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </FooterCol>
        )}
      </div>

      <div className="footer-bottom">
        <div className="container">
          <nav aria-label="Footer">
            <Link to="/">Home</Link>
            {PAGES.map((p) => (
              <Link key={p.to} to={p.to}>
                {p.label}
              </Link>
            ))}
          </nav>
          <span>
            © {YEAR} {SITE_NAME}
          </span>
        </div>
      </div>
    </footer>
  )
}
