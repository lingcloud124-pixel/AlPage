#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/7] Check required files"
test -f ".env" || { echo "Missing .env"; exit 1; }
test -f "server/dist/index.js" || { echo "Missing server/dist/index.js. Run npm run build first."; exit 1; }

echo "[2/7] Check required env keys"
for key in ADMIN_PASSWORD EKP_BASE_URL EKP_SSO_USER EKP_SSO_PASS SCREENSHOT_BASE_URL EXPORT_PREVIEW_MODE; do
  if ! grep -Eq "^${key}=" .env; then
    echo "Missing env key: ${key}"
    exit 1
  fi
done

echo "[3/7] Type checks"
npm run test:types >/dev/null

echo "[4/7] Health endpoint"
curl -fsS http://127.0.0.1:3001/api/health >/dev/null

echo "[5/7] Admin page"
curl -fsS http://127.0.0.1:3001/admin >/dev/null

echo "[6/7] Screenshot base URL reachable"
SCREENSHOT_BASE_URL="$(grep '^SCREENSHOT_BASE_URL=' .env | sed 's/^SCREENSHOT_BASE_URL=//')"
curl -kfsS "$SCREENSHOT_BASE_URL" >/dev/null
EXPORT_PREVIEW_MODE="$(grep '^EXPORT_PREVIEW_MODE=' .env | sed 's/^EXPORT_PREVIEW_MODE=//')"
case "$EXPORT_PREVIEW_MODE" in
  auto|service|local) ;;
  *) echo "Invalid EXPORT_PREVIEW_MODE: $EXPORT_PREVIEW_MODE"; exit 1 ;;
esac

echo "[7/7] Writable directories"
mkdir -p data logs output/service-jobs
test -w data || { echo "data not writable"; exit 1; }
test -w logs || { echo "logs not writable"; exit 1; }
test -w output/service-jobs || { echo "output/service-jobs not writable"; exit 1; }

echo "Production checks passed"
