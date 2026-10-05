# MoroccoTravely — frontend

React 19 + TypeScript + Vite + React Router. See the [root README](../README.md) for full setup.

```bash
npm install
npm run dev      # dev server
npm run build    # type-check + production build
npm run lint
```

`VITE_WP_API_URL` points at the WordPress `travel/v1` API. When it is unset, `src/sampleApi.ts` serves the same sample content as `backend/scripts/seed-data.json`.

| Path | Page |
| --- | --- |
| `/` | Home: search tabs, start cities, rows for tours, day trips, activities and camping |
| `/search` | All listings by type, with sort (`?category=tours-from-marrakech`, `day-trips`, `activities`, …) |
| `/destinations/:slug` | Everything in one city |
| `/listings/:slug` | Listing: gallery, facts, highlights, itinerary, inclusions, reviews, booking request (`/tours/:slug` redirects here) |
| `/camping` | Camping intro (WordPress page `camping`) and the camps |
| `/contact` | Contact form, contact details and social links (wp-admin → Agency details) |
| `/about-us`, `/faqs`, `/booking-cancellation-policy`, `/privacy-policy`, `/terms-and-conditions` | WordPress pages with the same slug |
| `/saved` | Saved listings (stored in the browser) |
