import { execFileSync } from 'node:child_process';
import pg from 'pg';

/** Creates the test database if needed and applies every migration to it, once per test run. */
export default async function setup() {
  const url = process.env['TEST_DATABASE_URL'] ?? 'postgresql://medi:medi@localhost:5432/medi_cloud_test';
  const target = new URL(url);
  const name = target.pathname.slice(1);
  if (!/^[a-z0-9_]+$/i.test(name)) throw new Error(`Unexpected test database name: ${name}`);

  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (!rowCount) await client.query(`CREATE DATABASE "${name}"`);
  } finally {
    await client.end();
  }

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
