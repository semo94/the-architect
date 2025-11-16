import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/modules/shared/database/schema.ts',
  out: './src/modules/shared/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
