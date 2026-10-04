# Rihla Travel

Travel agency website: **headless WordPress** backend + **React** frontend, with a review-site style layout (search hero, rating circles, listing cards, booking sidebar, traveler reviews).

```
backend/    WordPress (Docker) + "Travel Agency Core" plugin → REST API at /wp-json/travel/v1
frontend/   React + TypeScript + Vite single-page app
*.html      Original static HTML template (unchanged)
```

## Quick start

### 1. Backend (WordPress)

Requires Docker.

```bash
cd backend
cp .env.example .env
docker compose up -d
```

Open http://localhost:8080, finish the WordPress install, then:

```bash
docker compose run --rm wpcli wp plugin activate travel-agency-core
docker compose run --rm wpcli wp rewrite structure '/%postname%/'
docker compose run --rm wpcli wp eval-file /scripts/seed.php   # optional sample content
```

### 2. Frontend (React)

Requires Node 20+.

```bash
cd frontend
cp .env.example .env      # points at http://localhost:8080/wp-json/travel/v1
npm install
npm run dev               # http://localhost:5173
```

Without a `.env`, the frontend runs on built-in sample data, so you can work on the design without WordPress.

## Managing content (wp-admin)

| Menu | What it is |
| --- | --- |
| **Destinations** | Cities/regions. Fill *Country*, *Tagline*, set a featured image. |
| **Listings** | Tours, hotels, things to do, restaurants. Pick a *Listing type*, set price, duration, destination, highlights (one per line), gallery URLs, free cancellation. |
| **Comments** | Traveler reviews. New reviews wait for approval; approving one updates the listing's rating automatically. |
| **Inquiries** | "Request to book" submissions. The admin email also gets a copy. |

## API (`/wp-json/travel/v1`)

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/tours` | `search`, `type`, `destination`, `min_price`, `max_price`, `min_rating`, `sort` (`recommended`/`rating`/`price_asc`/`price_desc`), `page`, `per_page` |
| GET | `/tours/{slug}` | Full listing with description, highlights, gallery |
| GET / POST | `/tours/{id}/reviews` | POST is held for moderation |
| GET | `/destinations`, `/destinations/{slug}` | |
| GET | `/listing-types` | |
| POST | `/inquiries` | Booking request; stored privately + emailed to admin |

Public POST routes are validated, rate-limited per IP and have a honeypot field. CORS allows only `FRONTEND_ORIGIN`.

## Production notes

- Set `FRONTEND_ORIGIN` to your real site URL (comma-separate several).
- Configure SMTP (e.g. an SMTP plugin) so inquiry emails are delivered.
- Seeded content uses placeholder photos from picsum.photos — upload real featured images in wp-admin.
- `npm run build` outputs static files in `frontend/dist`; serve them with a fallback to `index.html` so routes like `/listings/...` work.
