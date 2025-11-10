#!/bin/sh
set -e

echo "🚀 Starting application..."

# Run migrations if in production
if [ "$NODE_ENV" = "production" ]; then
  echo "🔄 Running database migrations..."
  node dist/../scripts/migrate.js || {
    echo "❌ Migration failed"
    exit 1
  }
  echo "✅ Migrations completed"
fi

# Start the application
echo "🎯 Starting server..."
exec node dist/server.js
