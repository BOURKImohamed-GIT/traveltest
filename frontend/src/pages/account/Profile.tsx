import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth'
import type { AccountType } from '../../types'

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const [type, setType] = useState<AccountType>(user?.accountType ?? 'client')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')
  if (!user) return null

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setStatus('saving')
    try {
      await updateProfile({ name: String(f.get('name')), phone: String(f.get('phone')), accountType: type })
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
          <label htmlFor="pf-name">{type === 'supplier' ? 'Business name' : 'Name'}</label>
          <input id="pf-name" name="name" className="input" required minLength={2} maxLength={80} defaultValue={user.name} />
        </div>
        <div className="field">
          <label htmlFor="pf-email">Email</label>
          <input id="pf-email" className="input" value={user.email} readOnly />
          <span className="fine">This is your Google account email. Booking emails go here.</span>
        </div>
        <div className="field">
          <label htmlFor="pf-phone">Phone or WhatsApp {type === 'supplier' ? '(shown to clients after they book)' : '(optional)'}</label>
          <input id="pf-phone" name="phone" type="tel" className="input" maxLength={30} defaultValue={user.phone} />
        </div>
        <fieldset className="account-type-field">
          <legend>Account type</legend>
          <label className="check">
            <input type="radio" name="accountType" checked={type === 'client'} onChange={() => setType('client')} /> Traveller: I book trips
          </label>
          <label className="check">
            <input type="radio" name="accountType" checked={type === 'supplier'} onChange={() => setType('supplier')} /> Business: I publish listings and answer
            booking requests
          </label>
          <span className="fine">Business accounts can still book trips for themselves.</span>
        </fieldset>
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
