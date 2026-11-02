#!/usr/bin/env bash
# Builds the two files to upload in WordPress:
#   release/moroccotravely-theme.zip  (Appearance → Themes → Add New → Upload Theme)
#   release/travel-agency-core.zip    (Plugins → Add New → Upload Plugin)
set -euo pipefail
cd "$(dirname "$0")/.."

(cd frontend && npm ci --silent && npx tsc -b && THEME_BUILD=1 npx vite build)

# The plugin carries the theme (without the photos it already has in data/images), so sites
# whose host refuses theme zip uploads can install it from Agency details.
BUNDLE=backend/wp-content/plugins/travel-agency-core/theme
rm -rf "$BUNDLE" && mkdir -p "$BUNDLE"
cp -r wordpress-theme/moroccotravely "$BUNDLE/"
rm -f "$BUNDLE"/moroccotravely/app/images/*.jpg "$BUNDLE"/moroccotravely/app/images/README.md "$BUNDLE"/moroccotravely/app/index.html
# The logo also under a name that changes with its content, so no cache or old theme file can show an old logo.
LOGO_HASH=$(md5sum frontend/public/images/logo.png | cut -c1-10)
cp frontend/public/images/logo.png "$BUNDLE/moroccotravely/app/images/logo-$LOGO_HASH.png"

mkdir -p release
rm -f release/moroccotravely-theme.zip release/travel-agency-core.zip
(cd wordpress-theme && zip -9 -qr ../release/moroccotravely-theme.zip moroccotravely -x '*/.DS_Store' '*/images/README.md' '*/app/index.html')
(cd backend/wp-content/plugins && zip -9 -qr ../../../release/travel-agency-core.zip travel-agency-core -x '*/.DS_Store')

ls -lh release/*.zip
