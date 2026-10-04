export const SITE_NAME = 'Rihla Travel'

export const CONTACT = {
  phone: '+212 663 263 902',
  phoneHref: 'tel:+212663263902',
  whatsappHref: 'https://wa.me/212663263902',
  email: 'Gomoroccovacation@gmail.com',
}

/** WordPress travel/v1 REST root, e.g. http://localhost:8080/wp-json/travel/v1 */
export const API_URL: string | undefined = import.meta.env.VITE_WP_API_URL?.replace(/\/$/, '') || undefined

export const USING_SAMPLE_DATA = !API_URL
