import { useState } from 'react'

interface Props {
  src: string | null | undefined
  alt: string
  fallbackText?: string
  loading?: 'lazy' | 'eager'
}

/** Image that degrades to a branded gradient tile when missing or broken. */
export default function Img({ src, alt, fallbackText, loading = 'lazy' }: Props) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    let h = 0
    for (const c of src || alt + (fallbackText ?? '')) h = (h * 31 + c.charCodeAt(0)) % 360
    return (
      <div className="img-fallback" role="img" aria-label={alt} style={{ ['--h' as string]: h }}>
        {fallbackText}
      </div>
    )
  }
  return <img src={src} alt={alt} loading={loading} onError={() => setFailed(true)} />
}
