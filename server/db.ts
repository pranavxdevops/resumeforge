import 'dotenv/config';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as embeddedDrizzle } from 'drizzle-orm/pglite';
import { drizzle as postgresDrizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as schema from './schema';

if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL)
  throw new Error('DATABASE_URL is required in production');
const embeddedPath =
  process.env.TEST_DATABASE === 'true' ? undefined : path.resolve('.data/postgres');
if (!process.env.DATABASE_URL && embeddedPath)
  await fs.mkdir(path.dirname(embeddedPath), { recursive: true });
const client = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 })
  : new PGlite(embeddedPath);
export const db = (
  client instanceof PGlite
    ? embeddedDrizzle(client, { schema })
    : postgresDrizzle(client, { schema })
) as ReturnType<typeof embeddedDrizzle<typeof schema>>;
export async function migrate() {
  const sql = await fs.readFile(path.resolve('server/migrations/001_initial.sql'), 'utf8');
  if (client instanceof PGlite) await client.exec(sql);
  else {
    const connection = await client.connect();
    try {
      await connection.query('BEGIN');
      await connection.query('SELECT pg_advisory_xact_lock(72637671)');
      await connection.query(sql);
      await connection.query('COMMIT');
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }
}
export async function closeDatabase() {
  if (client instanceof PGlite) await client.close();
  else await client.end();
}
