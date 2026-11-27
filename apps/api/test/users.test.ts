import { describe, expect, it } from 'vitest';
import { api, as, createPatient, createPrescription, hospital, superAdmin } from './helpers';

const newStaff = { email: 'Rina@City.test', password: 'long-enough-1', name: 'Rina', role: 'RECEPTIONIST' };

describe('staff management', () => {
  it('is for admins only', async () => {
    const city = await hospital('City');
    for (const user of [city.doctor, city.receptionist]) {
      const res = await api().get('/api/users').set(as(user.id));
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    }
    expect((await api().get('/api/users').set(as(city.admin.id))).body).toHaveLength(3);
  });

  it('adds staff who can then log in, and never returns password hashes', async () => {
    const city = await hospital('City');
    const res = await api().post('/api/users').set(as(city.admin.id)).send(newStaff);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'rina@city.test', role: 'RECEPTIONIST', tenantId: city.tenant.id });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    const login = await api().post('/api/auth/login').send({ email: 'rina@city.test', password: 'long-enough-1' });
    expect(login.status).toBe(200);
  });

  it('validates new staff: role, password length, taken email', async () => {
    const city = await hospital('City');
    const asAdmin = () => api().post('/api/users').set(as(city.admin.id));
    expect((await asAdmin().send({ ...newStaff, role: 'SUPER_ADMIN' })).status).toBe(400);
    const short = await asAdmin().send({ ...newStaff, password: 'abc123' });
    expect(short.status).toBe(400);
    expect(short.body.error).toBe('Password must be at least 8 characters');
    const taken = await asAdmin().send({ ...newStaff, email: city.doctor.email });
    expect(taken.status).toBe(409);
    expect(taken.body.code).toBe('EMAIL_TAKEN');
  });

  it('updates staff, including a new password', async () => {
    const city = await hospital('City');
    const res = await api().put(`/api/users/${city.doctor.id}`).set(as(city.admin.id)).send({ name: 'Dr. Renamed', password: 'brand-new-pass' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Dr. Renamed');
    expect((await api().post('/api/auth/login').send({ email: city.doctor.email, password: 'brand-new-pass' })).status).toBe(200);
  });

  it("stops admins from changing their own role or deleting themselves", async () => {
    const city = await hospital('City');
    const demote = await api().put(`/api/users/${city.admin.id}`).set(as(city.admin.id)).send({ role: 'DOCTOR' });
    expect(demote.status).toBe(400);
    const self = await api().delete(`/api/users/${city.admin.id}`).set(as(city.admin.id));
    expect(self.status).toBe(400);
    expect(self.body.error).toBe('Cannot delete yourself');
  });

  it("keeps a doctor's account while they have prescriptions", async () => {
    const city = await hospital('City');
    const patient = await createPatient(city.tenant.id);
    await createPrescription(city.tenant.id, patient.id, city.doctor.id);
    const res = await api().delete(`/api/users/${city.doctor.id}`).set(as(city.admin.id));
    expect(res.status).toBe(409);
    expect((await api().delete(`/api/users/${city.receptionist.id}`).set(as(city.admin.id))).body).toEqual({
      message: 'User deleted successfully',
    });
  });

  it("doesn't let a hospital admin take over a super admin in the same tenant", async () => {
    const root = await superAdmin();
    // A super admin who adds staff without naming a hospital puts them in the platform tenant.
    const created = await api().post('/api/users').set(as(root.id)).send({ ...newStaff, role: 'HOSPITAL_ADMIN' });
    expect(created.status).toBe(201);
    const opsAdmin = created.body.id as string;

    const takeover = await api().put(`/api/users/${root.id}`).set(as(opsAdmin)).send({ password: 'owned-you-now' });
    expect(takeover.status).toBe(403);
    expect((await api().delete(`/api/users/${root.id}`).set(as(opsAdmin))).status).toBe(403);
  });

  it('404s on ids that are not UUIDs', async () => {
    const city = await hospital('City');
    expect((await api().get('/api/users/6745a1b2c3d4e5f601234567').set(as(city.admin.id))).status).toBe(404);
  });
});
