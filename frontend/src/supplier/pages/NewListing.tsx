import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { categoryDef, listingSchema, listingTypeDef } from '../../listingSchema'
import { supplierApi } from '../api'

/** Step 1 of a new listing: category and the specific activity type. The wizard opens on the right form. */
export default function NewListing() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const cat = categoryDef(category)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    try {
      const l = await supplierApi.createListing(category, String(f.get('subtype') ?? ''), String(f.get('title') ?? '').trim())
      navigate(`/supplier/listings/${l.id}/2`, { replace: true })
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <>
      <h1 className="dash-title">Create a listing</h1>
      <p className="card-meta">Choose what you offer. The form then asks only what matters for that kind of experience.</p>
      <form onSubmit={submit} className="form">
        {listingSchema.menuGroups.map((g) => (
          <fieldset key={g.key} className="choice-group">
            <legend>{g.label}</legend>
            <div className="choice-grid">
              {listingSchema.categories
                .filter((c) => c.menuGroup === g.key)
                .map((c) => (
                  <label key={c.slug} className={`choice${category === c.slug ? ' active' : ''}`}>
                    <input type="radio" name="category" value={c.slug} checked={category === c.slug} onChange={() => setCategory(c.slug)} required />
                    <strong>{c.name}</strong>
                    <span className="fine">{c.useFor}</span>
                  </label>
                ))}
            </div>
          </fieldset>
        ))}

        {cat && (
          <div className="panel form">
            <h2>{cat.name}</h2>
            <p className="fine">
              Booking: {listingTypeDef(cat.listingType)?.booking}. Special to this category: {cat.specialFeature}
            </p>
            <div className="field">
              <label htmlFor="nl-subtype">Activity type</label>
              <select id="nl-subtype" name="subtype" className="input" required defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                {cat.subtypes.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="nl-title">Listing title</label>
              <input id="nl-title" name="title" className="input" maxLength={120} placeholder="e.g. Sunset quad ride in the Erg Chebbi dunes" />
              <span className="fine">You can change it later.</span>
            </div>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <div>
              <button type="submit" className="btn btn-brand" disabled={busy}>
                {busy ? 'Creating…' : 'Continue'}
              </button>
            </div>
          </div>
        )}
      </form>
    </>
  )
}
