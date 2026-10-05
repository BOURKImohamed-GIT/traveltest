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
| `/` | Home: search tabs, cities, rows for tours, activities and day trips |
| `/search` | Everything, with category, destination, rating and price filters + sort |
| `/destinations/:slug` | Everything in one city |
| `/listings/:slug` | Listing: gallery, facts, highlights, amenities, itinerary, inclusions, reviews, booking request (`/tours/:slug` redirects here) |
| `/signin` | Choose traveller or business, then sign in with Google (demo account in preview mode) |
| `/account/bookings` | My bookings: every request and its status, with cancel |
| `/account/listings` | Business: listings and their review status |
| `/account/listings/new` | Business: pick a type, then add a listing with photos (`…/:id/edit` to edit) |
| `/account/requests` | Business: incoming booking requests to confirm or decline |
| `/account/profile` | Name, phone and account type |
| `/saved` | Saved listings (stored in the browser) |
