#!/bin/bash
# Builds the website pages and publishes everything the server needs to the `deploy` branch on GitHub.
# The Nadine Cloud server checks that branch every minute (deploy/nc-autodeploy.sh) and installs it.
#
# Runs automatically before every `git push` of main from this PC (git pre-push hook), and by hand:
#   bash deploy/publish.sh
# (deploy/deploy.yml.disabled is the same job for GitHub Actions, for when that is available.)

[ "$NC_PUBLISHING" = "1" ] && exit 0
export NC_PUBLISHING=1
set -e

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
FILES="server.js auth.js ai-builder.js chat.js contact.js db.js email.js ftp-deploy.js namecheap.js namecom.js lipila.js payments.js pricing.js receipt.js registrar.js reminders.js whm.js package.json package-lock.json"

echo "[deploy] checking the backend files..."
for f in $FILES; do
  case "$f" in *.js) node --check "$f" ;; esac
done
bash -n deploy/nc-autodeploy.sh
for c in deploy/sites.d/*.conf; do bash -n "$c"; done

echo "[deploy] building the website pages..."
( cd web && BUILD_TARGET=static npx next build > /tmp/nc-next-build.log 2>&1 ) || { echo "[deploy] the website build FAILED - see /tmp/nc-next-build.log. Nothing was published."; exit 1; }
test -f web/out/index.html

TMP=$(mktemp -d)
for f in $FILES; do cp "$f" "$TMP/"; done
cp -R web/out "$TMP/site"

# The auto-deploy script itself and the other sites' settings travel with this branch.
# tr -d '\015' removes Windows carriage returns so the files run on the Linux server.
tr -d '\015' < deploy/nc-autodeploy.sh > "$TMP/nc-autodeploy.sh"
mkdir "$TMP/sites.d"
for c in deploy/sites.d/*.conf; do
  tr -d '\015' < "$c" > "$TMP/sites.d/$(basename "$c")"
done

SHA=$(git rev-parse HEAD)
echo "Built from $SHA at $(date -u +%FT%TZ)" > "$TMP/VERSION"

echo "[deploy] publishing the deploy branch..."
( cd "$TMP" \
  && git init -q -b deploy \
  && git add -A \
  && git -c user.name="nadine-cloud-deploy" -c user.email="deploy@nadinecloud.com" commit -q -m "Deploy ${SHA:0:7}" \
  && git push -q -f "$(git -C "$ROOT" remote get-url origin)" deploy )
rm -rf "$TMP"
echo "[deploy] published ${SHA:0:7}. The server installs it within a minute."
