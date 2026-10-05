import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { SITE_NAME, USING_SAMPLE_DATA } from '../config'
import GoogleButton from '../components/GoogleButton'
import { CalendarIcon, CheckIcon, SunIcon } from '../components/Icons'
import type { AccountType } from '../types'
import { useAsync } from '../useAsync'

/** Only allow in-app redirects after sign-in. */
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null
}

const TYPES: { type: AccountType; title: string; text: string; perks: string[] }[] = [
  {
    type: 'client',
    title: "I'm travelling",
    text: 'Book tours, day trips and activities',
    perks: ['See all your bookings in one place', 'Get confirmations by email', 'Save places for later'],
  },
  {
    type: 'supplier',
    title: 'I run a business',
    text: 'Tour company, guide or activity provider',
    perks: ['List your business for free', 'Booking requests straight to your inbox', 'Confirm or decline from your dashboard'],
  },
]

export default function SignIn() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, signInWithGoogle, signInDev } = useAuth()
  const config = useAsync(() => api.authConfig(), [])
  const initial = params.get('type')
  const [type, setType] = useState<AccountType | null>(initial === 'client' || initial === 'supplier' ? initial : null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const next = (t: AccountType | null) => safeNext(params.get('next')) ?? (t === 'supplier' ? '/account/listings' : '/account/bookings')

  if (user) return <Navigate to={next(user.accountType)} replace />

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await fn()
      navigate(next(type), { replace: true })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function demo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    run(() => signInDev(String(f.get('email')), String(f.get('name')), type ?? 'client'))
  }

  const chosen = TYPES.find((t) => t.type === type)

  return (
    <div className="container auth-page">
      <div className="auth-card">
        <h1>Sign in to {SITE_NAME}</h1>

        {!chosen ? (
          <>
            <p className="card-meta">How will you use {SITE_NAME}?</p>
            <div className="type-choice" role="group" aria-label="Account type">
              {TYPES.map((t) => (
                <button key={t.type} type="button" className="type-option" onClick={() => setType(t.type)}>
                  {t.type === 'client' ? <SunIcon size={26} /> : <CalendarIcon size={26} />}
                  <strong>{t.title}</strong>
                  <span>{t.text}</span>
                </button>
              ))}
            </div>
            <p className="fine">You can change this later in your profile.</p>
          </>
        ) : (
          <>
            <div className="type-chosen">
              <span>
                <strong>{chosen.title}</strong> · {chosen.text}
              </span>
              <button type="button" className="link-button" onClick={() => setType(null)}>
                Change
              </button>
            </div>
            <ul className="auth-perks">
              {chosen.perks.map((p) => (
                <li key={p}>
                  <CheckIcon size={16} /> {p}
                </li>
              ))}
            </ul>

            {config.loading && <p className="card-meta">Loading…</p>}
            {config.data?.googleClientId && (
              <div className="auth-google">
                <GoogleButton clientId={config.data.googleClientId} onCredential={(c) => run(() => signInWithGoogle(c, chosen.type))} />
              </div>
            )}

            {config.data?.devLogin && (
              <form className="form auth-demo" onSubmit={demo}>
                <p className="notice info">
                  {USING_SAMPLE_DATA
                    ? 'Preview mode: sign in with a demo account. Nothing you add is published or sent.'
                    : 'Test sign-in for local development. Turn TRAVEL_DEV_LOGIN off before going live.'}
                </p>
                <div className="field">
                  <label htmlFor="demo-name">{chosen.type === 'supplier' ? 'Business name' : 'Your name'}</label>
                  <input id="demo-name" name="name" className="input" required defaultValue={chosen.type === 'supplier' ? 'Riad Atlas' : 'Sara'} />
                </div>
                <div className="field">
                  <label htmlFor="demo-email">Email</label>
                  <input
                    id="demo-email"
                    name="email"
                    type="email"
                    className="input"
                    required
                    defaultValue={chosen.type === 'supplier' ? 'owner@example.com' : 'traveller@example.com'}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                  {busy ? 'Signing in…' : 'Continue with demo account'}
                </button>
              </form>
            )}

            {config.data && !config.data.googleClientId && !config.data.devLogin && (
              <p className="notice info">Sign-in isn't available yet. Please try again later.</p>
            )}
          </>
        )}

        {config.error && <p className="notice error">Couldn't load sign-in: {config.error.message}</p>}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <p className="fine">
          <Link to="/">Back to {SITE_NAME}</Link>
        </p>
      </div>
    </div>
  )
}
