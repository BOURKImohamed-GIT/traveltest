import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useCategories } from '../categories'
import Img from '../components/Img'
import type { ListingInput, OwnedListing, PriceUnit, UploadedImage } from '../types'
import { useAsync } from '../useAsync'

type Group = 'stays' | 'tours' | 'activities' | 'restaurants'

/** Which fields a listing type needs, by its top-level group. */
function groupOf(parent: string | null | undefined, slug: string): Group {
  const top = parent ?? slug
  if (top === 'stays') return 'stays'
  if (top === 'restaurants') return 'restaurants'
  if (top === 'activities') return 'activities'
  return 'tours'
}

const DEFAULT_UNIT: Record<Group, PriceUnit> = {
  stays: 'per_night',
  tours: 'per_adult',
  activities: 'per_person',
  restaurants: 'per_person',
}

const lines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

/** Shrink big phone photos before upload. */
async function resize(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / bmp.width)
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * scale)
    c.height = Math.round(bmp.height * scale)
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    return (await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.85))) ?? file
  } catch {
    return file
  }
}

function Photos({ images, setImages }: { images: UploadedImage[]; setImages: (f: (prev: UploadedImage[]) => UploadedImage[]) => void }) {
  const [busy, setBusy] = useState(0)
  const [error, setError] = useState('')

  async function add(files: FileList | null) {
    if (!files) return
    setError('')
    for (const file of Array.from(files).slice(0, 10 - images.length)) {
      setBusy((n) => n + 1)
      try {
        const blob = await resize(file)
        const img = await api.uploadImage(blob, file.name.replace(/\.\w+$/, '') + '.jpg')
        setImages((prev) => [...prev, img])
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setBusy((n) => n - 1)
      }
    }
  }

  return (
    <div className="field">
      <span className="label">Photos (up to 10). The first one is the main photo.</span>
      <ul className="photo-grid">
        {images.map((img, i) => (
          <li key={img.id}>
            <Img src={img.url} alt={`Photo ${i + 1}`} />
            <div className="photo-tools">
              {i > 0 && (
                <button type="button" onClick={() => setImages((p) => [img, ...p.filter((x) => x.id !== img.id)])}>
                  Make main
                </button>
              )}
              <button type="button" onClick={() => setImages((p) => p.filter((x) => x.id !== img.id))}>
                Remove
              </button>
            </div>
            {i === 0 && <span className="badge">Main photo</span>}
          </li>
        ))}
        {images.length < 10 && (
          <li className="photo-add">
            <label htmlFor="photo-input">{busy ? `Uploading ${busy}…` : '+ Add photos'}</label>
            <input id="photo-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => add(e.target.files)} />
          </li>
        )}
      </ul>
      {error && <p className="notice error">{error}</p>}
    </div>
  )
}

function Form({ existing }: { existing?: OwnedListing }) {
  const navigate = useNavigate()
  const { tree } = useCategories()
  const destinations = useAsync(() => api.destinations(), [])
  const raw = existing?.raw
  const [category, setCategory] = useState(raw?.category ?? '')
  const [images, setImages] = useState<UploadedImage[]>(raw?.images ?? [])
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [error, setError] = useState('')

  const cat = category ? tree?.bySlug[category] : undefined
  const group = cat ? groupOf(cat.parent, cat.slug) : 'tours'
  const [unit, setUnit] = useState<PriceUnit | ''>(raw?.priceUnit ?? '')

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const s = (k: string) => String(f.get(k) ?? '').trim()
    const input: ListingInput = {
      title: s('title'),
      category,
      destination: s('destination'),
      price: Number(s('price')) || 0,
      currency: s('currency') || 'EUR',
      priceUnit: (unit || DEFAULT_UNIT[group]) as PriceUnit,
      duration: s('duration'),
      location: s('location'),
      excerpt: s('excerpt'),
      description: s('description'),
      highlights: lines(s('highlights')),
      included: lines(s('included')),
      notIncluded: lines(s('notIncluded')),
      amenities: lines(s('amenities')),
      itinerary: lines(s('itinerary')).map((l) => {
        const [title, ...rest] = l.split('|')
        return { title: title.trim(), details: rest.join('|').trim() }
      }),
      meetingPoint: s('meetingPoint'),
      languages: s('languages'),
      groupSize: Number(s('groupSize')) || 0,
      freeCancel: f.get('freeCancel') === 'on',
      imageIds: images.map((i) => i.id),
    }
    setStatus('saving')
    setError('')
    try {
      if (existing) await api.updateListing(existing.id, input)
      else await api.createListing(input)
      navigate('/host', { replace: true })
    } catch (err) {
      setError((err as Error).message)
      setStatus('error')
    }
  }

  const show = {
    duration: group !== 'restaurants' && group !== 'stays',
    itinerary: group === 'tours',
    included: group === 'tours' || group === 'activities',
    meeting: group === 'tours' || group === 'activities',
    amenities: group === 'stays' || group === 'restaurants',
    groupSize: group !== 'restaurants',
  }

  return (
    <form className="form listing-form" onSubmit={submit}>
      <fieldset>
        <legend>What are you listing?</legend>
        <div className="field">
          <label htmlFor="lf-category">Type</label>
          <select id="lf-category" className="select" required value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="" disabled>
              Choose a type…
            </option>
            {tree?.all
              .filter((c) => !c.parent)
              .map((top) => {
                const kids = tree.all.filter((c) => c.parent === top.slug)
                return kids.length ? (
                  <optgroup key={top.slug} label={top.name}>
                    {kids.map((k) => (
                      <option key={k.slug} value={k.slug}>
                        {k.name}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={top.slug} value={top.slug}>
                    {top.name}
                  </option>
                )
              })}
          </select>
        </div>
        <div className="field">
          <label htmlFor="lf-title">Name</label>
          <input id="lf-title" name="title" className="input" required minLength={5} maxLength={120} defaultValue={raw?.title} placeholder={group === 'stays' ? 'e.g. Riad Dar Zitoun' : 'e.g. 3-Day Merzouga Desert Tour'} />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="lf-destination">City / region</label>
            <select id="lf-destination" name="destination" className="select" defaultValue={raw?.destination ?? ''}>
              <option value="">Other</option>
              {destinations.data?.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="lf-location">Address or area</label>
            <input id="lf-location" name="location" className="input" required minLength={2} maxLength={120} defaultValue={raw?.location} placeholder="e.g. Medina, near Bab Doukkala" />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Price</legend>
        <div className="form-row three">
          <div className="field">
            <label htmlFor="lf-price">{group === 'restaurants' ? 'Average price' : 'Price from'}</label>
            <input id="lf-price" name="price" type="number" min={0} step="0.01" className="input" required defaultValue={raw?.price} />
          </div>
          <div className="field">
            <label htmlFor="lf-currency">Currency</label>
            <select id="lf-currency" name="currency" className="select" defaultValue={raw?.currency ?? 'EUR'}>
              <option>EUR</option>
              <option>MAD</option>
              <option>USD</option>
              <option>GBP</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="lf-unit">Price is</label>
            <select id="lf-unit" className="select" value={unit || DEFAULT_UNIT[group]} onChange={(e) => setUnit(e.target.value as PriceUnit)}>
              <option value="per_person">per person</option>
              <option value="per_adult">per adult</option>
              <option value="per_night">per night</option>
              <option value="per_group">per group</option>
            </select>
          </div>
        </div>
        <label className="check">
          <input type="checkbox" name="freeCancel" defaultChecked={raw?.freeCancel} /> Free cancellation up to 24 hours before
        </label>
      </fieldset>

      <fieldset>
        <legend>Description</legend>
        <div className="field">
          <label htmlFor="lf-excerpt">Short summary (shown on cards)</label>
          <textarea id="lf-excerpt" name="excerpt" className="textarea" rows={2} required minLength={20} maxLength={300} defaultValue={raw?.excerpt} />
        </div>
        <div className="field">
          <label htmlFor="lf-description">Full description</label>
          <textarea id="lf-description" name="description" className="textarea" rows={7} required minLength={50} maxLength={8000} defaultValue={raw?.description} />
        </div>
        <div className="field">
          <label htmlFor="lf-highlights">Highlights (one per line)</label>
          <textarea id="lf-highlights" name="highlights" className="textarea" rows={4} defaultValue={raw?.highlights.join('\n')} />
        </div>
        {show.amenities && (
          <div className="field">
            <label htmlFor="lf-amenities">{group === 'stays' ? 'Amenities' : 'Features'} (one per line)</label>
            <textarea id="lf-amenities" name="amenities" className="textarea" rows={4} defaultValue={raw?.amenities.join('\n')} placeholder={group === 'stays' ? 'Breakfast included\nRoof terrace\nFree Wi-Fi' : 'Rooftop seating\nVegetarian options\nAlcohol-free'} />
          </div>
        )}
      </fieldset>

      {(show.duration || show.itinerary || show.included || show.meeting) && (
        <fieldset>
          <legend>Details</legend>
          <div className="form-row three">
            {show.duration && (
              <div className="field">
                <label htmlFor="lf-duration">Duration</label>
                <input id="lf-duration" name="duration" className="input" defaultValue={raw?.duration} placeholder="e.g. 3 days, 4 hours" />
              </div>
            )}
            {show.groupSize && (
              <div className="field">
                <label htmlFor="lf-group">Max group size</label>
                <input id="lf-group" name="groupSize" type="number" min={0} className="input" defaultValue={raw?.groupSize || ''} />
              </div>
            )}
            <div className="field">
              <label htmlFor="lf-languages">Languages</label>
              <input id="lf-languages" name="languages" className="input" defaultValue={raw?.languages} placeholder="English, French, Arabic" />
            </div>
          </div>
          {show.meeting && (
            <div className="field">
              <label htmlFor="lf-meeting">Meeting point / pickup</label>
              <input id="lf-meeting" name="meetingPoint" className="input" defaultValue={raw?.meetingPoint} />
            </div>
          )}
          {show.itinerary && (
            <div className="field">
              <label htmlFor="lf-itinerary">Itinerary (one stop per line: Title | details)</label>
              <textarea
                id="lf-itinerary"
                name="itinerary"
                className="textarea"
                rows={5}
                defaultValue={raw?.itinerary.map((s) => (s.details ? `${s.title} | ${s.details}` : s.title)).join('\n')}
                placeholder={'Day 1: Marrakech to Dades | Cross the High Atlas...\nDay 2: Merzouga | Camel trek at sunset...'}
              />
            </div>
          )}
          {show.included && (
            <div className="form-row">
              <div className="field">
                <label htmlFor="lf-included">Included (one per line)</label>
                <textarea id="lf-included" name="included" className="textarea" rows={4} defaultValue={raw?.included.join('\n')} />
              </div>
              <div className="field">
                <label htmlFor="lf-not-included">Not included (one per line)</label>
                <textarea id="lf-not-included" name="notIncluded" className="textarea" rows={4} defaultValue={raw?.notIncluded.join('\n')} />
              </div>
            </div>
          )}
        </fieldset>
      )}
      {!show.duration && !show.itinerary && (
        <input type="hidden" name="languages" defaultValue={raw?.languages} />
      )}

      <fieldset>
        <legend>Photos</legend>
        <Photos images={images} setImages={setImages} />
      </fieldset>

      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="submit" className="btn btn-brand" disabled={status === 'saving' || !category}>
          {status === 'saving' ? 'Saving…' : existing ? 'Save and send for review' : 'Submit for review'}
        </button>
        <Link to="/host" className="btn btn-ghost">
          Cancel
        </Link>
      </div>
      <p className="fine">Our team reviews every new or edited listing before it appears on the site, usually within 24 hours.</p>
    </form>
  )
}

export default function ListingForm() {
  const { id } = useParams()
  const existing = useAsync(() => (id ? api.myListing(Number(id)) : Promise.resolve(undefined)), [id])

  return (
    <div className="container narrow">
      <div className="page-title">
        <h1>{id ? 'Edit listing' : 'Add a listing'}</h1>
        <p>
          <Link to="/host">Back to your listings</Link>
        </p>
      </div>
      {existing.error && <p className="notice error">{existing.error.message}</p>}
      {existing.loading ? <p className="card-meta">Loading…</p> : !existing.error && <Form existing={existing.data} key={id ?? 'new'} />}
    </div>
  )
}
