async function runMigrations() {
  console.log('🔄 Running migrations...');

  const databaseUrl = process.env.DATABASE_URL!;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  // Detect connection type based on URL
  const isNeon = databaseUrl.includes('neon.tech') || databaseUrl.includes('?sslmode=require');

  try {
    if (isNeon) {
      console.log('🌐 Detected Neon database, using HTTP driver...');
      const { migrate } = await import('drizzle-orm/neon-http/migrator');
      const { neon } = await import('@neondatabase/serverless');
      const { drizzle } = await import('drizzle-orm/neon-http');

      const sql = neon(databaseUrl);
      const db = drizzle(sql);

      await migrate(db, {
        migrationsFolder: './src/modules/shared/database/migrations',
      });
    } else {
      console.log('🐘 Detected PostgreSQL database, using node-postgres driver...');
      const { migrate } = await import('drizzle-orm/postgres-js/migrator');
      const postgres = await import('postgres');
      const { drizzle } = await import('drizzle-orm/postgres-js');

      const sql = postgres.default(databaseUrl, { max: 1 });
      const db = drizzle(sql);

      await migrate(db, {
        migrationsFolder: './src/modules/shared/database/migrations',
      });

      await sql.end();
    }

    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigrations();
