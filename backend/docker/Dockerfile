# Multi-stage build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Copy package files and install production deps
COPY package*.json ./
RUN npm install --omit=dev

# Copy built application (includes compiled scripts) and migrations
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/modules/shared/database/migrations ./src/modules/shared/database/migrations
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Make start script executable (copy from source, not from dist)
COPY --from=builder /app/scripts/start.sh ./start.sh
RUN chmod +x ./start.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Ensure nodejs user owns the files
RUN chown -R nodejs:nodejs /app

USER nodejs

# Use Render HTTP health checks only — avoid spawning a second Node process every 30s on 512MB instances.

EXPOSE 3000

CMD ["./start.sh"]
