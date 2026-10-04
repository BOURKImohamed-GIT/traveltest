# Experience in Morocco — frontend

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
| `/` | Home: tour search, categories, top-rated tours, destinations |
| `/search` | Tours with category, destination, rating and price filters + sort |
| `/destinations/:slug` | Tours in one destination |
| `/tours/:slug` | Tour: gallery, facts, highlights, itinerary, inclusions, meeting point, reviews, booking request |
| `/saved` | Saved tours (stored in the browser) |
