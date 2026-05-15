#!/bin/sh
set -e

echo "🚀 Starting application..."

# Run migrations
echo "🔄 Running database migrations..."
node dist/scripts/migrate.js || {
  echo "❌ Migration failed"
  exit 1
}
echo "✅ Migrations completed"

# Start the application (OTel preload must run before app imports)
echo "🎯 Starting server..."
exec node --import ./dist/src/modules/shared/observability/instrumentation-preload.js dist/src/server.js
