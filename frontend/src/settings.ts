import { api } from './api'
import type { AgencySettings } from './types'
import { useAsync } from './useAsync'

let cached: Promise<AgencySettings> | undefined

/** Contact details and social links (wp-admin → Agency details), fetched once per page load. */
export function useSettings() {
  cached ??= api.settings().catch((e) => {
    cached = undefined
    throw e
  })
  return useAsync(() => cached!, []).data
}
