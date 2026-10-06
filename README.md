# MoroccoTravely

The website of one Morocco travel agency, with a clean GetYourGuide-style design: **Morocco tours from** Marrakech, Fes, Casablanca, Tangier, Errachidia and Ouarzazate, **day trips**, **activities** (quad & buggy, camel rides, hot air balloon, desert experiences, cooking & food tours, hammam & spa) plus About Us, Contact Us, FAQs and the legal pages.

- **Travellers** don't need an account: they send a booking request or a message, and get the agency's answer by email.
- **The agency** gets every booking request and contact message by email and answers in wp-admin → **Inquiries**; the traveller is emailed the answer.

```
backend/    WordPress (Docker) + "Travel Agency Core" plugin → REST API at /wp-json/travel/v1
frontend/   React + TypeScript + Vite single-page app
*.html      Original static HTML template (unchanged)
```

## Install on your WordPress site (2 zip files)

1. **Plugin:** wp-admin → Plugins → Add New → **Upload Plugin** → choose `travel-agency-core.zip` → Install Now → **Activate**. The demo content (cities, tours, day trips, activities, About Us, FAQs, policies and example Agency details) is imported automatically.
2. **Theme:** wp-admin → Appearance → Themes → Add New → **Upload Theme** → choose `moroccotravely-theme.zip` → Install Now → **Activate**.
3. Settings → **Permalinks** → choose **Post name** → Save (pretty URLs such as `/tour/…`).
4. Settings → General → set **Site Title** (shown in the header and footer) and **Administration Email Address** (receives booking requests).
5. Agency details → replace the example email, phone, WhatsApp, address and social links with yours.

To re-import the demo later: Agency details → **Demo content** → Import demo content.

Build the two zips from this repository with `./scripts/build-wordpress-zips.sh` (needs Node 20+); they are written to `release/`.

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
docker compose run --rm wpcli wp eval-file /scripts/seed.php   # demo content (also imported on first activation)
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

## Managing the site (wp-admin)

Sign in at `/wp-admin` with your WordPress admin account. Travellers never see it.

| Menu | What you can do |
| --- | --- |
| **Agency details** | Email, phone, WhatsApp and address (Contact Us page and footer), the footer's **About us** text and **Accepted payment** list, the **Show prices** switch (untick to show "Price on request" everywhere; to hide one tour's price, tick **Hide price** on that tour), and your **social media and review sites**: pick Facebook, Instagram, TikTok, YouTube, X, Tripadvisor, Google reviews, GetYourGuide, Viator, Pinterest, LinkedIn, Threads, or **Other** with your own name (e.g. Booking.com), and paste the link. Icons appear in the footer and on Contact Us. Empty a link to remove it. |
| **Inquiries** | Every booking request and contact message, with **Status** (Waiting for reply, Confirmed, Declined, Cancelled, Contact message), **Listing**, **Traveller**, date and guests. Filter with **All statuses**. Open a booking request and use **Answer this request**: pick Confirmed or Declined, write a reply and keep **Email the traveller** ticked to send it. |
| **Listings** | Your tours, day trips, activities and camps, with a **Price** column. Add or edit one, set its **Listing category** and **Destination**, and a featured image. The tour page shows: tour style badge, overview with duration / start / end / style, highlights, day-by-day itinerary (`Title | details | driving distance/time`, one day per line), important notes, included / not included, gallery, a Google map of the route (from the **Location label**, e.g. `Marrakech → Merzouga → Fes`), the FAQs and related tours. |
| **Pages** | About Us, FAQs (each `Heading 2` is a section and each `Heading 3` a question; they also appear on every tour page), Booking & Cancellation Policy, Privacy Policy, Terms & Conditions. Edit the text here; the app shows the published version. The legal pages are drafts: review them (ideally with a lawyer) before going live. |
| **Comments** | Traveller reviews. New reviews wait for approval; approving one updates the listing's rating. |
| **Listing categories** / **Destinations** | The menus (Destinations, Day Trips, Activities) and the cities. |

Booking requests, cancellations and contact messages are sent to the **Administration Email Address** in Settings → General.

The agency name in the header and footer is `SITE_NAME` in `frontend/src/config.ts`.

## API (`/wp-json/travel/v1`)

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/tours` | `search`, `category`, `destination`, `min_price`, `max_price`, `min_rating`, `sort` (`recommended`/`rating`/`price_asc`/`price_desc`), `page`, `per_page` |
| GET | `/tours/{slug}` | Full listing: description, tour style, start/end, highlights, itinerary (with driving distance), notes, inclusions, meeting point, languages, gallery |
| GET / POST | `/tours/{id}/reviews` | POST is held for moderation |
| GET | `/destinations`, `/destinations/{slug}` | |
| GET | `/tour-categories` | Categories with their `parent` |
| GET | `/pages/{slug}` | A published WordPress page: `{slug, title, content}` |
| POST | `/inquiries` | Booking request; emailed to the agency |
| POST | `/contact` | Contact form `{name, email, phone, subject, message}`; stored in Inquiries and emailed to the agency |
| GET | `/settings` | Agency contact details and social links |

Public POST routes are validated, rate-limited and have a honeypot field. CORS allows only `FRONTEND_ORIGIN`.

## Production notes

- Traveller accounts are turned off on the website. The plugin still contains the Google sign-in and My bookings API (`includes/auth.php`, `profile.php`, `bookings.php`) if you want to bring them back.

- Set `FRONTEND_ORIGIN` to your real site URL (comma-separate several).
- Configure SMTP (e.g. an SMTP plugin) so inquiry emails are delivered.
- Prices in the sample content are estimates: set your own in wp-admin.
- Photos: some tours use files in `frontend/public/images/` (see the README there for names). Other sample tours use placeholder photos from picsum.photos — upload real featured images in wp-admin.
- `npm run build` with `VITE_MEMORY_ROUTER=1 npx vite build --base ./` makes a build that works without server URL rewrites (used for the hosted preview).
- `npm run build` outputs static files in `frontend/dist`; serve them with a fallback to `index.html` so routes like `/tours/...` work.
