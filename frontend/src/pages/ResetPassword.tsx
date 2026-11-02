import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PASSWORD_HINT, passwordProblem, resetPassword } from '../account'

/** Opened from the "reset your password" email (suppliers and travellers). */
export default function ResetPassword() {
  const [params] = useSearchParams()
  const login = params.get('login') ?? ''
  const key = params.get('key') ?? ''
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ supplier: boolean } | null>(null)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const password = String(f.get('password') ?? '')
    if (password !== f.get('confirm')) return setError('The two passwords do not match.')
    const problem = passwordProblem(password, login.includes('@') ? login : '')
    if (problem) return setError(problem)
    setBusy(true)
    setError('')
    try {
      setDone(await resetPassword(login, key, password))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!login || !key) {
    return (
      <div className="container narrow-page">
        <div className="panel auth-panel">
          <h1>This link is incomplete</h1>
          <p>Open the link from the email again, or ask for a new one.</p>
          <p>
            <Link to="/signin">Traveller sign in</Link> · <Link to="/supplier/login">Supplier sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="container narrow-page">
        <div className="panel auth-panel">
          <h1>Password changed</h1>
          <p className="notice success" role="status">
            Your new password is saved. For your safety, every device that was signed in has been signed out.
          </p>
          <Link to={done.supplier ? '/supplier/login' : '/signin'} className="btn btn-brand btn-block">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container narrow-page">
      <form className="form panel auth-panel" onSubmit={submit}>
        <h1>Choose a new password</h1>
        <div className="field">
          <label htmlFor="r-password">New password</label>
          <input id="r-password" name="password" type="password" className="input" required minLength={8} autoComplete="new-password" autoFocus />
          <p className="fine">{PASSWORD_HINT}</p>
        </div>
        <div className="field">
          <label htmlFor="r-confirm">Repeat new password</label>
          <input id="r-confirm" name="confirm" type="password" className="input" required minLength={8} autoComplete="new-password" />
        </div>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-brand btn-block" disabled={busy}>
          {busy ? 'Please wait…' : 'Save new password'}
        </button>
        <p className="fine">
          Link expired? Ask for a new one from <Link to="/signin">traveller sign in</Link> or <Link to="/supplier/login">supplier sign in</Link>.
        </p>
      </form>
    </div>
  )
}
