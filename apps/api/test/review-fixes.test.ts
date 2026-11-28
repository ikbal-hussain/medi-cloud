import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env';
import { Prisma } from '../src/generated/prisma/client';
import { isDatabaseUnavailable } from '../src/middleware/error-handler';
import { isLocalDatabase } from '../scripts/guard';
import { api, as, hospital, PASSWORD } from './helpers';

// Each case here guards a finding from the review of PR #4.
const base = { DATABASE_URL: 'postgresql://x@localhost/db' };

describe('configuration', () => {
  it('reads a whole-number JWT_EXPIRES_IN as seconds and refuses one the token library cannot use', () => {
    expect(loadEnv({ ...base, JWT_EXPIRES_IN: '3600' }).JWT_EXPIRES_IN).toBe(3600);
    expect(loadEnv({ ...base, JWT_EXPIRES_IN: '12h' }).JWT_EXPIRES_IN).toBe('12h');
    expect(() => loadEnv({ ...base, JWT_EXPIRES_IN: 'forever' })).toThrow(/JWT_EXPIRES_IN must be seconds/);
  });

  it('trusts no proxy by default, one on Vercel, or what TRUST_PROXY says', () => {
    expect(loadEnv(base).TRUST_PROXY).toBe(0);
    expect(loadEnv({ ...base, VERCEL: '1', JWT_SECRET: 's' }).TRUST_PROXY).toBe(1);
    expect(loadEnv({ ...base, TRUST_PROXY: '2' }).TRUST_PROXY).toBe(2);
  });

  it('treats IPv6 localhost as a local database for the seed guard', () => {
    expect(isLocalDatabase('postgresql://u:p@[::1]:5432/db')).toBe(true);
    expect(isLocalDatabase('postgresql://u:p@ep-cool-1.ap-south-1.aws.neon.tech/db')).toBe(false);
  });
});

describe('requests and errors', () => {
  it('keeps the 4xx status of requests Express or the body parser rejected', async () => {
    const city = await hospital('City');
    const badParam = await api().get('/api/patients/%E0%A4%A').set(as(city.admin.id));
    expect(badParam.status).toBe(400);
    expect(badParam.body.code).toBe('VALIDATION_ERROR');

    const badCharset = await api()
      .post('/api/auth/login')
      .set('Content-Type', 'application/json; charset=latin1')
      .send('{"email":"a@b.co","password":"x"}');
    expect(badCharset.status).toBe(415);
  });

  it('treats "too many connections" (P2037) as a retryable outage', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Too many database connections opened', {
      code: 'P2037',
      clientVersion: '7',
    });
    expect(isDatabaseUnavailable(err)).toBe(true);
  });

  it('accepts form-encoded bodies', async () => {
    const city = await hospital('City');
    const res = await api().post('/api/auth/login').type('form').send({ email: city.doctor.email, password: PASSWORD });
    expect(res.status).toBe(200);
  });

  it('accepts the Bearer scheme in any case', async () => {
    const city = await hospital('City');
    const token = as(city.doctor.id).Authorization.split(' ')[1];
    expect((await api().get('/api/auth/me').set('Authorization', `bearer ${token}`)).status).toBe(200);
  });

  it("can't dodge the sign-in limit by faking X-Forwarded-For when no proxy is trusted", async () => {
    const direct = api({ authRateLimit: 2, trustProxy: 0 });
    const body = { email: 'nobody@x.test', password: 'whatever' };
    for (const ip of ['1.1.1.1', '2.2.2.2'])
      expect((await direct.post('/api/auth/login').set('X-Forwarded-For', ip).send(body)).status).toBe(401);
    expect((await direct.post('/api/auth/login').set('X-Forwarded-For', '3.3.3.3').send(body)).status).toBe(429);

    // Behind a trusted proxy, the forwarded address is the client's, so each client has its own limit.
    const proxied = api({ authRateLimit: 2, trustProxy: 1 });
    for (const ip of ['1.1.1.1', '2.2.2.2', '3.3.3.3'])
      expect((await proxied.post('/api/auth/login').set('X-Forwarded-For', ip).send(body)).status).toBe(401);
  });
});
