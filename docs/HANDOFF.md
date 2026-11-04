# Handoff: Experience in Morocco marketplace

Live site: https://experienceinmorocco.com (WordPress on Hostinger, LiteSpeed cache).
Repository: BOURKImohamed-GIT/traveltest, branch `claude/modest-goodall-ii9l9g`, draft PR #1.

## What is where

- `backend/wp-content/plugins/travel-agency-core/`: the plugin (current version in `travel-agency-core.php`, 1.18.0).
  It also carries the theme (folder `theme/moroccotravely`, made by the build script) and installs/updates it.
- `frontend/`: the React app (Vite + TypeScript). `THEME_BUILD=1 npx vite build` writes it into
  `wordpress-theme/moroccotravely/app/`.
- `scripts/build-wordpress-zips.sh`: builds `release/travel-agency-core.zip` (the only file to upload) and
  `release/experience-in-morocco-theme.zip`. Copies also go to `downloads/`.
- `README.md`: features and admin guide. `docs/menu-setup.md`: menus.

## Release routine

1. `cd frontend && npm ci && npx tsc -b && npx oxlint src`
2. Bump the version in `travel-agency-core.php` (header + `TAC_VERSION`); data changes go in
   `tac_maybe_upgrade()` (includes/sample-content.php) behind `version_compare`.
3. `./scripts/build-wordpress-zips.sh`, copy zips to `downloads/`, commit, push.
4. Upload `travel-agency-core.zip` in wp-admin (Replace current), open any wp-admin page once, purge LiteSpeed cache.

## Done so far (high level)

Marketplace with business (supplier) accounts and dashboard, 7-step listing wizard, admin Marketplace
screens (business/listing approval, clients, booking activity, messages, site pages), traveller accounts,
booking requests with emails at every step, team ↔ business messages with photos, reviews with photos,
unique business names matching websites, logos, business pages, separate traveller/supplier terms,
listing addresses `<title>-<business>` with old-address redirects, new wide logo and camel favicon.

## Next ideas (not started)

- Search pack (SEO): per-page titles/descriptions, Open Graph images, listing text in the HTML,
  JSON-LD (tour + rating, business, breadcrumbs), clean sitemap (listings, business pages, categories),
  noindex on private pages, real 404 status.

## Working on the live site (owner's rules, Novamira CLI on Windows)

- Env first: `NOVAMIRA_CREDENTIAL_BACKEND=file`, `NOVAMIRA_AGENT=claude-code`.
- `novamira --site experienceinmorocco.com auth status`; if missing/expired, device login
  (`novamira.cmd auth login https://experienceinmorocco.com --device`) and give the owner:
  👉 https://experienceinmorocco.com/wp-admin/admin.php?page=novamira-oauth-device and 🔑 Code: XXXX-XXXX.
- Run PHP: `novamira --site experienceinmorocco.com run novamira/execute-php --input @_run.json --yes --json`
  with `_run.json = {"code": "<php without <?php>"}`.
- 30-second limit per PHP run: batch big jobs, retry on network errors.
- Serialized data only through WordPress functions; write HTML with `$wpdb` (kses strips tags via
  wp_update_post/wp_update_term over this connection).
- Clear the cache after changes and check pages with `?z=random`.
- Ask before deleting anything important or changing the design; keep the existing design.
- "Remove traces and backups" = delete Novamira tokens/sandbox and backup data at the end.
- Explain results in simple words.
