#!/bin/bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BASE_DIR"

for source in prologue-scroll s320-model s320-aig-hero game flight-ranking wind-tunnel tobito-dialogue tbt-hangar-console yakitori-game site-ui site-theme tobito-companion birdman-course flight-scenery contest-venue tobito-surf-core tobito-surf-demo active-theory-archive; do
    node --check "assets/js/$source.js"
done
node --check extensions/tobito-surfing/content.js
node --check extensions/tobito-surfing/popup.js
python3 scripts/build_tobito_extension.py
node --test tests/*.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/update_page_tobito.py
for source in index.php page-tobito.php data.php includes/header.php includes/footer.php api/flight-ranking.php; do
    php -l "$source"
done

# Replace the static preview only after PHP has rendered successfully.
preview_file="$(mktemp "$BASE_DIR/.preview.XXXXXX")"
trap 'rm -f "$preview_file"' EXIT
php index.php > "$preview_file"
mv "$preview_file" index.html
bash scripts/sync_wordpress.sh
