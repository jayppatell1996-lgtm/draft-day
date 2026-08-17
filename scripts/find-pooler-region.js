/**
 * Find working Supabase Session pooler region for DATABASE_URL on Vercel.
 * Usage: node --env-file=.env.local scripts/find-pooler-region.js
 */
const { Client } = require('pg');

const password = process.env.DB_PASSWORD || process.argv[2];
const ref = 'tdtqqjzkhcrxkxhvjofc';

if (!password) {
  console.error('Set DB_PASSWORD in env or pass as first arg');
  process.exit(1);
}

const regions = [
  'us-east-1',
  'us-west-1',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'ap-southeast-1',
  'ap-northeast-1',
  'ap-south-1',
  'ca-central-1',
  'sa-east-1',
];

async function main() {
  for (const region of regions) {
    const url = `postgresql://postgres.${ref}:${password}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
    const client = new Client({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    try {
      await client.connect();
      console.log('WORKING_POOLER_URL=' + url);
      console.log('REGION=' + region);
      await client.end();
      return;
    } catch (err) {
      console.log(`[${region}] ${err.message.split('\n')[0]}`);
    }
  }
  console.error('No pooler region matched. Copy Session mode URI from Supabase Dashboard.');
  process.exit(1);
}

main();
