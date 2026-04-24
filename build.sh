#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

rm -f deployment.zip

if [ ! -d node_modules ]; then
  npm install --omit=dev --silent
fi

zip -rq deployment.zip \
  handler.mjs \
  scrape.mjs \
  grid.mjs \
  places-api.mjs \
  index.mjs \
  package.json \
  node_modules

echo "deployment.zip created ($(du -h deployment.zip | cut -f1))"
