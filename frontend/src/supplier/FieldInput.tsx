import type { SchemaField } from '../listingSchema'
import type { ItineraryStop } from '../types'

type Row = Record<string, string>

interface Props {
  field: SchemaField
  value: unknown
  onChange: (v: unknown) => void
}

/** One schema field as a form control (wizard). */
export default function FieldInput({ field, value, onChange }: Props) {
  const id = `f-${field.key}`
  const label = (
    <label htmlFor={id}>
      {field.label}
      {!field.required && <span className="optional"> (optional)</span>}
    </label>
  )
  const help = field.help ? <span className="fine">{field.help}</span> : null

  switch (field.type) {
    case 'textarea':
      return (
        <div className="field">
          {label}
          <textarea id={id} className="textarea" rows={4} value={String(value ?? '')} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
          {help}
        </div>
      )
    case 'number':
      return (
        <div className="field">
          {label}
          <input
            id={id}
            type="number"
            min={0}
            step="any"
            className="input input-short"
            value={value == null ? '' : String(value)}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          />
          {help}
        </div>
      )
    case 'select':
      return (
        <div className="field">
          {label}
          <select id={id} className="input" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
            <option value="">Choose…</option>
            {field.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {help}
        </div>
      )
    case 'multiselect': {
      const chosen = Array.isArray(value) ? (value as string[]) : []
      return (
        <fieldset className="field">
          <legend className="label">
            {field.label}
            {!field.required && <span className="optional"> (optional)</span>}
          </legend>
          <div className="check-pills">
            {field.options?.map((o) => (
              <label key={o.value} className={`check-pill${chosen.includes(o.value) ? ' on' : ''}`}>
                <input
                  type="checkbox"
                  checked={chosen.includes(o.value)}
                  onChange={(e) => onChange(e.target.checked ? [...chosen, o.value] : chosen.filter((c) => c !== o.value))}
                />
                {o.label}
              </label>
            ))}
          </div>
          {help}
        </fieldset>
      )
    }
    case 'boolean':
      return (
        <div className="field">
          <label className="check">
            <input id={id} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {field.label}
          </label>
          {help}
        </div>
      )
    case 'list':
      return (
        <div className="field">
          {label}
          <textarea
            id={id}
            className="textarea"
            rows={4}
            value={Array.isArray(value) ? value.join('\n') : String(value ?? '')}
            placeholder={field.placeholder ?? 'One per line'}
            // Kept as typed (blank lines included) until saved, so typing a new line works.
            onChange={(e) => onChange(e.target.value.split('\n'))}
          />
          <span className="fine">{field.help ?? 'One per line.'}</span>
        </div>
      )
    case 'rows':
      return <RowsInput field={field} value={Array.isArray(value) ? (value as Row[]) : []} onChange={onChange} />
    case 'itinerary':
      return <ItineraryInput value={Array.isArray(value) ? (value as ItineraryStop[]) : []} onChange={onChange} />
    default:
      return (
        <div className="field">
          {label}
          <input id={id} className="input" value={String(value ?? '')} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
          {help}
        </div>
      )
  }
}

/** A small table: packages, ticket types, routes, stops… */
function RowsInput({ field, value, onChange }: { field: SchemaField; value: Row[]; onChange: (v: Row[]) => void }) {
  const cols = field.columns ?? []
  const rows = value.length ? value : []
  const set = (i: number, key: string, v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)))
  return (
    <fieldset className="field rows-input">
      <legend className="label">
        {field.label}
        {!field.required && <span className="optional"> (optional)</span>}
      </legend>
      {field.help && <span className="fine">{field.help}</span>}
      {rows.map((r, i) => (
        <div className="rows-line" key={i}>
          {cols.map((c) => (
            <input
              key={c.key}
              className="input"
              aria-label={`${c.label} ${i + 1}`}
              placeholder={c.label}
              type={c.type === 'number' ? 'number' : 'text'}
              value={String(r[c.key] ?? '')}
              onChange={(e) => set(i, c.key, e.target.value)}
            />
          ))}
          <button type="button" className="btn btn-ghost" aria-label={`Remove row ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      <div>
        <button type="button" className="btn btn-outline" onClick={() => onChange([...rows, {}])}>
          Add {cols[0]?.label.toLowerCase() ?? 'row'}
        </button>
      </div>
    </fieldset>
  )
}

/** Day-by-day programme. Blank lines in the details start a new paragraph. */
function ItineraryInput({ value, onChange }: { value: ItineraryStop[]; onChange: (v: ItineraryStop[]) => void }) {
  const set = (i: number, patch: Partial<ItineraryStop>) => onChange(value.map((d, j) => (j === i ? { ...d, ...patch } : d)))
  const move = (i: number, by: number) => {
    const next = [...value]
    ;[next[i], next[i + by]] = [next[i + by], next[i]]
    onChange(next)
  }
  return (
    <fieldset className="field itinerary-input">
      <legend className="label">Itinerary, day by day</legend>
      {value.map((d, i) => (
        <div className="panel day-block" key={i}>
          <div className="day-head">
            <strong>Day {i + 1}</strong>
            <span>
              <button type="button" className="btn btn-ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move day ${i + 1} up`}>
                ↑
              </button>
              <button type="button" className="btn btn-ghost" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label={`Move day ${i + 1} down`}>
                ↓
              </button>
              <button type="button" className="btn btn-ghost danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                Remove
              </button>
            </span>
          </div>
          <input className="input" aria-label={`Day ${i + 1} title`} placeholder="Title, e.g. Marrakech – Ait Benhaddou – Dades Valley" value={d.title} onChange={(e) => set(i, { title: e.target.value })} />
          <textarea
            className="textarea"
            rows={5}
            aria-label={`Day ${i + 1} details`}
            placeholder="What happens this day: visits, meals, where you sleep…"
            value={d.details.replace(/<\/p>\s*<p>/g, '\n\n').replace(/<\/?p>/g, '')}
            onChange={(e) => set(i, { details: e.target.value })}
          />
          <input className="input" aria-label={`Day ${i + 1} driving`} placeholder="Driving distance / time (optional), e.g. 320 km / 6 h" value={d.distance ?? ''} onChange={(e) => set(i, { distance: e.target.value })} />
        </div>
      ))}
      <div>
        <button type="button" className="btn btn-outline" onClick={() => onChange([...value, { title: '', details: '', distance: '' }])}>
          Add day {value.length + 1}
        </button>
      </div>
    </fieldset>
  )
}
