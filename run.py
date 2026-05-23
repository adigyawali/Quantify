"""
WSGI entrypoint for gunicorn.

`startup.sh` (used by Azure App Service) calls `python flask-server/init_db.py`
before launching gunicorn against `run:app`. Keeping the bootstrap inside
that module — not at import time — means a broken DB path doesn't take down
the whole process before logs can flush.
"""
import os
import sys

# Make the flask-server package importable when this file is the working dir.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "flask-server"))

from app import create_app  # noqa: E402

app = create_app()


if __name__ == "__main__":
    # Local dev only — production uses gunicorn via startup.sh.
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
