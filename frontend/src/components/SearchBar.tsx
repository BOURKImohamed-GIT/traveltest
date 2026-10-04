import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchIcon } from './Icons'

interface Props {
  placeholder?: string
  compact?: boolean
  initial?: string
}

export default function SearchBar({ placeholder = 'Search tours or destinations', compact, initial = '' }: Props) {
  const [q, setQ] = useState(initial)
  const navigate = useNavigate()

  function submit(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    navigate(`/search?${params}`)
  }

  return (
    <form role="search" className={`searchbar${compact ? ' compact' : ''}`} onSubmit={submit}>
      <SearchIcon size={compact ? 18 : 22} />
      <label className="visually-hidden" htmlFor={compact ? 'q-compact' : 'q-main'}>
        Search
      </label>
      <input
        id={compact ? 'q-compact' : 'q-main'}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      <button type="submit" className={`btn ${compact ? 'btn-primary' : 'btn-brand'}`} style={compact ? { padding: '8px 16px' } : undefined}>
        Search
      </button>
    </form>
  )
}
