# MoroccoTravely — frontend

React 19 + TypeScript + Vite + React Router. See the [root README](../README.md) for full setup.

```bash
npm install
npm run dev      # dev server
npm run build    # type-check + production build
npm run lint
```

`VITE_WP_API_URL` points at the WordPress `travel/v1` API. When it is unset, `src/sampleApi.ts` serves the same sample content as `backend/wp-content/plugins/travel-agency-core/data/sample-content.json`.

| Path | Page |
| --- | --- |
| `/` | Home: full-width photo with search, start cities, rows for tours, day trips and activities, and a tour card slider |
| `/search` | All listings by type, with sort (`?category=tours-from-marrakech`, `day-trips`, `activities`, …) |
| `/destination/:slug` | Everything in one city (`/destinations/:slug` redirects here) |
| `/tour/:slug` | Tour page, same address as "View" in wp-admin (`/listings/:slug` and `/tours/:slug` redirect here) |
| `/contact` | Contact form, contact details and social links (wp-admin → Agency details) |
| `/about-us`, `/faqs`, `/booking-cancellation-policy`, `/privacy-policy`, `/terms-and-conditions` | WordPress pages with the same slug |
| `/saved` | Saved listings (stored in the browser) |
