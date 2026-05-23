#!/usr/bin/env bash
#
# Tickr — one-shot Azure App Service redeploy.
#
# Run from anywhere; the script jumps to the repo root first.
# Sources .azureenv to know which webapp/RG to deploy to.

set -euo pipefail

# Find the repo root regardless of where this script was invoked from.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

# Load APP_NAME / RG / PLAN / LOCATION / RUNTIME
if [[ ! -f .azureenv ]]; then
  echo "✗ .azureenv not found in $REPO_ROOT — create it first." >&2
  exit 1
fi
# shellcheck disable=SC1091
source .azureenv

if [[ -z "${APP_NAME:-}" || -z "${RG:-}" ]]; then
  echo "✗ APP_NAME or RG not set in .azureenv" >&2
  exit 1
fi

echo "▸ Deploying to $APP_NAME (resource group: $RG)"

# 1. Build the React app
echo "▸ Building React client…"
( cd client && CI=true npm run build )

# 2. Stage + commit anything new (skipped if nothing changed)
echo "▸ Committing changes…"
git add -A
if git diff --cached --quiet; then
  echo "  nothing to commit"
else
  git commit -m "Deploy: $(date +%Y-%m-%d_%H-%M)"
fi

# 3. Push to Azure
echo "▸ Pushing to Azure App Service…"
az webapp up --name "$APP_NAME" --resource-group "$RG"

echo
echo "✓ Done — https://${APP_NAME}.azurewebsites.net"
