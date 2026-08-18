#!/usr/bin/env bash
# Redeploys sciweek from /opt/sciweek: pulls latest master, rebuilds the
# frontend (Apache serves the static dist/ build directly, so a stale build
# means the SPA doesn't reflect new commits even though the backend does),
# and restarts gunicorn (Apache proxies /api/ to it, so backend code changes
# need a process restart to take effect — reverse-proxying alone doesn't
# reload Python).
set -euo pipefail

APP_DIR="/opt/sciweek"
cd "$APP_DIR"

echo "==> git pull"
git pull --ff-only origin master

echo "==> backend deps"
"$APP_DIR/env/bin/pip" install -q -r requirements.txt

echo "==> django check"
"$APP_DIR/env/bin/python3" "$APP_DIR/manage.py" check

echo "==> frontend build"
npm --prefix frontend install
npm --prefix frontend run build

echo "==> restart backend"
sudo systemctl restart sciweek.service
sudo systemctl status sciweek.service --no-pager -l | head -10

echo "==> done"
