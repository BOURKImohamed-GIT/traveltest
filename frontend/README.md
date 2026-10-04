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
| `/` | Home: search tabs, cities, rows for tours, stays, activities, day trips and restaurants |
| `/search` | Everything, with category, destination, rating and price filters + sort |
| `/destinations/:slug` | Everything in one city |
| `/listings/:slug` | Listing: gallery, facts, highlights, amenities, itinerary, inclusions, reviews, booking request (`/tours/:slug` redirects here) |
| `/signin` | Sign in with Google (demo account in preview mode) |
| `/host` | A business's own listings and their review status |
| `/host/new`, `/host/listings/:id/edit` | Add or edit a listing, with photo upload |
| `/saved` | Saved listings (stored in the browser) |
