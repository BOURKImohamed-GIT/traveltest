import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { CONTACT, USING_SAMPLE_DATA } from '../config'
import { ChatIcon, MailIcon, PhoneIcon, PinIcon } from '../components/Icons'

export default function Contact() {
  const { user } = useAuth()
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const s = (k: string) => String(f.get(k) ?? '').trim()
    setStatus('sending')
    try {
      await api.sendContact({ name: s('name'), email: s('email'), phone: s('phone'), subject: s('subject'), message: s('message'), website: s('website') })
      setStatus('sent')
    } catch (err) {
      setError((err as Error).message)
      setStatus('error')
    }
  }

  const hasDetails = CONTACT.email || CONTACT.phone || CONTACT.whatsapp || CONTACT.address

  return (
    <div className="container contact-page">
      <div className="page-title">
        <h1>Contact Us</h1>
        <p>Planning a trip? Tell us your dates and what you'd like to see, and we'll reply within 24 hours.</p>
      </div>
      <div className="contact-layout">
        {status === 'sent' ? (
          <p className="notice success" role="status">
            {USING_SAMPLE_DATA ? 'Preview only: on the live site your message goes to our team.' : 'Thanks! Your message has been sent. We will reply by email soon.'}
          </p>
        ) : (
          <form className="form" onSubmit={submit}>
            <div className="form-row">
              <div className="field">
                <label htmlFor="ct-name">Name</label>
                <input id="ct-name" name="name" className="input" required minLength={2} autoComplete="name" defaultValue={user?.name} />
              </div>
              <div className="field">
                <label htmlFor="ct-email">Email</label>
                <input id="ct-email" name="email" type="email" className="input" required autoComplete="email" defaultValue={user?.email} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="ct-phone">Phone or WhatsApp (optional)</label>
                <input id="ct-phone" name="phone" type="tel" className="input" autoComplete="tel" defaultValue={user?.phone} />
              </div>
              <div className="field">
                <label htmlFor="ct-subject">Subject</label>
                <input id="ct-subject" name="subject" className="input" maxLength={120} placeholder="e.g. 7-day family tour in April" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="ct-message">Message</label>
              <textarea
                id="ct-message"
                name="message"
                className="textarea"
                rows={6}
                required
                minLength={10}
                placeholder="Travel dates, number of travellers, starting city, what you'd like to see…"
              />
            </div>
            <div className="hp" aria-hidden="true">
              <label htmlFor="ct-website">Website</label>
              <input id="ct-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            {status === 'error' && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <div>
              <button type="submit" className="btn btn-brand" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </form>
        )}

        <aside className="contact-aside" aria-label="Contact details">
          {hasDetails ? (
            <ul className="contact-list">
              {CONTACT.phone && (
                <li>
                  <PhoneIcon size={20} /> <span>{CONTACT.phone}</span>
                </li>
              )}
              {CONTACT.whatsapp && (
                <li>
                  <ChatIcon size={20} /> <a href={`https://wa.me/${CONTACT.whatsapp}`}>WhatsApp us</a>
                </li>
              )}
              {CONTACT.email && (
                <li>
                  <MailIcon size={20} /> <span>{CONTACT.email}</span>
                </li>
              )}
              {CONTACT.address && (
                <li>
                  <PinIcon size={20} /> <span>{CONTACT.address}</span>
                </li>
              )}
            </ul>
          ) : (
            <p className="card-meta">Send us a message with the form and our team will reply by email.</p>
          )}
          <p className="fine">Already booked? Find your requests and our replies in My bookings.</p>
        </aside>
      </div>
    </div>
  )
}
