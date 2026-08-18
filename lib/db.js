import pg from 'pg';

const { Pool } = pg;

const globalForPg = globalThis;

function parsePoolMax() {
  const fromEnv = Number(process.env.PG_POOL_MAX);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  // Supabase session pooler free tier caps backend connections (~15 total).
  // Keep per-process pools small, especially on Vercel serverless.
  return process.env.VERCEL ? 2 : 4;
}

export function getPool() {
  if (!globalForPg.pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }

    globalForPg.pgPool = new Pool({
      connectionString,
      max: parsePoolMax(),
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    });

    globalForPg.pgPool.on('error', (err) => {
      console.error('Unexpected Postgres pool error:', err);
    });
  }

  return globalForPg.pgPool;
}
