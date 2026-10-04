export function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${currency} ${Math.round(amount)}`
  }
}

export function formatMonth(yyyyMm: string) {
  if (!/^\d{4}-\d{2}$/.test(yyyyMm)) return ''
  const [y, m] = yyyyMm.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

const UNITS: Record<string, string> = {
  per_adult: 'per adult',
  per_person: 'per person',
  per_night: 'per night',
  per_group: 'per group',
}

export function unitLabel(unit: string | undefined) {
  return UNITS[unit ?? ''] ?? 'per person'
}
