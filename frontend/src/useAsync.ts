import { useEffect, useState } from 'react'

export interface AsyncState<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
}

/** Run an async loader whenever `deps` change, ignoring stale responses. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, error: undefined, loading: true })

  // Callers supply their own deps, so the hook can't list them statically.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let active = true
    setState((s) => ({ ...s, loading: true, error: undefined }))
    load().then(
      (data) => active && setState({ data, error: undefined, loading: false }),
      (error: Error) => active && setState({ data: undefined, error, loading: false }),
    )
    return () => {
      active = false
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- callers pass their own deps
  }, deps)

  return state
}
