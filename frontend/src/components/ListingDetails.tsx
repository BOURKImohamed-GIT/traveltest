import { detailGroups } from '../listingDetails'
import { displayValue, type SchemaField } from '../listingSchema'
import type { Tour } from '../types'

function Value({ field, value }: { field: SchemaField; value: unknown }) {
  if (field.type === 'rows' && Array.isArray(value)) {
    const cols = field.columns ?? []
    return (
      <table className="mini-table">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(value as Record<string, string>[]).map((r, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c.key}>{r[c.key] ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
  if (field.type === 'list' && Array.isArray(value)) {
    return (
      <ul className="dot-list">
        {(value as string[]).map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    )
  }
  if (field.type === 'textarea') return <p className="pre-line">{String(value)}</p>
  return <>{displayValue(field, value)}</>
}

/** The "Details" section of a tour page (see detailGroups). */
export default function ListingDetails({ tour }: { tour: Tour }) {
  const values = tour.fields ?? {}
  const groups = detailGroups(tour)
  if (!groups.length) return null
  return (
    <section className="detail-section" id="details" aria-labelledby="dt-h">
      <h2 id="dt-h">Details</h2>
      <div className="details-groups">
        {groups.map((g) => (
          <div key={g.title} className="details-group">
            <h3>{g.title}</h3>
            <dl>
              {g.fields.map((f) => (
                <div key={f.key} className={f.type === 'rows' || f.type === 'textarea' || f.type === 'list' ? 'wide' : ''}>
                  <dt>{f.label}</dt>
                  <dd>
                    <Value field={f} value={values[f.key]} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  )
}
