import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { USING_SAMPLE_DATA } from '../../config'
import { supplierApi } from '../api'
import { useSupplier } from '../sessionContext'

export default function Login() {
  const { user, signIn } = useSupplier()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/supplier'
  const [mode, setMode] = useState<'login' | 'forgot' | 'sent'>('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to={from} replace />

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const email = String(f.get('email') ?? '').trim()
    setBusy(true)
    setError('')
    try {
      if (mode === 'forgot') {
        await supplierApi.forgot(email)
        setMode('sent')
      } else {
        signIn(await supplierApi.login(email, String(f.get('password') ?? '')))
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container narrow-page">
      <form className="form panel" onSubmit={submit}>
        <h1>{mode === 'login' ? 'Supplier sign in' : 'Reset your password'}</h1>
        {USING_SAMPLE_DATA && mode === 'login' && <p className="notice info">Preview: any email and password open the demo dashboard.</p>}
        {mode === 'sent' ? (
          <p className="notice success" role="status">
            If an account uses this email, we sent a link to choose a new password.
          </p>
        ) : (
          <>
            <div className="field">
              <label htmlFor="sl-email">Email</label>
              <input id="sl-email" name="email" type="email" className="input" required autoComplete="email" />
            </div>
            {mode === 'login' && (
              <div className="field">
                <label htmlFor="sl-password">Password</label>
                <input id="sl-password" name="password" type="password" className="input" required autoComplete="current-password" />
              </div>
            )}
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-brand btn-block" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Send reset link'}
            </button>
          </>
        )}
        <p className="fine">
          {mode === 'login' ? (
            <button type="button" className="link-button" onClick={() => setMode('forgot')}>
              Forgot your password?
            </button>
          ) : (
            <button type="button" className="link-button" onClick={() => setMode('login')}>
              Back to sign in
            </button>
          )}
          {' · '}
          New supplier? <Link to="/supplier/join">Create an account</Link>
        </p>
      </form>
    </div>
  )
}
