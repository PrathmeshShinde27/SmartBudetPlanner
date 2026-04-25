import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing in server/.env');
}

if (databaseUrl === 'memory://dev') {
  throw new Error('DATABASE_URL is still set to memory://dev. Use a real PostgreSQL URL.');
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
});

try {
  const result = await pool.query('select current_database() as database, current_user as user, version() as version');
  console.log('Database connection OK');
  console.log(`Database: ${result.rows[0].database}`);
  console.log(`User: ${result.rows[0].user}`);
  console.log(result.rows[0].version.split('\n')[0]);
} finally {
  await pool.end();
}
