import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { USING_SAMPLE_DATA } from '../../config'
import { travellerApi } from '../api'
import { useTraveller } from '../sessionContext'

/** Traveller sign in / create account. Suppliers are sent to their own sign-in. */
export default function SignIn() {
  const { user, signIn } = useTraveller()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/account'
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'sent'>('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to={from} replace />

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const s = (k: string) => String(f.get(k) ?? '').trim()
    setBusy(true)
    setError('')
    try {
      if (mode === 'forgot') {
        await travellerApi.forgot(s('email'))
        setMode('sent')
      } else {
        const session =
          mode === 'register'
            ? await travellerApi.register(s('name'), s('email'), String(f.get('password') ?? ''), s('website'))
            : await travellerApi.login(s('email'), String(f.get('password') ?? ''))
        signIn(session)
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const title = { login: 'Sign in', register: 'Create your account', forgot: 'Reset your password', sent: 'Check your email' }[mode]

  return (
    <div className="container narrow-page">
      <form className="form panel auth-panel" onSubmit={submit}>
        <h1>{title}</h1>
        {mode !== 'sent' && mode !== 'forgot' && (
          <div className="auth-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => setMode('login')}>
              Sign in
            </button>
            <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => setMode('register')}>
              Create account
            </button>
          </div>
        )}
        {USING_SAMPLE_DATA && mode !== 'sent' && <p className="notice info">Preview: any email and password work; nothing is saved.</p>}
        {mode === 'register' && <p className="fine">See your booking requests, offers and confirmations in one place.</p>}

        {mode === 'sent' ? (
          <p className="notice success" role="status">
            If an account uses this email, we sent a link to choose a new password.
          </p>
        ) : (
          <>
            {mode === 'register' && (
              <div className="field">
                <label htmlFor="ts-name">Full name</label>
                <input id="ts-name" name="name" className="input" required minLength={2} maxLength={80} autoComplete="name" />
              </div>
            )}
            <div className="field">
              <label htmlFor="ts-email">Email</label>
              <input id="ts-email" name="email" type="email" className="input" required autoComplete="email" />
            </div>
            {mode !== 'forgot' && (
              <div className="field">
                <label htmlFor="ts-password">Password</label>
                <input
                  id="ts-password"
                  name="password"
                  type="password"
                  className="input"
                  required
                  minLength={mode === 'register' ? 8 : undefined}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
                {mode === 'register' && <span className="fine">At least 8 characters.</span>}
              </div>
            )}
            <div className="hp" aria-hidden="true">
              <label htmlFor="ts-website">Website</label>
              <input id="ts-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-brand btn-block" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
            </button>
          </>
        )}
        <p className="fine">
          {mode === 'login' ? (
            <button type="button" className="link-button" onClick={() => setMode('forgot')}>
              Forgot your password?
            </button>
          ) : (
            mode !== 'register' && (
              <button type="button" className="link-button" onClick={() => setMode('login')}>
                Back to sign in
              </button>
            )
          )}
        </p>
        <p className="auth-supplier">
          Run tours or activities? <Link to="/supplier/login">Supplier sign in</Link> · <Link to="/supplier/join">List your experience</Link>
        </p>
      </form>
    </div>
  )
}
