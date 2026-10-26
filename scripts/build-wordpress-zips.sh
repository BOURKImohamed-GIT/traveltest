#!/usr/bin/env bash
# Builds the two files to upload in WordPress:
#   release/moroccotravely-theme.zip  (Appearance → Themes → Add New → Upload Theme)
#   release/travel-agency-core.zip    (Plugins → Add New → Upload Plugin)
set -euo pipefail
cd "$(dirname "$0")/.."

(cd frontend && npm ci --silent && npx tsc -b && THEME_BUILD=1 npx vite build)

mkdir -p release
rm -f release/moroccotravely-theme.zip release/travel-agency-core.zip
(cd wordpress-theme && zip -qr ../release/moroccotravely-theme.zip moroccotravely -x '*/.DS_Store' '*/images/README.md' '*/app/index.html')
(cd backend/wp-content/plugins && zip -qr ../../../release/travel-agency-core.zip travel-agency-core -x '*/.DS_Store')

ls -lh release/*.zip
