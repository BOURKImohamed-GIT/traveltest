import type { ReactNode } from 'react'
import type { SocialLink } from '../types'
import { GlobeIcon } from './Icons'

/** Simple outline marks in the same style as the other icons. */
const MARKS: Record<string, ReactNode> = {
  facebook: <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8Z" />,
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </>
  ),
  tiktok: <path d="M14 3v12a4 4 0 1 1-4-4M14 3c.5 3 2.5 5 5.5 5" />,
  youtube: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="m10 9 5 3-5 3V9Z" />
    </>
  ),
  x: <path d="M4 4h4l12 16h-4L4 4ZM20 4l-6.5 7M4 20l6.5-7" />,
  tripadvisor: (
    <>
      <circle cx="7" cy="13" r="4" />
      <circle cx="17" cy="13" r="4" />
      <circle cx="7" cy="13" r="1" />
      <circle cx="17" cy="13" r="1" />
      <path d="M3 9c2.5-2 5.5-3 9-3s6.5 1 9 3M12 17l-1.5-2M12 17l1.5-2" />
    </>
  ),
  google: <path d="M20 12a8 8 0 1 1-2.3-5.7M20 12h-8" />,
  getyourguide: (
    <>
      <path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V7Z" />
      <path d="M10 7v12" strokeDasharray="2 2" />
    </>
  ),
  viator: <path d="m4 5 8 15 8-15" />,
  pinterest: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M11 8h2.5a2.5 2.5 0 0 1 0 5H11m0-5v13" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 10v7M8 7h.01M12 17v-7m0 3a3 3 0 0 1 6 0v4" />
    </>
  ),
  threads: <path d="M16 11c0-3-2-4-4-4s-4 1.5-4 5 2 5 4.5 5 3.5-1.5 3.5-3-1-2.5-3-2.5-3 1-3 2 1 1.5 2 1.5" />,
}

function SocialIcon({ network }: { network: string }) {
  const mark = MARKS[network]
  if (!mark) return <GlobeIcon size={20} />
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {mark}
    </svg>
  )
}

/** Round icon links to the agency's social and review pages. */
export default function SocialLinks({ links, className = '' }: { links: SocialLink[]; className?: string }) {
  if (!links.length) return null
  return (
    <ul className={`social-links ${className}`}>
      {links.map((l) => (
        <li key={l.url}>
          <a href={l.url} target="_blank" rel="noopener noreferrer" aria-label={l.label} title={l.label}>
            <SocialIcon network={l.network} />
          </a>
        </li>
      ))}
    </ul>
  )
}
