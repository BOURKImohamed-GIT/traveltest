import { useEffect, useMemo, useRef, useState } from 'react'

const TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 8 * 1024 * 1024

/** Choose up to `max` photos (JPG, PNG, WebP, 8 MB each) with previews and remove buttons. */
export default function PhotoPicker({
  files,
  onChange,
  max,
  label = 'Add photos',
  compact = false,
}: {
  files: File[]
  onChange: (files: File[]) => void
  max: number
  label?: string
  compact?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  function add(list: FileList | null) {
    setError('')
    const picked = Array.from(list ?? [])
    const bad = picked.find((f) => !TYPES.includes(f.type))
    const big = picked.find((f) => f.size > MAX_BYTES)
    if (bad) setError('Photos must be JPG, PNG or WebP images.')
    else if (big) setError('Photos can be up to 8 MB each.')
    const ok = picked.filter((f) => TYPES.includes(f.type) && f.size <= MAX_BYTES)
    const next = [...files, ...ok]
    if (next.length > max) setError(`You can add up to ${max} photos.`)
    onChange(next.slice(0, max))
    if (input.current) input.current.value = ''
  }

  return (
    <div className={`photo-picker${compact ? ' compact' : ''}`}>
      {files.length > 0 && (
        <ul className="photo-picker-list">
          {previews.map((src, i) => (
            <li key={src}>
              <img src={src} alt={`Photo ${i + 1}`} />
              <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => onChange(files.filter((_, j) => j !== i))}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {files.length < max && (
        <label className="btn btn-outline photo-picker-add">
          {label} {!compact && <span className="fine">({files.length}/{max})</span>}
          <input ref={input} type="file" accept={TYPES.join(',')} multiple hidden onChange={(e) => add(e.target.files)} />
        </label>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
