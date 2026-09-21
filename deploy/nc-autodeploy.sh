#!/bin/bash
# Nadine Cloud auto-deploy. Runs on the cPanel server every minute (cron) as user nadine14.
# When the `deploy` branch on GitHub has a new commit, it installs it: backend files -> the Node app,
# built website pages -> public_html, then restarts the app. Nothing is done if there is nothing new.
#
# Safety: it refuses to install a broken commit (missing files or JavaScript syntax errors), keeps
# the last 10 backups of what it replaces, and can be rolled back by reverting the commit on GitHub.

HOME_DIR=/home/nadine14
REPO_URL=https://github.com/nadineomnitradinglimited-cmyk/nadine-cloud-website.git
REPO=$HOME_DIR/repos/nadine-cloud-deploy
APP=$HOME_DIR/nodeapp
SITE=$HOME_DIR/public_html
NODE=$HOME_DIR/nodevenv/nodeapp/24/bin/node
STATE=$HOME_DIR/.nc-deployed
LOG=$HOME_DIR/logs/autodeploy.log
BACKUPS=$HOME_DIR/deploy-backups
FILES="server.js auth.js ai-builder.js chat.js contact.js db.js email.js ftp-deploy.js namecheap.js namecom.js payments.js pricing.js receipt.js registrar.js reminders.js whm.js package.json package-lock.json"

log() { echo "$(date -u +%FT%TZ) $*" >> "$LOG"; }

# only one run at a time
exec 9>"$HOME_DIR/.nc-autodeploy.lock"
flock -n 9 || exit 0

mkdir -p "$HOME_DIR/repos" "$BACKUPS"

# first run: clone
if [ ! -d "$REPO/.git" ]; then
  git clone -q --branch deploy --single-branch "$REPO_URL" "$REPO" >> "$LOG" 2>&1 || { log "clone failed (deploy branch not published yet?)"; exit 0; }
  log "cloned deploy branch"
fi

cd "$REPO" || exit 1
git fetch -q origin +deploy:refs/remotes/origin/deploy >> "$LOG" 2>&1 || exit 0
NEW=$(git rev-parse origin/deploy 2>/dev/null)
[ -z "$NEW" ] && exit 0
CUR=$(cat "$STATE" 2>/dev/null)
[ "$NEW" = "$CUR" ] && exit 0

log "new version $NEW - checking it"
git checkout -q -B deploy origin/deploy >> "$LOG" 2>&1
git reset -q --hard origin/deploy

# ---- refuse to install a broken version ----
for f in $FILES; do
  [ -f "$REPO/$f" ] || { log "ABORT: $f is missing in $NEW - nothing was changed"; exit 1; }
done
[ -f "$REPO/site/index.html" ] || { log "ABORT: site/index.html is missing in $NEW - nothing was changed"; exit 1; }
for f in $FILES; do
  case "$f" in *.js) "$NODE" --check "$REPO/$f" >> "$LOG" 2>&1 || { log "ABORT: $f has a syntax error in $NEW - nothing was changed"; exit 1; } ;; esac
done

# ---- back up what is about to be replaced ----
TS=$(date -u +%Y%m%dT%H%M%SZ)
( cd "$APP" && tar czf "$BACKUPS/app-$TS.tgz" $FILES 2>/dev/null )
ls -1t "$BACKUPS"/app-*.tgz 2>/dev/null | tail -n +11 | xargs -r rm -f

# ---- install ----
OLDLOCK=$(md5sum "$APP/package-lock.json" 2>/dev/null | cut -d' ' -f1)
for f in $FILES; do cp -f "$REPO/$f" "$APP/$f"; done
cp -Rf "$REPO/site/." "$SITE/"

# new libraries? (package-lock changed) install them for the app's Node version
NEWLOCK=$(md5sum "$APP/package-lock.json" | cut -d' ' -f1)
if [ "$OLDLOCK" != "$NEWLOCK" ]; then
  log "package-lock changed - running npm install"
  ( source "$HOME_DIR/nodevenv/nodeapp/24/bin/activate" && cd "$APP" && npm install --omit=dev --no-audit --no-fund ) >> "$LOG" 2>&1 || log "WARNING: npm install reported a problem"
fi

# restart the app (Passenger restarts when this file is touched)
mkdir -p "$APP/tmp"
touch "$APP/tmp/restart.txt"

echo "$NEW" > "$STATE"
log "DEPLOYED $NEW ($(cat "$REPO/VERSION" 2>/dev/null))"
