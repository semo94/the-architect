import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { env } from '../config/env.js';
import * as schema from './schema.js';

// Create Neon HTTP client
const sql = neon(env.DATABASE_URL);

// Create Drizzle instance
export const db = drizzle(sql, { schema });
