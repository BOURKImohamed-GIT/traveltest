# MoroccoTravely

The website of one Morocco travel agency, with a clean GetYourGuide-style design: **Morocco tours from** Marrakech, Fes, Casablanca, Tangier, Errachidia and Ouarzazate, **day trips**, **activities** (quad & buggy, camel rides, hot air balloon, desert experiences, cooking & food tours, hammam & spa) and **desert camping**, plus About Us, Contact Us, FAQs and the legal pages.

- **Travellers** sign in with Google, send booking requests and follow them in **My bookings** (waiting, confirmed, declined, cancelled) with the agency's reply. They can cancel a request.
- **The agency** gets every booking request and contact message by email and answers in wp-admin → **Inquiries**; the traveller is emailed the answer.

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

## Google sign-in for travellers

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type **Web application**.
2. Under **Authorized JavaScript origins**, add your frontend URL (e.g. `http://localhost:5173` and `https://moroccotravely.com`).
3. Put the client ID in `backend/.env` as `GOOGLE_CLIENT_ID=…` and restart: `docker compose up -d`.

The React app asks WordPress for the client ID, shows Google's button, and sends the Google token to WordPress, which verifies it with Google and creates a traveller account on first sign-in. Travellers never see wp-admin; everything happens in **My account** in the app (`/account`).

For local testing without Google you can enable a test sign-in by adding `define('TRAVEL_DEV_LOGIN', true);` together with `WP_DEBUG` on. **Never enable it on a public site.**

## Managing the site (wp-admin)

Sign in at `/wp-admin` with your WordPress admin account. Travellers never see it.

| Menu | What you can do |
| --- | --- |
| **Inquiries** | Every booking request and contact message, with **Status** (Waiting for reply, Confirmed, Declined, Cancelled, Contact message), **Listing**, **Traveller**, date and guests. Filter with **All statuses**. Open a booking request and use **Answer this request**: pick Confirmed or Declined, write a reply and keep **Email the traveller** ticked to send it. |
| **Listings** | Your tours, day trips, activities and camps, with a **Price** column. Add or edit one, set its **Listing category** and **Destination**, and a featured image. |
| **Pages** | About Us, Camping (intro text), FAQs, Booking & Cancellation Policy, Privacy Policy, Terms & Conditions. Edit the text here; the app shows the published version. The legal pages are drafts: review them (ideally with a lawyer) before going live. |
| **Users** | Travellers who signed in, with their number of **Bookings**. Hover a row and click **Suspend** to block an account and sign it out. |
| **Comments** | Traveller reviews. New reviews wait for approval; approving one updates the listing's rating. |
| **Listing categories** / **Destinations** | The menus (Destinations, Day Trips, Activities, Camping) and the cities. |

Booking requests, cancellations and contact messages are sent to the **Administration Email Address** in Settings → General.

Your phone, WhatsApp, email and address on the Contact Us page come from `CONTACT` in `frontend/src/config.ts` (empty values are hidden); the agency name is `SITE_NAME` in the same file.

## API (`/wp-json/travel/v1`)

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/tours` | `search`, `category`, `destination`, `min_price`, `max_price`, `min_rating`, `sort` (`recommended`/`rating`/`price_asc`/`price_desc`), `page`, `per_page` |
| GET | `/tours/{slug}` | Full listing: description, highlights, amenities, itinerary, inclusions, meeting point, languages, gallery |
| GET / POST | `/tours/{id}/reviews` | POST is held for moderation |
| GET | `/destinations`, `/destinations/{slug}` | |
| GET | `/tour-categories` | Categories with their `parent` |
| GET | `/pages/{slug}` | A published WordPress page: `{slug, title, content}` |
| POST | `/inquiries` | Booking request; emailed to the agency. Send the bearer token to link it to the traveller's account |
| POST | `/contact` | Contact form `{name, email, phone, subject, message}`; stored in Inquiries and emailed to the agency |
| GET | `/auth/config` | Google client ID for the sign-in button |
| POST | `/auth/google` | `{credential}` (Google ID token) → `{token, user}` |
| GET / PUT | `/me` | Signed-in traveller (`Authorization: Bearer <token>`); PUT updates name and phone |
| GET | `/me/bookings` | The traveller's booking requests (made while signed in, or earlier with the same email) |
| POST | `/me/bookings/{id}/cancel` | Traveller cancels a request; the agency is emailed |

Public POST routes are validated, rate-limited and have a honeypot field. Account routes need a signed session token. CORS allows only `FRONTEND_ORIGIN`.

## Production notes

- Set `FRONTEND_ORIGIN` to your real site URL (comma-separate several).
- Configure SMTP (e.g. an SMTP plugin) so inquiry emails are delivered.
- Prices in the sample content are estimates: set your own in wp-admin.
- Photos: some tours use files in `frontend/public/images/` (see the README there for names). Other sample tours use placeholder photos from picsum.photos — upload real featured images in wp-admin.
- `npm run build` with `VITE_MEMORY_ROUTER=1 npx vite build --base ./` makes a build that works without server URL rewrites (used for the hosted preview).
- `npm run build` outputs static files in `frontend/dist`; serve them with a fallback to `index.html` so routes like `/tours/...` work.
