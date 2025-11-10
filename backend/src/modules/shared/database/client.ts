import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { neon } from '@neondatabase/serverless';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from './schema.js';

// Detect connection type based on DATABASE_URL
const isNeon = env.DATABASE_URL.includes('neon.tech') || env.DATABASE_URL.includes('?sslmode=require');

// Create database client based on connection type
export const db = isNeon
  ? (() => {
      const sql = neon(env.DATABASE_URL);
      return drizzleNeon(sql, { schema });
    })()
  : (() => {
      const sql = postgres(env.DATABASE_URL);
      return drizzlePostgres(sql, { schema });
    })();
