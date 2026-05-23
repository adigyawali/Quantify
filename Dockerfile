# Tickr — production container.
# Used for Azure App Service (Web App for Containers) and local docker-compose.
FROM python:3.12-slim

# System deps for sqlite + numpy/torch wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first to leverage layer caching.
COPY flask-server/requirements.txt ./flask-server/requirements.txt
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY . .

RUN chmod +x startup.sh

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    DATABASE_FILE_PATH=/home/site/data/userInfo.db \
    HF_HOME=/home/.cache/huggingface

EXPOSE 8000

# Healthcheck — Azure's load balancer can also use /healthz.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT}/healthz || exit 1

CMD ["./startup.sh"]
