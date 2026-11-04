import { Link } from 'react-router-dom'
import { CheckIcon, ClockIcon, InfoIcon, ShieldIcon } from '../components/Icons'
import { SITE_NAME } from '../config'
import type { SupplierUser } from './types'

/**
 * The business's verification status as a big coloured banner, with the team's message
 * (when they asked for changes) and what to do next.
 */
export default function VerificationBanner({ user, onRequest, busy = false }: { user: SupplierUser; onRequest?: () => void; busy?: boolean }) {
  const v = user.verification
  const missing = user.checklist.filter((i) => !i.done && !i.optional)
  const ready = missing.length === 0

  const content = {
    rejected: {
      icon: <InfoIcon size={26} />,
      title: 'Changes needed before we can verify your business',
      text: 'Our team reviewed your business and asked for a few changes. Update your profile, then request verification again.',
    },
    pending: {
      icon: <ClockIcon size={26} />,
      title: 'We are reviewing your business',
      text: 'Our team checks new businesses within 1–2 working days. We email you as soon as it is done.',
    },
    verified: {
      icon: <CheckIcon size={26} />,
      title: 'Your business is verified',
      text: `Your listings show the Verified badge on ${SITE_NAME}. Travellers trust verified businesses more.`,
    },
    unverified: {
      icon: <ShieldIcon size={26} />,
      title: 'Get the Verified badge',
      text: ready
        ? 'Your profile is complete. Request verification and our team will review your business.'
        : `Complete your profile to request verification. Still missing: ${missing.map((i) => i.label).join(', ')}.`,
    },
  }[v.status]

  const canRequest = onRequest && (v.status === 'unverified' || v.status === 'rejected')

  return (
    <section className={`verify-banner verify-${v.status}`} role="status" aria-live="polite">
      <span className="verify-icon">{content.icon}</span>
      <div className="verify-body">
        <h2>{content.title}</h2>
        <p>{content.text}</p>
        {v.note && v.status !== 'verified' && (
          <blockquote className="verify-note">
            <span className="verify-note-label">Message from the {SITE_NAME} team</span>
            {v.note}
          </blockquote>
        )}
        {(v.status === 'rejected' || v.status === 'unverified') && (
          <div className="verify-actions">
            <Link to="/supplier/profile" className="btn verify-btn-main">
              Update business profile
            </Link>
            {canRequest && (
              <button type="button" className="btn verify-btn-alt" onClick={onRequest} disabled={busy || !ready} title={ready ? '' : 'Complete the missing items first'}>
                {v.status === 'rejected' ? 'Request verification again' : 'Request verification'}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
