import { useState, type FormEvent } from 'react'
import { PASSWORD_HINT, passwordProblem } from '../../account'
import { travellerApi } from '../api'
import { useTraveller } from '../sessionContext'
import type { Traveller } from '../types'

type Msg = { ok: boolean; text: string } | null

function Notice({ msg }: { msg: Msg }) {
  return msg ? (
    <p className={`notice ${msg.ok ? 'success' : 'error'}`} role="status">
      {msg.text}
    </p>
  ) : null
}

/** Account settings under My bookings: details, password, devices, delete account. */
export default function AccountSettings({ user }: { user: Traveller }) {
  const { signIn, signOut, setUser } = useTraveller()
  const [details, setDetails] = useState<Msg>(null)
  const [pw, setPw] = useState<Msg>(null)
  const [danger, setDanger] = useState<Msg>(null)
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<void>, set: (m: Msg) => void) {
    setBusy(true)
    set(null)
    try {
      await fn()
    } catch (e) {
      set({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const saveDetails = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    run(async () => {
      const updated = await travellerApi.update({ name: String(f.get('name') ?? '').trim(), phone: String(f.get('phone') ?? '').trim() })
      setUser(updated)
      setDetails({ ok: true, text: 'Details saved.' })
    }, setDetails)
  }

  const changePassword = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    const next = String(f.get('new') ?? '')
    if (next !== f.get('confirm')) return setPw({ ok: false, text: 'The new passwords do not match.' })
    const problem = passwordProblem(next, user.email)
    if (problem) return setPw({ ok: false, text: problem })
    run(async () => {
      const { token } = await travellerApi.changePassword(String(f.get('current') ?? ''), next)
      signIn({ token, user })
      form.reset()
      setPw({ ok: true, text: 'Password changed. Other devices were signed out.' })
    }, setPw)
  }

  const logoutAll = () =>
    run(async () => {
      const { token } = await travellerApi.logoutAll()
      signIn({ token, user })
      setDanger({ ok: true, text: 'Every other device is signed out. You stay signed in here.' })
    }, setDanger)

  const deleteAccount = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    if (!window.confirm('Delete your account for good? Your booking requests stay with the suppliers, but you can no longer see them here.')) return
    run(async () => {
      await travellerApi.deleteAccount(String(f.get('password') ?? ''))
      signOut()
    }, setDanger)
  }

  return (
    <section className="account-settings" aria-labelledby="settings-title">
      <h2 id="settings-title" className="section-title">
        Account settings
      </h2>
      <div className="settings-grid">
        <form className="panel form" onSubmit={saveDetails}>
          <h3>Your details</h3>
          <div className="field">
            <label htmlFor="as-name">Name</label>
            <input id="as-name" name="name" className="input" defaultValue={user.name} required autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="as-email">Email</label>
            <input id="as-email" className="input" value={user.email} readOnly disabled />
            <p className="fine">To change your email, contact us.</p>
          </div>
          <div className="field">
            <label htmlFor="as-phone">Phone (optional, shared with suppliers you book with)</label>
            <input id="as-phone" name="phone" type="tel" className="input" defaultValue={user.phone} autoComplete="tel" />
          </div>
          <Notice msg={details} />
          <div className="form-actions">
            <button type="submit" className="btn btn-outline" disabled={busy}>
              Save details
            </button>
          </div>
        </form>

        <form className="panel form" onSubmit={changePassword}>
          <h3>Password</h3>
          <div className="field">
            <label htmlFor="as-current">Current password</label>
            <input id="as-current" name="current" type="password" className="input" autoComplete="current-password" />
            <p className="fine">Signed up with Google? Leave this empty to set a password.</p>
          </div>
          <div className="field">
            <label htmlFor="as-new">New password</label>
            <input id="as-new" name="new" type="password" className="input" required minLength={8} autoComplete="new-password" />
            <p className="fine">{PASSWORD_HINT}</p>
          </div>
          <div className="field">
            <label htmlFor="as-confirm">Repeat new password</label>
            <input id="as-confirm" name="confirm" type="password" className="input" required minLength={8} autoComplete="new-password" />
          </div>
          <Notice msg={pw} />
          <div className="form-actions">
            <button type="submit" className="btn btn-outline" disabled={busy}>
              Change password
            </button>
          </div>
        </form>

        <div className="panel form">
          <h3>Security</h3>
          <p className="fine">Lost a phone or used a shared computer? Sign out everywhere except this device.</p>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={logoutAll} disabled={busy}>
              Sign out other devices
            </button>
          </div>
          <form className="danger-zone" onSubmit={deleteAccount}>
            <h3>Delete account</h3>
            <p className="fine">Removes your account and sign-in. Type your password to confirm (leave empty if you only use Google).</p>
            <div className="field">
              <label htmlFor="as-del">Password</label>
              <input id="as-del" name="password" type="password" className="input" autoComplete="current-password" />
            </div>
            <button type="submit" className="btn btn-danger" disabled={busy}>
              Delete my account
            </button>
          </form>
          <Notice msg={danger} />
        </div>
      </div>
    </section>
  )
}
