import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { SITE_NAME, USING_SAMPLE_DATA } from '../config'
import GoogleButton from '../components/GoogleButton'
import { CheckIcon } from '../components/Icons'
import { useAsync } from '../useAsync'

/** Only allow in-app redirects after sign-in. */
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/host'
}

export default function SignIn() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const navigate = useNavigate()
  const { user, signInWithGoogle, signInDev } = useAuth()
  const config = useAsync(() => api.authConfig(), [])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={next} replace />

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await fn()
      navigate(next, { replace: true })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function demo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    run(() => signInDev(String(f.get('email')), String(f.get('name'))))
  }

  return (
    <div className="container auth-page">
      <div className="auth-card">
        <h1>Sign in to {SITE_NAME}</h1>
        <p className="card-meta">List your hotel, riad, bivouac, tour, activity or restaurant for free and reach travellers across Morocco.</p>
        <ul className="auth-perks">
          <li>
            <CheckIcon size={16} /> Publish as many listings as you need
          </li>
          <li>
            <CheckIcon size={16} /> Booking requests go straight to your inbox
          </li>
          <li>
            <CheckIcon size={16} /> Every listing is checked by our team before it goes live
          </li>
        </ul>

        {config.loading && <p className="card-meta">Loading…</p>}
        {config.data?.googleClientId && (
          <div className="auth-google">
            <GoogleButton clientId={config.data.googleClientId} onCredential={(c) => run(() => signInWithGoogle(c))} />
          </div>
        )}

        {config.data?.devLogin && (
          <form className="form auth-demo" onSubmit={demo}>
            <p className="notice info">
              {USING_SAMPLE_DATA
                ? 'Preview mode: sign in with a demo account. Listings you add stay in this browser and are never published.'
                : 'Test sign-in for local development. Turn TRAVEL_DEV_LOGIN off before going live.'}
            </p>
            <div className="field">
              <label htmlFor="demo-name">Business or your name</label>
              <input id="demo-name" name="name" className="input" required defaultValue="Riad Atlas" />
            </div>
            <div className="field">
              <label htmlFor="demo-email">Email</label>
              <input id="demo-email" name="email" type="email" className="input" required defaultValue="owner@example.com" />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Signing in…' : 'Continue with demo account'}
            </button>
          </form>
        )}

        {config.data && !config.data.googleClientId && !config.data.devLogin && (
          <p className="notice info">Sign-in isn't available yet. Please contact us to list your business.</p>
        )}
        {config.error && <p className="notice error">Couldn't load sign-in: {config.error.message}</p>}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <p className="fine">
          By continuing you agree to list only businesses you own or manage. <Link to="/">Back to {SITE_NAME}</Link>
        </p>
      </div>
    </div>
  )
}
