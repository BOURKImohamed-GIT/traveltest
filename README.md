# MoroccoTravely

A travel site for Morocco in the style of TripAdvisor: **stays** (hotels, riads, auberges, bivouacs and desert camps), **tour packages**, **day trips**, **activities** and **restaurants**, with traveller reviews and booking requests. Any business can **sign in with Google and publish its own listings**; the site team approves each one before it goes live.

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

Set `GOOGLE_CLIENT_ID` in `.env` first (see **Google sign-in** below). Open http://localhost:8080, finish the WordPress install, then:

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

## Google sign-in for businesses

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type **Web application**.
2. Under **Authorized JavaScript origins**, add your frontend URL (e.g. `http://localhost:5173` and `https://moroccotravely.com`).
3. Put the client ID in `backend/.env` as `GOOGLE_CLIENT_ID=…` and restart: `docker compose up -d`.

The React app asks WordPress for the client ID, shows Google's button, and sends the Google token to WordPress, which verifies it with Google and creates a **Listing owner** account on first sign-in. Owners never see wp-admin; they manage listings from **Your listings** in the app.

For local testing without Google you can enable a test sign-in by adding `define('TRAVEL_DEV_LOGIN', true);` together with `WP_DEBUG` on. **Never enable it on a public site.**

## Managing content (wp-admin)

| Menu | What it is |
| --- | --- |
| **Listings** | Everything on the site. Listings sent by businesses arrive as **Pending**: open, check and **Publish** them. An owner's edit sends the listing back to Pending. |
| **Listing categories** | Stays, Tour packages, Day trips, Activities and Restaurants, with their sub-types. |
| **Destinations** | Cities. Fill *Country*, *Tagline*, set a featured image. |
| **Comments** | Traveller reviews. New reviews wait for approval; approving one updates the listing's rating. |
| **Inquiries** | Booking and table requests. The admin email gets a copy, and so does the business that owns the listing. |

You get an email for every new or edited listing waiting for review.

## API (`/wp-json/travel/v1`)

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/tours` | `search`, `category`, `destination`, `min_price`, `max_price`, `min_rating`, `sort` (`recommended`/`rating`/`price_asc`/`price_desc`), `page`, `per_page` |
| GET | `/tours/{slug}` | Full listing: description, highlights, amenities, itinerary, inclusions, meeting point, languages, gallery, host |
| GET / POST | `/tours/{id}/reviews` | POST is held for moderation |
| GET | `/destinations`, `/destinations/{slug}` | |
| GET | `/tour-categories` | Categories with their `parent` |
| POST | `/inquiries` | Booking request; stored privately and emailed to admin and the listing owner |
| GET | `/auth/config` | Google client ID for the sign-in button |
| POST | `/auth/google` | `{credential}` (Google ID token) → `{token, user}` |
| GET | `/me` | Signed-in user (`Authorization: Bearer <token>`) |
| GET / POST | `/me/listings` | The owner's listings / create one (goes to review) |
| GET / PUT / DELETE | `/me/listings/{id}` | Read, edit (back to review) or delete one of the owner's listings |
| POST | `/me/uploads` | Upload a photo (multipart `file`, JPEG/PNG/WebP, max 8 MB) |

Public POST routes are validated, rate-limited and have a honeypot field. Owner routes need a signed session token; owners can only touch their own listings and photos. CORS allows only `FRONTEND_ORIGIN`.

## Production notes

- Set `FRONTEND_ORIGIN` to your real site URL (comma-separate several).
- Configure SMTP (e.g. an SMTP plugin) so inquiry emails are delivered.
- Photos: the Chefchaouen tours use files in `frontend/public/images/` (see the README there for names). Other sample tours use placeholder photos from picsum.photos — upload real featured images in wp-admin.
- `npm run build` with `VITE_MEMORY_ROUTER=1 npx vite build --base ./` makes a build that works without server URL rewrites (used for the hosted preview).
- `npm run build` outputs static files in `frontend/dist`; serve them with a fallback to `index.html` so routes like `/tours/...` work.
