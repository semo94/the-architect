import 'dotenv/config';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

async function runMigrations() {
  console.log('🔄 Running migrations...');

  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  try {
    await migrate(db, {
      migrationsFolder: './src/modules/shared/database/migrations',
    });

    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigrations();
