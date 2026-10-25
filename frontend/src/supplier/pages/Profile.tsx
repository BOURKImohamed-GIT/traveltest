import { useState, type ChangeEvent, type FormEvent } from 'react'
import { listingSchema } from '../../listingSchema'
import { supplierApi } from '../api'
import { useSupplier } from '../sessionContext'
import { BUSINESS_TYPES, type SupplierProfile } from '../types'

type Key = keyof SupplierProfile

const LANGUAGES = listingSchema.common.flatMap((s) => s.fields).find((f) => f.key === 'languages')?.options?.map((o) => o.label) ?? []

/** Business profile: public details, contact, legal and operations. Feeds the onboarding checklist. */
export default function Profile() {
  const { user, setUser } = useSupplier()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  if (!user) return null
  const p = user.profile

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const profile: Partial<SupplierProfile> = {}
    for (const k of Object.keys(p) as Key[]) {
      if (k === 'notify_email') profile.notify_email = f.get(k) === 'on'
      else if (k === 'languages') profile.languages = f.getAll('languages').join(', ')
      else if (f.has(k)) (profile as Record<string, string>)[k] = String(f.get(k) ?? '').trim()
    }
    setBusy(true)
    setMsg(null)
    try {
      setUser(await supplierApi.saveProfile(profile, f.get('terms') === 'on'))
      setMsg({ ok: true, text: 'Saved.' })
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  async function uploadLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await supplierApi.upload(file, 'logo')
      setUser(await supplierApi.me())
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message })
    }
  }

  const text = (k: Key, label: string, opts: { required?: boolean; placeholder?: string; type?: string; help?: string } = {}) => (
    <div className="field">
      <label htmlFor={`p-${k}`}>{label}</label>
      <input id={`p-${k}`} name={k} type={opts.type ?? 'text'} className="input" defaultValue={String(p[k] ?? '')} required={opts.required} placeholder={opts.placeholder} />
      {opts.help && <span className="fine">{opts.help}</span>}
    </div>
  )
  const area = (k: Key, label: string, help?: string, rows = 3) => (
    <div className="field">
      <label htmlFor={`p-${k}`}>{label}</label>
      <textarea id={`p-${k}`} name={k} className="textarea" rows={rows} defaultValue={String(p[k] ?? '')} />
      {help && <span className="fine">{help}</span>}
    </div>
  )
  const spoken = p.languages.split(',').map((s) => s.trim())

  return (
    <>
      <h1 className="dash-title">Business profile</h1>
      <form className="form" onSubmit={submit}>
        <section className="panel form">
          <h2>Public profile</h2>
          <p className="fine">Shown to travellers on your listings and your supplier page.</p>
          <div className="logo-field">
            {user.logo ? <img src={user.logo} alt="Your logo" /> : <span className="dash-initial">{user.name.charAt(0)}</span>}
            <label className="btn btn-outline">
              {user.logo ? 'Change logo' : 'Upload logo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadLogo} hidden />
            </label>
          </div>
          {text('business_name', 'Business or supplier name', { required: true })}
          <div className="field">
            <label htmlFor="p-business_type">Business type</label>
            <select id="p-business_type" name="business_type" className="input" defaultValue={p.business_type}>
              <option value="">Choose…</option>
              {Object.entries(BUSINESS_TYPES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          {area('bio', 'About your business', 'Your story, experience and what makes your tours special.', 5)}
          {text('website', 'Website (optional)', { type: 'url', placeholder: 'https://' })}
          <fieldset className="field">
            <legend className="label">Languages you offer</legend>
            <div className="check-pills">
              {LANGUAGES.map((l) => (
                <label key={l} className="check-pill">
                  <input type="checkbox" name="languages" value={l} defaultChecked={spoken.includes(l)} /> {l}
                </label>
              ))}
            </div>
          </fieldset>
          {area('operating_locations', 'Where you operate', 'Cities and regions, one per line (e.g. Marrakech, Agafay, Merzouga).')}
          {text('service_coverage', 'Service coverage', { placeholder: 'e.g. Pickups from Marrakech hotels and riads; whole of southern Morocco' })}
        </section>

        <section className="panel form">
          <h2>Contact</h2>
          <div className="form-row">
            {text('contact_name', 'Contact person')}
            {text('phone', 'Phone', { type: 'tel' })}
          </div>
          {text('whatsapp', 'WhatsApp (optional)', { type: 'tel', help: 'International format, e.g. +212 600 000 000.' })}
          {area('address', 'Business address')}
          <label className="check">
            <input type="checkbox" name="notify_email" defaultChecked={p.notify_email} /> Email me about new booking requests ({user.email})
          </label>
        </section>

        <section className="panel form">
          <h2>Legal and operations</h2>
          <p className="fine">Private: used by our team to verify your business.</p>
          <div className="form-row">
            {text('legal_name', 'Legal business name')}
            {text('registration_number', 'Registration number', { help: 'RC, ICE or licence number.' })}
          </div>
          {area('permits', 'Permits, licences and insurance', 'Tourism licence, guide licence, vehicle permits, insurance. You can also upload documents in Account & verification.')}
          {area('team', 'Team (optional)', 'Guides, drivers, instructors and their qualifications.')}
          {area('payout', 'Payout details (optional)', 'Only needed once online payment is switched on.')}
        </section>

        {!user.termsAccepted && (
          <label className="check">
            <input type="checkbox" name="terms" /> I accept the supplier terms.
          </label>
        )}
        {msg && (
          <p className={`notice ${msg.ok ? 'success' : 'error'}`} role="status">
            {msg.text}
          </p>
        )}
        <div>
          <button type="submit" className="btn btn-brand" disabled={busy}>
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </>
  )
}
