import { api } from './api'
import type { CategoryTree } from './categories'
import { listingSchema } from './listingSchema'
import type { MenuItem, Menus } from './types'
import { useAsync } from './useAsync'

let cached: Promise<Menus> | undefined

/** Menus from Appearance → Menus, fetched once per page load. A missing menu is null. */
export function useMenus() {
  cached ??= api.menus().catch(() => ({ primary: null, quick: null, footer: null }))
  return useAsync(() => cached!, []).data
}

const item = (title: string, url: string, children: MenuItem[] = []): MenuItem => ({ title, url, external: false, children })

/** Used until a main menu exists in WordPress: the six groups, each listing its categories. */
export function defaultPrimary(tree: CategoryTree | undefined): MenuItem[] {
  const names = new Map(tree?.all.map((c) => [c.slug, c.name]))
  return listingSchema.menuGroups.map((g) =>
    item(
      g.label,
      '',
      listingSchema.categories.filter((c) => c.menuGroup === g.key).map((c) => item(names.get(c.slug) ?? c.name, `/search?category=${c.slug}`)),
    ),
  )
}

export const DEFAULT_QUICK: MenuItem[] = [item('Home', '/'), item('About Us', '/about-us'), item('Contact Us', '/contact'), item('FAQs', '/faqs')]

export const DEFAULT_FOOTER: MenuItem[] = [
  item('About Us', '/about-us'),
  item('Contact Us', '/contact'),
  item('FAQs', '/faqs'),
  item('Booking & Cancellation Policy', '/booking-cancellation-policy'),
  item('Privacy Policy', '/privacy-policy'),
  item('Terms & Conditions', '/terms-and-conditions'),
]

/** True when the item (or one of its children) is the current page. */
export function isCurrent(entry: MenuItem, here: string): boolean {
  const norm = (u: string) => u.replace(/\/(\?|$)/, '$1') || '/'
  return (!!entry.url && norm(entry.url) === norm(here)) || entry.children.some((c) => isCurrent(c, here))
}
