#!/bin/bash
set -e

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WP_DIR="$BASE_DIR/wordpress-theme-files"

echo "Syncing TBT Tobito files to WordPress Theme files..."
mkdir -p "$WP_DIR/js" "$WP_DIR/css" "$WP_DIR/images" "$WP_DIR/data" "$WP_DIR/models" "$WP_DIR/downloads" "$WP_DIR/api"
cp "$BASE_DIR/api/flight-ranking.php" "$WP_DIR/api/flight-ranking.php"

cp -R "$BASE_DIR/assets/js/"* "$WP_DIR/js/"
cp -R "$BASE_DIR/assets/css/"* "$WP_DIR/css/"
cp -R "$BASE_DIR/assets/images/"* "$WP_DIR/images/"
cp -R "$BASE_DIR/assets/downloads/"* "$WP_DIR/downloads/"
if [ -d "$BASE_DIR/assets/models" ]; then
    cp -R "$BASE_DIR/assets/models/"* "$WP_DIR/models/"
fi
cp "$BASE_DIR/page-tobito.php" "$WP_DIR/page-tobito.php"
cp "$BASE_DIR/index.php" "$WP_DIR/index.php"
cp "$BASE_DIR/data.php" "$WP_DIR/data.php"
cp "$BASE_DIR/data.php" "$WP_DIR/data-tobito.php"

# Symlink assets inside wordpress-theme-files if not exists
if [ ! -L "$WP_DIR/assets" ]; then
    (cd "$WP_DIR" && ln -s . assets)
fi

echo "Sync complete!"
