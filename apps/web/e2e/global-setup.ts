import { execSync } from 'node:child_process';
import pg from 'pg';
import { E2E_DATABASE_URL } from '../playwright.config';

/** A fresh e2e database: created if missing, migrated, and loaded with the demo data. */
export default async function globalSetup() {
  const name = new URL(E2E_DATABASE_URL).pathname.slice(1);
  if (!/^[a-z0-9_]+$/i.test(name)) throw new Error(`Unexpected e2e database name: ${name}`);
  const admin = new URL(E2E_DATABASE_URL);
  admin.pathname = '/postgres';
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (!rowCount) await client.query(`CREATE DATABASE "${name}"`);
  } finally {
    await client.end();
  }
  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL };
  execSync('npm run -s db:deploy -w @medi-cloud/api', { cwd: '../..', env, stdio: 'pipe' });
  execSync('npm run -s seed -w @medi-cloud/api', { cwd: '../..', env, stdio: 'pipe' });
}
