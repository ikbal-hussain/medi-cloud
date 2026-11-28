#!/bin/sh
# Vercel's build step (vercel.json): bundle the API, then, on production deploys only, apply database migrations.
# Migrations need the direct connection: the pooled one (PgBouncer) can't hold the lock `migrate deploy` takes.
# They run before the new deployment is promoted, so the old one briefly serves the new schema: keep every
# migration backward-compatible (add first, remove in a later release). See README → Deploying.
set -eu

npm run build

if [ "${VERCEL_ENV:-}" = production ]; then
  : "${DATABASE_URL_UNPOOLED:?must be set to the direct (unpooled) database URL, for migrations}"
  echo "Applying database migrations"
  DATABASE_URL="$DATABASE_URL_UNPOOLED" npx prisma migrate deploy
else
  echo "Skipping database migrations (VERCEL_ENV=${VERCEL_ENV:-unset})"
fi
