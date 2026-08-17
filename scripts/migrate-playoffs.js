/**
 * Applies supabase/migrations/20250817_playoffs.sql
 * Usage: node --env-file=.env.local scripts/migrate-playoffs.js
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: Set DATABASE_URL in .env.local');
    process.exit(1);
  }

  const migrationPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20250817_playoffs.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  const client = new Client({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  await client.query(sql);
  await client.end();

  console.log('Migration OK — rounds.playoff_stage is ready.');
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
