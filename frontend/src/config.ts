export const SITE_NAME = 'MoroccoTravely'

/** WordPress travel/v1 REST root, e.g. http://localhost:8080/wp-json/travel/v1 */
export const API_URL: string | undefined = import.meta.env.VITE_WP_API_URL?.replace(/\/$/, '') || undefined

export const USING_SAMPLE_DATA = !API_URL
