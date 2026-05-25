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

# Bake the FinBERT-tone weights into the image at /opt/hf-cache.
# /home is a volume mount on Azure App Service, so anything cached there
# at build time is invisible at runtime — we deliberately use /opt instead.
ENV HF_HOME=/opt/hf-cache \
    TRANSFORMERS_CACHE=/opt/hf-cache/transformers \
    HF_HUB_DISABLE_TELEMETRY=1
RUN mkdir -p "$HF_HOME" && \
    python -c "from transformers import AutoTokenizer, AutoModelForSequenceClassification; \
m='yiyanghkust/finbert-tone'; \
AutoTokenizer.from_pretrained(m); \
AutoModelForSequenceClassification.from_pretrained(m)"

# App code
COPY . .

RUN chmod +x startup.sh

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    DATABASE_FILE_PATH=/home/site/data/userInfo.db

EXPOSE 8000

# Note: no HEALTHCHECK — Azure App Service has its own warmup probe (hits
# /robots933456.txt then user traffic) and a baked-in HEALTHCHECK can race
# with cold-start and trigger ContainerCreateFailure.

CMD ["./startup.sh"]
