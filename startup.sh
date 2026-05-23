#!/usr/bin/env bash
#
# Azure App Service entrypoint.
#
# Azure injects $PORT for HTTP traffic. We bind there. Database init is
# idempotent and lives next to the app; we run it on every boot so fresh
# slots get a working schema.

set -euo pipefail

# Persistent storage on Azure Linux App Service is mounted at /home.
# Default the DB and HuggingFace cache to live there so they survive redeploys.
export DATABASE_FILE_PATH="${DATABASE_FILE_PATH:-/home/site/data/userInfo.db}"
export HF_HOME="${HF_HOME:-/home/.cache/huggingface}"
export TRANSFORMERS_CACHE="${TRANSFORMERS_CACHE:-$HF_HOME/transformers}"

mkdir -p "$(dirname "$DATABASE_FILE_PATH")" "$HF_HOME" "$TRANSFORMERS_CACHE"

cd "$(dirname "$0")"

echo "[startup] Initializing database at $DATABASE_FILE_PATH"
python flask-server/init_db.py

# Azure's front-door has a 230s idle timeout; keep gunicorn under that.
# One worker is appropriate on F1/B1 — the FinBERT model is held in-process
# and we'd OOM on a second copy.
PORT="${PORT:-8000}"
echo "[startup] Launching gunicorn on 0.0.0.0:${PORT}"
exec gunicorn \
  --bind "0.0.0.0:${PORT}" \
  --workers 1 \
  --threads 4 \
  --worker-class gthread \
  --timeout 180 \
  --graceful-timeout 30 \
  --access-logfile - \
  --error-logfile - \
  "run:app"
