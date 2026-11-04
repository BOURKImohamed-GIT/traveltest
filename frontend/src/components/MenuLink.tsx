import { Link } from 'react-router-dom'
import type { MenuItem } from '../types'

/** A menu entry: app link, external link, or plain text when it has no URL. */
export default function MenuLink({ entry, className }: { entry: MenuItem; className?: string }) {
  if (!entry.url) return <span className={className}>{entry.title}</span>
  if (entry.external)
    return (
      <a href={entry.url} className={className} target="_blank" rel="noopener noreferrer">
        {entry.title}
      </a>
    )
  return (
    <Link to={entry.url} className={className}>
      {entry.title}
    </Link>
  )
}
