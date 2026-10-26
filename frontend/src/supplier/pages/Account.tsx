import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { storeToken, supplierApi } from '../api'
import { useSupplier } from '../sessionContext'
import { VERIFICATION } from '../types'

/** Verification (checklist, documents, request) and sign-in details. */
export default function Account() {
  const { user, setUser, signOut } = useSupplier()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  if (!user) return null
  const v = user.verification
  const ready = user.checklist.every((i) => i.done || i.optional)

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      if (ok) setMsg({ ok: true, text: ok })
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const uploadDoc = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) run(async () => {
      await supplierApi.upload(file, 'document')
      setUser(await supplierApi.me())
    }, 'Document uploaded.')
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    if (f.get('new') !== f.get('confirm')) return setPwMsg({ ok: false, text: 'The new passwords do not match.' })
    try {
      const { token } = await supplierApi.changePassword(String(f.get('current')), String(f.get('new')))
      storeToken(token)
      form.reset()
      setPwMsg({ ok: true, text: 'Password changed. Other devices were signed out.' })
    } catch (err) {
      setPwMsg({ ok: false, text: (err as Error).message })
    }
  }

  return (
    <>
      <h1 className="dash-title">Account & verification</h1>

      <section className="panel form">
        <div className="panel-head">
          <h2>Verification</h2>
          <span className={`status-pill status-${v.status}`}>{VERIFICATION[v.status]}</span>
        </div>
        <p className="fine">
          Verified suppliers get a badge on their listings. We check your business registration, licences and insurance for the activities you
          offer.
        </p>
        {v.note && <p className="notice info">Our team: {v.note}</p>}
        <ul className="checklist">
          {user.checklist.map((i) => (
            <li key={i.key} className={i.done ? 'done' : ''}>
              <span className="tick" aria-hidden="true">
                {i.done ? '✓' : ''}
              </span>
              {i.label}
              {i.optional && <span className="fine"> (optional for now)</span>}
            </li>
          ))}
        </ul>
        {!ready && (
          <p className="fine">
            Complete the missing items in your <Link to="/supplier/profile">business profile</Link>.
          </p>
        )}

        <h3>Documents</h3>
        <p className="fine">Business registration, tourism or guide licence, insurance, vehicle permits. PDF or image, up to 8 MB. Only our team sees them.</p>
        {user.documents.length > 0 && (
          <ul className="simple-list">
            {user.documents.map((d) => (
              <li key={d.id}>
                <a href={d.url} target="_blank" rel="noreferrer">
                  {d.name}
                </a>{' '}
                <button
                  type="button"
                  className="link-button danger"
                  onClick={() => run(async () => setUser(await supplierApi.deleteDocument(d.id)))}
                  disabled={busy}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="form-actions">
          <label className="btn btn-outline">
            Upload a document
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={uploadDoc} hidden disabled={busy} />
          </label>
          {(v.status === 'unverified' || v.status === 'rejected') && (
            <button
              type="button"
              className="btn btn-brand"
              disabled={busy || !ready}
              onClick={() => run(async () => setUser(await supplierApi.requestVerification()), 'Thanks! Our team will review your details and email you.')}
            >
              Request verification
            </button>
          )}
        </div>
        {msg && (
          <p className={`notice ${msg.ok ? 'success' : 'error'}`} role="status">
            {msg.text}
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Change password</h2>
        <p className="fine">Signed in as {user.email}.</p>
        <form className="form" onSubmit={changePassword}>
          <div className="field">
            <label htmlFor="a-current">Current password</label>
            <input id="a-current" name="current" type="password" className="input" required autoComplete="current-password" />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="a-new">New password</label>
              <input id="a-new" name="new" type="password" className="input" required minLength={8} autoComplete="new-password" />
            </div>
            <div className="field">
              <label htmlFor="a-confirm">Repeat new password</label>
              <input id="a-confirm" name="confirm" type="password" className="input" required minLength={8} autoComplete="new-password" />
            </div>
          </div>
          {pwMsg && (
            <p className={`notice ${pwMsg.ok ? 'success' : 'error'}`} role="status">
              {pwMsg.text}
            </p>
          )}
          <div className="form-actions">
            <button type="submit" className="btn btn-outline">
              Change password
            </button>
            <button type="button" className="btn btn-ghost" onClick={signOut}>
              Sign out
            </button>
          </div>
        </form>
      </section>
    </>
  )
}
