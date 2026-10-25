import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { USING_SAMPLE_DATA } from '../../config'
import { listingSchema } from '../../listingSchema'
import { supplierApi } from '../api'
import { useSupplier } from '../sessionContext'

const STEPS = [
  ['Create your account', 'Business name, email and a password. Free to join.'],
  ['Complete your profile', 'Contact details, where you operate, languages, licences.'],
  ['Add your listings', 'A guided form for your type of experience, saved as you go.'],
  ['Get booking requests', 'Travellers send requests; you answer by email or from your dashboard.'],
]

export default function Join() {
  const { user, signIn } = useSupplier()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [error, setError] = useState('')

  if (user) return <Navigate to="/supplier" replace />

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const s = (k: string) => String(f.get(k) ?? '').trim()
    setStatus('sending')
    try {
      const session = await supplierApi.register({
        name: s('name'),
        businessName: s('business'),
        email: s('email'),
        password: String(f.get('password') ?? ''),
        acceptTerms: f.get('terms') === 'on',
        website: s('website'),
      })
      signIn(session)
      navigate('/supplier')
    } catch (err) {
      setError((err as Error).message)
      setStatus('error')
    }
  }

  const groups = listingSchema.menuGroups.map((g) => ({
    ...g,
    categories: listingSchema.categories.filter((c) => c.menuGroup === g.key),
  }))

  return (
    <div className="container supplier-join">
      <div className="join-intro">
        <p className="eyebrow">For tour operators, guides and activity providers</p>
        <h1>List your tours and experiences in Morocco</h1>
        <p className="lead">
          Reach travellers looking for desert trips, day tours, cooking classes, hikes and more. You stay in charge of your prices,
          dates and replies.
        </p>
        <ol className="join-steps">
          {STEPS.map(([title, text]) => (
            <li key={title}>
              <strong>{title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <h2 className="aside-title">What you can list</h2>
        <div className="join-groups">
          {groups.map((g) => (
            <div key={g.key}>
              <p className="menu-heading">{g.label}</p>
              <p className="card-meta">{g.categories.map((c) => c.name).join(' · ')}</p>
            </div>
          ))}
        </div>
        <p className="fine">Hotels, accommodation and restaurants are not listed on this site.</p>
      </div>

      <form className="form panel" onSubmit={submit}>
        <h2>Create a supplier account</h2>
        {USING_SAMPLE_DATA && <p className="notice info">Preview: this opens a demo dashboard; nothing is saved.</p>}
        <div className="field">
          <label htmlFor="sj-business">Business or supplier name</label>
          <input id="sj-business" name="business" className="input" required maxLength={120} placeholder="e.g. Atlas Trekking Imlil" />
        </div>
        <div className="field">
          <label htmlFor="sj-name">Your name</label>
          <input id="sj-name" name="name" className="input" required minLength={2} maxLength={80} autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="sj-email">Email</label>
          <input id="sj-email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="sj-password">Password</label>
          <input id="sj-password" name="password" type="password" className="input" required minLength={8} autoComplete="new-password" />
          <span className="fine">At least 8 characters.</span>
        </div>
        <label className="check">
          <input type="checkbox" name="terms" required /> I accept the{' '}
          <Link to="/terms-and-conditions" target="_blank">
            supplier terms
          </Link>{' '}
          and confirm I hold the licences my activities need.
        </label>
        <div className="hp" aria-hidden="true">
          <label htmlFor="sj-website">Website</label>
          <input id="sj-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        {status === 'error' && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-brand btn-block" disabled={status === 'sending'}>
          {status === 'sending' ? 'Creating your account…' : 'Create account'}
        </button>
        <p className="fine">
          Already have an account? <Link to="/supplier/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
