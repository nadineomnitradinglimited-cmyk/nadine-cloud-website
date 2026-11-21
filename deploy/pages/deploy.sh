#!/bin/bash
# Publish the nadinecloud.com website PAGES to Cloudflare Pages (project "nadinecloud").
# The /api part is forwarded to InMotion by functions/api/[[path]].js (via origin.nadinecloud.com).
#   bash deploy/pages/deploy.sh            → live (www.nadinecloud.com, once the custom domain is attached)
#   bash deploy/pages/deploy.sh preview    → preview address only
# Needs: web/out built first (BUILD_TARGET=static npx next build) and `npx wrangler login` done once.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
[ -f "$ROOT/web/out/index.html" ] || { echo "web/out is missing — build first"; exit 1; }
rm -rf "$HERE/dist"
cp -r "$ROOT/web/out" "$HERE/dist"
BRANCH=main
[ "$1" = "preview" ] && BRANCH=preview
cd "$HERE"
npx --yes wrangler@4 pages deploy dist --project-name nadinecloud --branch "$BRANCH" --commit-dirty=true
