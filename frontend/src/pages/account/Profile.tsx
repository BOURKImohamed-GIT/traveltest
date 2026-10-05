import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth'

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')
  if (!user) return null

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setStatus('saving')
    try {
      await updateProfile({ name: String(f.get('name')), phone: String(f.get('phone')) })
      setStatus('saved')
    } catch (err) {
      setError((err as Error).message)
      setStatus('error')
    }
  }

  return (
    <section aria-labelledby="pf-h">
      <h2 id="pf-h" className="account-title">
        Profile
      </h2>
      <form className="form profile-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="pf-name">Name</label>
          <input id="pf-name" name="name" className="input" required minLength={2} maxLength={80} defaultValue={user.name} />
        </div>
        <div className="field">
          <label htmlFor="pf-email">Email</label>
          <input id="pf-email" className="input" value={user.email} readOnly />
          <span className="fine">This is your Google account email. Booking emails go here.</span>
        </div>
        <div className="field">
          <label htmlFor="pf-phone">Phone or WhatsApp (optional, helps our team reach you)</label>
          <input id="pf-phone" name="phone" type="tel" className="input" maxLength={30} defaultValue={user.phone} />
        </div>
        {status === 'error' && <p className="notice error">{error}</p>}
        {status === 'saved' && (
          <p className="notice success" role="status">
            Saved.
          </p>
        )}
        <div>
          <button type="submit" className="btn btn-primary" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </section>
  )
}
