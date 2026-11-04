import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BASE_PATH, SITE_NAME } from '../config'

/** The supplier's own page on the platform (/provider/<slug>) with their live listings: view or copy the link. */
export default function PageLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  const path = `/provider/${slug}`
  const url = `${window.location.origin}${BASE_PATH === '/' ? '' : BASE_PATH}${path}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy your page link:', url)
    }
  }

  return (
    <div className="page-link">
      <div className="page-link-text">
        <strong>Your page on {SITE_NAME}</strong>
        <span className="fine">Your business profile and all your live listings. Share it with your customers.</span>
        <code>{url}</code>
      </div>
      <div className="page-link-actions">
        <button type="button" className="btn btn-outline" onClick={copy}>
          {copied ? 'Copied ✓' : 'Copy link'}
        </button>
        <Link to={path} className="btn btn-brand" target="_blank">
          View page
        </Link>
      </div>
    </div>
  )
}
