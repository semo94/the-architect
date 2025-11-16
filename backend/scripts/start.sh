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

# Start the application
echo "🎯 Starting server..."
exec node dist/src/server.js
