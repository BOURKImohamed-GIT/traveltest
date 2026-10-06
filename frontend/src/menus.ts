import { api } from './api'
import type { CategoryTree } from './categories'
import type { MenuItem, Menus } from './types'
import { useAsync } from './useAsync'

let cached: Promise<Menus> | undefined

/** Menus from Appearance → Menus, fetched once per page load. A missing menu is null. */
export function useMenus() {
  cached ??= api.menus().catch(() => ({ primary: null, quick: null, footer: null }))
  return useAsync(() => cached!, []).data
}

const item = (title: string, url: string, children: MenuItem[] = []): MenuItem => ({ title, url, external: false, children })

/** Used until a "Main menu" exists in WordPress: the tour categories, then About Us. */
export function defaultPrimary(tree: CategoryTree | undefined): MenuItem[] {
  const tops = tree?.all.filter((c) => !c.parent) ?? []
  return [
    item('Home', '/'),
    ...tops.map((top) =>
      item(
        top.name,
        `/search?category=${top.slug}`,
        (tree?.all ?? []).filter((c) => c.parent === top.slug).map((c) => item(c.name, `/search?category=${c.slug}`)),
      ),
    ),
    item('About Us', '/about-us'),
  ]
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
