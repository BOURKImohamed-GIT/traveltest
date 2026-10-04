import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
)
export const HeartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 20s-7-4.4-9.2-8.6C1.3 8.4 3 5 6.3 5c2 0 3.3 1.1 4 2.3h3.4C14.4 6.1 15.7 5 17.7 5 21 5 22.7 8.4 21.2 11.4 19 15.6 12 20 12 20Z" />
  </Icon>
)
export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
    <circle cx="12" cy="9" r="2.5" />
  </Icon>
)
export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
)
export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12 5 5 9-10" />
  </Icon>
)
export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
)
export const MountainIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m3 20 6-11 4 7 2-3 6 7H3Z" />
  </Icon>
)
export const BoatIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 17h18l-2 4H5l-2-4ZM12 3v12M12 4l6 9h-6" />
  </Icon>
)
export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Icon>
)
export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M16 4.5a3.5 3.5 0 0 1 0 7M22 20c0-3-2-5-5-5.7" />
  </Icon>
)
export const LanguageIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 5h9M8.5 3v2M6 5c1 4 4 7 7 8M11 5c-1 4-4 7-7 8M13 21l4-9 4 9M14.5 18h5" />
  </Icon>
)
export const SparkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16Z" />
  </Icon>
)
export const PhoneIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </Icon>
)
export const MailIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Icon>
)
export const BedIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 18V6M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6M7 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
  </Icon>
)
export const TentIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 20 12 4l9 16H3ZM12 4v16M9 20l3-5 3 5" />
  </Icon>
)
export const ForkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1-3 4-3 7h3" />
  </Icon>
)
export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
)
export const ChevronIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
)
export const XIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)
export const GlobeIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
  </Icon>
)
export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
)
export const ChatIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
  </Icon>
)

export function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="var(--brand)" />
      <path d="M9 21c3-7 11-7 14 0" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="12" r="3" fill="#fff" />
    </svg>
  )
}

export function CategoryIcon({ slug, size = 22 }: { slug?: string; size?: number }) {
  switch (slug) {
    case 'day-trips':
      return <SunIcon size={size} />
    case 'stays':
    case 'hotels':
    case 'riads':
    case 'auberges':
      return <BedIcon size={size} />
    case 'bivouacs':
      return <TentIcon size={size} />
    case 'restaurants':
      return <ForkIcon size={size} />
    case 'activities':
    case 'outdoor-adventure':
    case 'food-and-culture':
    case 'hammam-and-wellness':
    case 'desert-activities':
      return <SparkIcon size={size} />
    case 'tour-packages':
    case 'morocco-itineraries':
      return <CalendarIcon size={size} />
    case 'marrakech-desert-tours':
    case 'fes-desert-tours':
    case 'errachidia-desert-tours':
      return <MountainIcon size={size} />
    case 'tangier-tours':
      return <BoatIcon size={size} />
    case 'casablanca-tours':
    case 'ouarzazate-tours':
      return <PinIcon size={size} />
    default:
      return <GlobeIcon size={size} />
  }
}
