import { describe, expect, it } from 'vitest';
import { signToken } from '../src/lib/jwt';
import { prisma } from '../src/lib/prisma';
import { api, as, hospital, PASSWORD } from './helpers';

const register = {
  hospitalName: 'Sunrise Clinic',
  adminEmail: 'Owner@Sunrise.test',
  adminName: 'Dr. Owner',
  password: 'long-enough-1',
};

describe('auth', () => {
  it('registers a hospital with its first admin and returns a working token', async () => {
    const res = await api().post('/api/auth/register').send(register);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'owner@sunrise.test', role: 'HOSPITAL_ADMIN' });
    expect(res.body.tenant.name).toBe('Sunrise Clinic');
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const me = await api().get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe(res.body.user.id);
  });

  it('refuses a taken email (any case) without leaving an empty hospital behind', async () => {
    await api().post('/api/auth/register').send(register);
    const again = await api()
      .post('/api/auth/register')
      .send({ ...register, adminEmail: 'OWNER@sunrise.test', hospitalName: 'Copy' });
    expect(again.status).toBe(409);
    expect(again.body).toEqual({ error: 'Email already registered', code: 'EMAIL_TAKEN' });
    expect(await prisma.tenant.count()).toBe(1);
  });

  it('validates registration and reports each field', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ hospitalName: 'X', adminEmail: 'nope', adminName: '', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details.map((d: { path: string }) => d.path).sort()).toEqual([
      'adminEmail',
      'adminName',
      'hospitalName',
      'password',
    ]);
    expect(await prisma.tenant.count()).toBe(0);
  });

  it('logs in with any email case and rejects wrong passwords and unknown emails alike', async () => {
    const { doctor } = await hospital('City');
    const ok = await api().post('/api/auth/login').send({ email: doctor.email.toUpperCase(), password: PASSWORD });
    expect(ok.status).toBe(200);
    expect(ok.body.user.id).toBe(doctor.id);

    for (const body of [
      { email: doctor.email, password: 'wrong' },
      { email: 'ghost@city.test', password: PASSWORD },
    ]) {
      const res = await api().post('/api/auth/login').send(body);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }
  });

  it('treats query operators in the email as invalid input, not a lookup', async () => {
    await hospital('City');
    const res = await api()
      .post('/api/auth/login')
      .send({ email: { $regex: '^a' }, password: PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('tells the three token failures apart (the web app forgets the token on these)', async () => {
    const none = await api().get('/api/auth/me');
    expect(none.body).toEqual({ error: 'No token provided', code: 'NO_TOKEN' });

    const garbage = await api().get('/api/auth/me').set('Authorization', 'Bearer not.a.token');
    expect(garbage.body).toEqual({ error: 'Invalid token', code: 'INVALID_TOKEN' });

    // A token from the old MongoDB API: valid signature, but an ObjectId instead of a UUID.
    const legacy = await api()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signToken({ userId: '6745a1b2c3d4e5f601234567' })}`);
    expect(legacy.body.code).toBe('INVALID_TOKEN');

    const { receptionist } = await hospital('City');
    const headers = as(receptionist.id);
    await prisma.user.delete({ where: { id: receptionist.id } });
    const gone = await api().get('/api/auth/me').set(headers);
    expect(gone.status).toBe(401);
    expect(gone.body).toEqual({ error: 'User not found', code: 'USER_NOT_FOUND' });
  });
});
