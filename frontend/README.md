# Rihla Travel — frontend

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
| `/` | Home: search hero, top destinations, top-rated listings |
| `/search` | Results with type, destination, rating and price filters + sort |
| `/destinations/:slug` | Destination page |
| `/listings/:slug` | Listing: gallery, highlights, reviews, booking request |
| `/saved` | Hearted listings (stored in the browser) |
