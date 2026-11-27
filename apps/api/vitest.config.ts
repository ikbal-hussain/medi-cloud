import { defineConfig } from 'vitest/config';

// API tests run against a real PostgreSQL database (TEST_DATABASE_URL, default: the Docker Compose one),
// one test file at a time because they share it.
const testDatabaseUrl = process.env['TEST_DATABASE_URL'] ?? 'postgresql://medi:medi@localhost:5432/medi_cloud_test';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup.ts'],
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: 'test-only-secret',
      AUTH_RATE_LIMIT: '0',
      CORS_ORIGINS: 'https://medi-cloud-app.netlify.app,https://deploy-preview-*--medi-cloud-app.netlify.app',
    },
  },
});
