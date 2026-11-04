interface Props {
  value: number
  count?: number
  size?: 'sm' | 'lg'
  showValue?: boolean
}

/** Five rating circles with half steps, e.g. 4.5 → ●●●●◐ */
export default function Rating({ value, count, size = 'sm', showValue = false }: Props) {
  const rounded = Math.round(value * 2) / 2
  const label = count != null ? `${value.toFixed(1)} of 5 from ${count} review${count === 1 ? '' : 's'}` : `${value} of 5`

  return (
    <span className={`rating ${size}`} role="img" aria-label={label}>
      {showValue && <strong>{value.toFixed(1)}</strong>}
      <span className="bubbles">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`bubble ${rounded >= i ? 'full' : rounded >= i - 0.5 ? 'half' : ''}`} />
        ))}
      </span>
      {count != null && <span className="rating-count">({count.toLocaleString()})</span>}
    </span>
  )
}
