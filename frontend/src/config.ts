/** Set by the WordPress theme (window.TRAVEL_CONFIG) when the app runs inside WordPress. */
interface RuntimeConfig {
  /** travel/v1 REST root */
  apiUrl?: string
  /** URL of the built app folder in the theme, for /images/... */
  assetsUrl?: string
  /** Path WordPress is installed under, e.g. "/" or "/blog/" */
  basePath?: string
  /** Settings → General → Site Title */
  siteName?: string
}

declare global {
  interface Window {
    TRAVEL_CONFIG?: RuntimeConfig
  }
}

const RUNTIME: RuntimeConfig = (typeof window !== 'undefined' && window.TRAVEL_CONFIG) || {}

export const SITE_NAME = RUNTIME.siteName || 'MoroccoTravely'

/** WordPress travel/v1 REST root, e.g. http://localhost:8080/wp-json/travel/v1 */
export const API_URL: string | undefined = (RUNTIME.apiUrl || import.meta.env.VITE_WP_API_URL)?.replace(/\/$/, '') || undefined

export const USING_SAMPLE_DATA = !API_URL

/** Router base path ("/" unless WordPress lives in a sub-folder). */
export const BASE_PATH = (RUNTIME.basePath || '/').replace(/\/$/, '') || '/'

const ASSET_BASE = (RUNTIME.assetsUrl || import.meta.env.BASE_URL).replace(/\/?$/, '/')

/** URL of a file shipped with the app, e.g. asset('images/sahara-caravan.jpg'). */
export const asset = (path: string) => ASSET_BASE + path.replace(/^\//, '')
