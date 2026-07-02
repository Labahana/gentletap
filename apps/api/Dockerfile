FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
COPY gentletap ./gentletap
COPY alembic ./alembic
COPY alembic.ini ./

RUN pip install --upgrade pip \
    && pip install .

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Run as a non-root user. The celery beat schedule lives in /var/lib/celery
# (a named volume); it must be owned by this user so beat can write to it.
RUN useradd -r -u 1000 -m -d /home/appuser appuser \
    && mkdir -p /var/lib/celery \
    && chown -R appuser:appuser /var/lib/celery /app
USER appuser

EXPOSE 8000

ENTRYPOINT ["/docker-entrypoint.sh"]
