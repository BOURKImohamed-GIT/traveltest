import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import TourCard from '../../components/TourCard'
import {
  categoryDef,
  fieldVisible,
  listingSchema,
  listingTypeDef,
  missingFields,
  sectionsFor,
  sectionStep,
  type FieldValues,
  type SchemaSection,
} from '../../listingSchema'
import { supplierApi } from '../api'
import FieldInput from '../FieldInput'
import { useSupplier } from '../sessionContext'
import { LISTING_STATUS, VERIFICATION, type Photo, type SupplierListing } from '../types'

interface Draft {
  title: string
  description: string
  category: string
  subtype: string
  values: FieldValues
  cover: Photo | null
  gallery: Photo[]
}

const STEPS = listingSchema.wizardSteps

/** Lists typed in a textarea keep blank lines while editing; drop them before saving and checking. */
function clean(values: FieldValues): FieldValues {
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]).map((x) => x.trim()).filter(Boolean) : v]),
  )
}

const toDraft = (l: SupplierListing): Draft => ({
  title: l.title,
  description: l.description,
  category: l.category,
  subtype: l.subtype,
  values: l.values,
  cover: l.cover,
  gallery: l.gallery,
})

/** The 7-step listing form. Each "Save" stores the draft in WordPress, so suppliers can stop and come back. */
export default function Wizard() {
  const { id = '', step: stepParam } = useParams()
  const navigate = useNavigate()
  const { user } = useSupplier()
  const [listing, setListing] = useState<SupplierListing>()
  const [draft, setDraft] = useState<Draft>()
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState<'' | 'save' | 'upload' | 'submit'>('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supplierApi.listing(Number(id)).then(
      (l) => {
        setListing(l)
        setDraft(toDraft(l))
      },
      (e: Error) => setError(e.message),
    )
  }, [id])

  const values = useMemo(() => clean(draft?.values ?? {}), [draft?.values])
  const missing = useMemo(
    () => (draft ? missingFields(draft.category, { title: draft.title, description: draft.description, values, hasCover: !!draft.cover }) : []),
    [draft, values],
  )

  if (!draft || !listing) return error ? <p className="notice error">{error}</p> : <p>Loading…</p>

  const step = Math.min(Math.max(Number(stepParam) || 1, 1), STEPS.length)
  const cat = categoryDef(draft.category)
  const sections = sectionsFor(draft.category).filter((s) => sectionStep(s) === step)
  const get = (k: string) => values[k]

  const patch = (p: Partial<Draft>) => {
    setDraft((d) => (d ? { ...d, ...p } : d))
    setDirty(true)
    setSaved(false)
  }
  const setValue = (key: string, v: unknown) => patch({ values: { ...draft.values, [key]: v } })

  async function save(): Promise<boolean> {
    if (!draft || !dirty) return true
    setBusy('save')
    setError('')
    try {
      const l = await supplierApi.saveListing(Number(id), {
        title: draft.title,
        description: draft.description,
        category: draft.category,
        subtype: draft.subtype,
        values,
        coverId: draft.cover?.id ?? null,
        galleryIds: draft.gallery.map((p) => p.id),
      })
      setListing(l)
      setDraft({ ...toDraft(l), values: draft.values })
      setDirty(false)
      setSaved(true)
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    } finally {
      setBusy('')
    }
  }

  async function go(to: number) {
    if (await save()) {
      navigate(`/supplier/listings/${id}/${to}`)
      window.scrollTo(0, 0)
    }
  }

  async function submit() {
    if (!(await save())) return
    setBusy('submit')
    try {
      const l = await supplierApi.listingAction(Number(id), 'submit')
      setListing(l)
      setDraft(toDraft(l))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy('')
    }
  }

  async function addPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length || !draft) return
    setBusy('upload')
    setError('')
    let { cover, gallery } = draft
    try {
      for (const f of files) {
        const p = await supplierApi.upload(f, 'photo')
        if (!cover) cover = p
        else gallery = [...gallery, p]
      }
    } catch (err) {
      setError((err as Error).message)
    }
    patch({ cover, gallery })
    setBusy('')
  }

  const makeCover = (p: Photo) => patch({ cover: p, gallery: [...(draft.cover ? [draft.cover] : []), ...draft.gallery.filter((g) => g.id !== p.id)] })
  const removePhoto = (p: Photo) =>
    draft.cover?.id === p.id ? patch({ cover: draft.gallery[0] ?? null, gallery: draft.gallery.slice(1) }) : patch({ gallery: draft.gallery.filter((g) => g.id !== p.id) })

  const stepMissing = (n: number) => missing.filter((m) => m.step === n).length
  const preview = { ...listing.preview, title: draft.title || 'Untitled listing', image: draft.cover?.url ?? null, excerpt: String(values.excerpt ?? '') }

  return (
    <div className="wizard">
      <div className="dash-head">
        <div>
          <Link to="/supplier/listings" className="fine">
            ← My listings
          </Link>
          <h1 className="dash-title">{draft.title || 'New listing'}</h1>
          <p className="card-meta">
            <span className={`status-pill status-${listing.status}`}>{LISTING_STATUS[listing.status]}</span> {cat?.name}
            {cat && ` · ${listingTypeDef(cat.listingType)?.label}`}
          </p>
        </div>
      </div>

      {listing.note && <p className="notice info">Changes requested by our team: {listing.note}</p>}
      {listing.status === 'publish' && listing.needsReview && (
        <p className="notice info">This listing is live. Saving changes sends it back for a quick review before they appear.</p>
      )}

      <ol className="stepper">
        {STEPS.map((label, i) => (
          <li key={label} className={i + 1 === step ? 'current' : ''}>
            <button type="button" onClick={() => go(i + 1)} disabled={!!busy}>
              <span className="step-num">{stepMissing(i + 1) ? i + 1 : '✓'}</span>
              <span className="step-label">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <section className="panel form">
        <h2>
          {step}. {STEPS[step - 1]}
        </h2>

        {step === 1 && (
          <>
            <div className="field">
              <label htmlFor="w-category">Category</label>
              <select id="w-category" className="input" value={draft.category} onChange={(e) => patch({ category: e.target.value, subtype: '' })}>
                {listingSchema.menuGroups.map((g) => (
                  <optgroup key={g.key} label={g.label}>
                    {listingSchema.categories
                      .filter((c) => c.menuGroup === g.key)
                      .map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              <span className="fine">Changing the category changes the specialized questions in step 3.</span>
            </div>
            <div className="field">
              <label htmlFor="w-subtype">Activity type</label>
              <select id="w-subtype" className="input" value={draft.subtype} onChange={(e) => patch({ subtype: e.target.value })}>
                <option value="">Choose…</option>
                {cat?.subtypes.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {cat && <p className="fine">How travellers book it: {listingTypeDef(cat.listingType)?.booking}.</p>}
          </>
        )}

        {step === 2 && (
          <>
            <div className="field">
              <label htmlFor="w-title">Title</label>
              <input id="w-title" className="input" maxLength={120} value={draft.title} onChange={(e) => patch({ title: e.target.value })} />
              <span className="fine">Say what and where, e.g. “Sunset camel ride in Agafay with dinner”.</span>
            </div>
            <div className="field">
              <label htmlFor="w-description">Overview</label>
              <textarea id="w-description" className="textarea" rows={8} value={draft.description} onChange={(e) => patch({ description: e.target.value })} />
              <span className="fine">
                What travellers will experience, in your own words. {draft.description.length < 80 && `At least 80 characters (${draft.description.length} so far).`}
              </span>
            </div>
          </>
        )}

        {step === 3 && cat && <p className="fine">Questions for {cat.name.toLowerCase()}. {cat.specialFeature}</p>}

        {sections.map((s) => (
          <Section key={s.title} section={s} values={draft.values} get={get} onChange={setValue} />
        ))}

        {step === 6 && (
          <>
            <div className="upload-grid">
              {[draft.cover, ...draft.gallery]
                .filter((p): p is Photo => !!p)
                .map((p) => (
                  <figure key={p.id} className={`photo-tile${p.id === draft.cover?.id ? ' cover' : ''}`}>
                    <img src={p.thumb || p.url} alt="" />
                    <figcaption>
                      {p.id === draft.cover?.id ? (
                        <strong>Cover photo</strong>
                      ) : (
                        <button type="button" className="link-button" onClick={() => makeCover(p)}>
                          Make cover
                        </button>
                      )}
                      <button type="button" className="link-button danger" onClick={() => removePhoto(p)}>
                        Remove
                      </button>
                    </figcaption>
                  </figure>
                ))}
              <div className="photo-tile photo-add">
                <label>
                  {busy === 'upload' ? 'Uploading…' : '+ Add photos'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} disabled={!!busy} />
                </label>
              </div>
            </div>
            <p className="fine">JPG, PNG or WebP, up to 8 MB each. Use your own photos: real places, real people, good light. The first is the cover.</p>
            <h3>Preview</h3>
            <div className="preview-card">
              <TourCard tour={preview} />
            </div>
          </>
        )}

        {step === 7 && (
          <>
            {missing.length ? (
              <div className="notice error">
                <p>Before submitting, please complete:</p>
                <ul>
                  {missing.map((m) => (
                    <li key={m.key}>
                      <button type="button" className="link-button" onClick={() => go(m.step)}>
                        {m.label}
                      </button>{' '}
                      (step {m.step})
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="notice success">Everything required is filled in.</p>
            )}
            {user && user.verification.status !== 'verified' && (
              <p className="notice info">
                Your account: {VERIFICATION[user.verification.status]}. You can submit now; our team also checks your{' '}
                <Link to="/supplier/account">business details and documents</Link>.
              </p>
            )}
            {listing.status === 'pending' ? (
              <p className="notice success">Submitted. We review new listings within 1–2 working days and email you when it's live.</p>
            ) : listing.status === 'publish' && !dirty ? (
              <p className="notice success">
                Live: <Link to={`/tour/${listing.slug}/`}>see your listing</Link>.
              </p>
            ) : (
              <div>
                <button type="button" className="btn btn-brand" disabled={!!busy || missing.length > 0} onClick={submit}>
                  {busy === 'submit' ? 'Submitting…' : listing.needsReview ? 'Submit for review' : 'Publish'}
                </button>
              </div>
            )}
          </>
        )}

        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}

        <div className="wizard-actions">
          {step > 1 && (
            <button type="button" className="btn btn-ghost" onClick={() => go(step - 1)} disabled={!!busy}>
              Back
            </button>
          )}
          <span className="fine" aria-live="polite">
            {busy === 'save' ? 'Saving…' : dirty ? 'Unsaved changes' : saved ? 'Saved' : ''}
          </span>
          <button type="button" className="btn btn-outline" onClick={save} disabled={!!busy || !dirty}>
            Save draft
          </button>
          {step < STEPS.length && (
            <button type="button" className="btn btn-brand" onClick={() => go(step + 1)} disabled={!!busy}>
              Save and continue
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

function Section({
  section,
  values,
  get,
  onChange,
}: {
  section: SchemaSection
  values: FieldValues
  get: (k: string) => unknown
  onChange: (key: string, v: unknown) => void
}) {
  const fields = section.fields.filter((f) => fieldVisible(f, get))
  if (!fields.length) return null
  return (
    <fieldset className="wizard-section">
      <legend>{section.title}</legend>
      {section.help && <p className="fine">{section.help}</p>}
      {fields.map((f) => (
        <FieldInput key={f.key} field={f} value={values[f.key]} onChange={(v) => onChange(f.key, v)} />
      ))}
    </fieldset>
  )
}
