import { describe, expect, it } from 'vitest';
import { originAllowed } from '../src/app';
import { isDatabaseUnavailable } from '../src/middleware/error-handler';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { api } from './helpers';

describe('platform', () => {
  it('health answers without auth', async () => {
    expect((await api().get('/api/health')).body).toEqual({ status: 'OK', message: 'Server is running' });
    expect((await api().get('/api/health/db')).body).toEqual({ status: 'OK', database: 'up' });
  });

  it('answers unknown routes and bad JSON with a code', async () => {
    const missing = await api().get('/api/nope');
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: 'Route not found', code: 'NOT_FOUND' });

    const bad = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('INVALID_JSON');
  });

  it('sends security headers and hides Express', async () => {
    const res = await api().get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('allows configured origins, deploy previews by pattern, and localhost in development', () => {
    const allowed = originAllowed(
      ['https://medi-cloud-app.netlify.app', 'https://deploy-preview-*--medi-cloud-app.netlify.app'],
      true,
    );
    expect(allowed('https://medi-cloud-app.netlify.app')).toBe(true);
    expect(allowed('https://deploy-preview-42--medi-cloud-app.netlify.app')).toBe(true);
    expect(allowed('http://localhost:5173')).toBe(true);
    expect(allowed('https://evil.example')).toBe(false);
    // `*` stays inside one host label: no dots, so another domain can't slip in.
    expect(allowed('https://deploy-preview-1.evil.example--medi-cloud-app.netlify.app')).toBe(false);
    expect(originAllowed(['https://medi-cloud-app.netlify.app'], false)('http://localhost:5173')).toBe(false);
  });

  it('reflects CORS only for allowed origins', async () => {
    const ok = await api().get('/api/health').set('Origin', 'https://deploy-preview-7--medi-cloud-app.netlify.app');
    expect(ok.headers['access-control-allow-origin']).toBe('https://deploy-preview-7--medi-cloud-app.netlify.app');
    const no = await api().get('/api/health').set('Origin', 'https://evil.example');
    expect(no.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('classifies an unreachable database as unavailable (503), not as a bug', async () => {
    const offline = new PrismaClient({
      adapter: new PrismaPg({ connectionString: 'postgresql://x:y@127.0.0.1:1/none', connectionTimeoutMillis: 1000 }),
    });
    const err = await offline.tenant.count().catch((e: unknown) => e);
    expect(isDatabaseUnavailable(err)).toBe(true);
    expect(isDatabaseUnavailable(new Error('boom'))).toBe(false);
    await offline.$disconnect();
  });

  it('rate-limits sign-in attempts when configured', async () => {
    const app = api({ authRateLimit: 2 });
    const body = { email: 'nobody@x.test', password: 'whatever' };
    expect((await app.post('/api/auth/login').send(body)).status).toBe(401);
    expect((await app.post('/api/auth/login').send(body)).status).toBe(401);
    const third = await app.post('/api/auth/login').send(body);
    expect(third.status).toBe(429);
    expect(third.body.code).toBe('RATE_LIMITED');
  });
});

describe('logging', () => {
  it('never writes tokens or passwords to the log', async () => {
    const { createLogger } = await import('../src/lib/logger');
    const lines: string[] = [];
    const log = createLogger({ write: (line: string) => void lines.push(line) });
    log.level = 'info';
    log.info(
      {
        req: { headers: { authorization: 'Bearer secret-token' } },
        user: { password: 'hunter2', passwordHash: '$2b$10$abc' },
        token: 'tok-123',
      },
      'probe',
    );
    const written = lines.join('');
    expect(written).toContain('probe');
    expect(written).not.toMatch(/secret-token|hunter2|\$2b\$10|tok-123/);
  });
});
