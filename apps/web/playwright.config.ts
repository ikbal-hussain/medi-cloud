import { defineConfig } from '@playwright/test';

// End-to-end tests: the real web app against the real API and a PostgreSQL database of its own
// (medi_cloud_e2e), reset to the demo data before the run. Ports are chosen so they don't clash with `npm run dev`.
const API_PORT = 3300;
const WEB_PORT = 5300;
export const E2E_DATABASE_URL =
  process.env['E2E_DATABASE_URL'] ?? 'postgresql://medi:medi@localhost:5432/medi_cloud_e2e';
export const API_URL = `http://localhost:${API_PORT}/api`;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    // Playwright's own Chromium (`npx playwright install chromium`); PW_CHANNEL=chrome uses an installed Chrome instead.
    channel: process.env['PW_CHANNEL'] || undefined,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev -w @medi-cloud/api',
      cwd: '../..',
      url: `${API_URL}/health`,
      env: {
        PORT: String(API_PORT),
        DATABASE_URL: E2E_DATABASE_URL,
        JWT_SECRET: 'e2e-only-secret',
        AUTH_RATE_LIMIT: '0',
        LOG_LEVEL: 'warn',
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npm run dev -w @medi-cloud/web -- --port ${WEB_PORT} --strictPort`,
      cwd: '../..',
      url: `http://localhost:${WEB_PORT}`,
      env: { VITE_API_URL: API_URL },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
