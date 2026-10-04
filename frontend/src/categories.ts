import { api } from './api'
import type { TourCategory } from './types'
import { useAsync } from './useAsync'

export const PACKAGES = 'tour-packages'

let cached: Promise<TourCategory[]> | undefined

/** Tour categories, fetched once per page load. */
export function loadCategories() {
  cached ??= api.categories().catch((e) => {
    cached = undefined
    throw e
  })
  return cached
}

export interface CategoryTree {
  all: TourCategory[]
  /** Children of "Tour packages", e.g. Marrakech desert tours. */
  packages: TourCategory[]
  /** Top-level groups other than tour packages, e.g. Day trips. */
  others: TourCategory[]
  /** Every category a tour can belong to (no parent groups). */
  leaves: TourCategory[]
  bySlug: Record<string, TourCategory>
}

export function buildTree(all: TourCategory[]): CategoryTree {
  const parents = new Set(all.map((c) => c.parent).filter(Boolean))
  return {
    all,
    packages: all.filter((c) => c.parent === PACKAGES),
    others: all.filter((c) => !c.parent && c.slug !== PACKAGES),
    leaves: all.filter((c) => !parents.has(c.slug)),
    bySlug: Object.fromEntries(all.map((c) => [c.slug, c])),
  }
}

export function useCategories() {
  const state = useAsync(loadCategories, [])
  return { ...state, tree: state.data ? buildTree(state.data) : undefined }
}
