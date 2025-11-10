import 'dotenv/config';
import { db } from '../src/modules/shared/database/client.js';
import { users } from '../src/modules/shared/database/schema.js';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Add seed data here if needed
    // Example:
    // await db.insert(users).values({
    //   githubId: 'test-user',
    //   username: 'testuser',
    //   email: 'test@example.com',
    //   displayName: 'Test User',
    // });

    console.log('✅ Seeding completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
