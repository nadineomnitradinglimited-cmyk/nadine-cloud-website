#!/bin/bash
# Nadine Cloud auto-deploy (v2, all sites). Runs on the cPanel server every minute (cron) as user nadine14.
#
# For every site it checks the site's GitHub branch. When there is a new commit it verifies it, backs up
# what it replaces, installs the files into the site's Node app, runs `npm install` if the lock file
# changed, and restarts the app. It also updates ITSELF and the per-site settings from the Nadine Cloud
# `deploy` branch (files nc-autodeploy.sh and sites.d/*.conf), so nothing is ever uploaded by hand.
#
# Private repos are read with a read-only GitHub token kept in ~/.nc-github-token (permissions 600).
# Safety: a version with missing files or JavaScript syntax errors is refused (nothing is changed).

HOME_DIR=${NC_HOME:-/home/nadine14}
GIT_BASE=${NC_GIT_BASE:-https://github.com}   # only changed for local testing
LOG=$HOME_DIR/logs/autodeploy.log
BACKUPS=$HOME_DIR/deploy-backups
SELF=$HOME_DIR/bin/nc-autodeploy.sh
NADINE_REPO=$HOME_DIR/repos/nc-nadinecloud   # where deploy_site clones the Nadine Cloud deploy branch

log() { echo "$(date -u +%FT%TZ) $*" >> "$LOG"; }

mkdir -p "$HOME_DIR/repos" "$BACKUPS" "$HOME_DIR/logs"

# only one run at a time
exec 9>"$HOME_DIR/.nc-autodeploy.lock"
command -v flock >/dev/null 2>&1 && { flock -n 9 || exit 0; }

# keep the log from growing forever
[ -f "$LOG" ] && [ "$(wc -c < "$LOG")" -gt 2000000 ] && tail -n 2000 "$LOG" > "$LOG.tmp" && mv -f "$LOG.tmp" "$LOG"

# ---------- deploy one site (settings come from the sourced conf) ----------
deploy_site() {
  local CLONE="$HOME_DIR/repos/nc-$NAME" STATE="$HOME_DIR/.nc-deployed-$NAME" URL AUTH=() TOKEN NEW CUR f d m TS OLDLOCK NEWLOCK
  URL=${REPO_URL:-$GIT_BASE/$REPO_PATH.git}
  if [ "$PRIVATE" = "1" ]; then
    TOKEN=$(cat "$HOME_DIR/.nc-github-token" 2>/dev/null | tr -d '[:space:]')
    [ -z "$TOKEN" ] && { log "[$NAME] skipped: no GitHub token yet (~/.nc-github-token)"; return 0; }
    AUTH=(-c "http.extraHeader=Authorization: Basic $(printf 'x-access-token:%s' "$TOKEN" | base64 | tr -d '\n')")
  fi

  if [ ! -d "$CLONE/.git" ]; then
    git "${AUTH[@]}" clone -q --branch "$BRANCH" --single-branch "$URL" "$CLONE" >> "$LOG" 2>&1 || { log "[$NAME] clone failed (branch '$BRANCH' not published yet, or no access)"; return 0; }
    log "[$NAME] cloned $BRANCH"
  fi
  cd "$CLONE" || return 1
  git "${AUTH[@]}" fetch -q origin "+$BRANCH:refs/remotes/origin/$BRANCH" >> "$LOG" 2>&1 || return 0
  NEW=$(git rev-parse "origin/$BRANCH" 2>/dev/null); [ -z "$NEW" ] && return 0
  CUR=$(cat "$STATE" 2>/dev/null); [ "$NEW" = "$CUR" ] && return 0

  log "[$NAME] new version ${NEW:0:9} - checking it"
  git checkout -q -B "$BRANCH" "origin/$BRANCH" >> "$LOG" 2>&1; git reset -q --hard "origin/$BRANCH"

  # ---- refuse a broken version ----
  for f in $REQUIRED; do [ -e "$CLONE/$f" ] || { log "[$NAME] ABORT: $f is missing in ${NEW:0:9} - nothing was changed"; return 1; }; done
  for f in $CHECK_JS; do "$NODE" --check "$CLONE/$f" >> "$LOG" 2>&1 || { log "[$NAME] ABORT: $f has a syntax error in ${NEW:0:9} - nothing was changed"; return 1; }; done

  # ---- back up the code that is about to be replaced ----
  TS=$(date -u +%Y%m%dT%H%M%SZ)
  ( cd "$APP_DIR" && tar czf "$BACKUPS/$NAME-$TS.tgz" $BACKUP_PATHS 2>/dev/null )
  ls -1t "$BACKUPS/$NAME"-*.tgz 2>/dev/null | tail -n +11 | xargs -r rm -f

  # ---- install ----
  OLDLOCK=$(md5sum "$NPM_DIR/$LOCK_FILE" 2>/dev/null | cut -d' ' -f1)
  for f in $SYNC_FILES; do mkdir -p "$APP_DIR/$(dirname "$f")"; cp -f "$CLONE/$f" "$APP_DIR/$f"; done
  for d in $SYNC_DIRS_REPLACE; do            # replace a whole folder (swap, so it is never half-copied)
    rm -rf "$APP_DIR/$d.new"; mkdir -p "$(dirname "$APP_DIR/$d")"
    cp -R "$CLONE/$d" "$APP_DIR/$d.new" && { rm -rf "$APP_DIR/$d.old"; [ -e "$APP_DIR/$d" ] && mv "$APP_DIR/$d" "$APP_DIR/$d.old"; mv "$APP_DIR/$d.new" "$APP_DIR/$d"; rm -rf "$APP_DIR/$d.old"; }
  done
  for m in $SYNC_MAP; do mkdir -p "${m#*:}"; cp -Rf "$CLONE/${m%%:*}/." "${m#*:}/"; done   # add/overwrite only

  NEWLOCK=$(md5sum "$NPM_DIR/$LOCK_FILE" 2>/dev/null | cut -d' ' -f1)
  if [ "$OLDLOCK" != "$NEWLOCK" ]; then
    log "[$NAME] lock file changed - running npm install"
    ( source "$VENV" && cd "$NPM_DIR" && npm install --omit=dev --no-audit --no-fund ) >> "$LOG" 2>&1 || log "[$NAME] WARNING: npm install reported a problem"
  fi

  mkdir -p "$(dirname "$RESTART_FILE")"; touch "$RESTART_FILE"      # Passenger restarts the app
  echo "$NEW" > "$STATE"
  log "[$NAME] DEPLOYED ${NEW:0:9} $(cat "$CLONE/VERSION" 2>/dev/null)"
}

# ---------- 1) the Nadine Cloud site (built in; also provides this script and the other sites' settings) ----------
(
  NAME=nadinecloud; REPO_PATH=nadineomnitradinglimited-cmyk/nadine-cloud-website; BRANCH=deploy; PRIVATE=0
  APP_DIR=$HOME_DIR/nodeapp; NPM_DIR=$APP_DIR; LOCK_FILE=package-lock.json
  NODE=$HOME_DIR/nodevenv/nodeapp/24/bin/node; VENV=$HOME_DIR/nodevenv/nodeapp/24/bin/activate
  SYNC_FILES="server.js auth.js ai-builder.js chat.js contact.js db.js email.js ftp-deploy.js namecheap.js namecom.js payments.js pricing.js receipt.js registrar.js reminders.js whm.js package.json package-lock.json"
  SYNC_DIRS_REPLACE=""; SYNC_MAP="site:$HOME_DIR/public_html"
  CHECK_JS="server.js auth.js payments.js pricing.js registrar.js namecom.js reminders.js"
  REQUIRED="server.js payments.js pricing.js package.json package-lock.json site/index.html"
  BACKUP_PATHS="$SYNC_FILES"; RESTART_FILE=$APP_DIR/tmp/restart.txt
  deploy_site
)

# ---------- 2) the other sites: settings files come with the Nadine Cloud deploy branch ----------
if [ -d "$NADINE_REPO/sites.d" ]; then
  for conf in "$NADINE_REPO"/sites.d/*.conf; do
    [ -f "$conf" ] || continue
    ( HOME_DIR=$HOME_DIR; source "$conf" && deploy_site )
  done
fi

# ---------- 3) update this script from GitHub (only if the new one parses) ----------
if [ -f "$NADINE_REPO/nc-autodeploy.sh" ] && ! cmp -s "$NADINE_REPO/nc-autodeploy.sh" "$SELF"; then
  if bash -n "$NADINE_REPO/nc-autodeploy.sh" 2>/dev/null; then
    cp -f "$NADINE_REPO/nc-autodeploy.sh" "$SELF.new" && chmod 755 "$SELF.new" && mv -f "$SELF.new" "$SELF" && log "updated nc-autodeploy.sh from GitHub"
  else
    log "WARNING: the new nc-autodeploy.sh on GitHub does not parse - keeping the current one"
  fi
fi
exit 0
