import type { BookingStatus } from '../../types'

const LABELS: Record<BookingStatus, { label: string; tone: string }> = {
  requested: { label: 'Waiting for reply', tone: 'wait' },
  confirmed: { label: 'Confirmed', tone: 'ok' },
  declined: { label: 'Declined', tone: 'off' },
  cancelled: { label: 'Cancelled', tone: 'off' },
}

export default function StatusPill({ status }: { status: BookingStatus }) {
  const s = LABELS[status] ?? LABELS.requested
  return <span className={`status-pill ${s.tone}`}>{s.label}</span>
}
