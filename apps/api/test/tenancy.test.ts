import { describe, expect, it } from 'vitest';
import { api, as, createPatient, createPrescription, hospital, patientInput, superAdmin } from './helpers';

// Hospitals must never see or change each other's data.
describe('tenant isolation', () => {
  it("hides another hospital's patients, prescriptions and staff", async () => {
    const city = await hospital('City');
    const galaxy = await hospital('Galaxy');
    const patient = await createPatient(city.tenant.id, 'Robert Johnson');
    const rx = await createPrescription(city.tenant.id, patient.id, city.doctor.id);
    const outsider = as(galaxy.admin.id);

    expect((await api().get('/api/patients').set(outsider)).body).toEqual([]);
    expect((await api().get('/api/prescriptions').set(outsider)).body).toEqual([]);
    expect((await api().get('/api/users').set(outsider)).body.map((u: { tenantId: string }) => u.tenantId)).toEqual(
      Array(3).fill(galaxy.tenant.id),
    );

    for (const [method, path] of [
      ['get', `/api/patients/${patient.id}`],
      ['put', `/api/patients/${patient.id}`],
      ['delete', `/api/patients/${patient.id}`],
      ['get', `/api/prescriptions/${rx.id}`],
      ['delete', `/api/prescriptions/${rx.id}`],
      ['get', `/api/users/${city.doctor.id}`],
      ['delete', `/api/users/${city.doctor.id}`],
    ] as const) {
      const res = await api()[method](path).set(outsider).send({ name: 'Hijacked' });
      expect(res.status, `${method} ${path}`).toBe(404);
    }
  });

  it("refuses a prescription for another hospital's patient", async () => {
    const city = await hospital('City');
    const galaxy = await hospital('Galaxy');
    const theirs = await createPatient(city.tenant.id);
    const res = await api()
      .post('/api/prescriptions')
      .set(as(galaxy.doctor.id))
      .send({ patientId: theirs.id, medications: 'X', diagnosis: 'Y' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Patient not found');
  });

  it('refuses to create records in another hospital or to filter by it', async () => {
    const city = await hospital('City');
    const galaxy = await hospital('Galaxy');
    const create = await api()
      .post('/api/patients')
      .set(as(galaxy.admin.id))
      .send(patientInput({ tenantId: city.tenant.id }));
    expect(create.status).toBe(403);
    const list = await api().get(`/api/patients?tenantId=${city.tenant.id}`).set(as(galaxy.admin.id));
    expect(list.status).toBe(403);
  });

  it('lets a super admin see every hospital, filter by one, and act in one', async () => {
    const root = await superAdmin();
    const city = await hospital('City');
    const galaxy = await hospital('Galaxy');
    await createPatient(city.tenant.id, 'In City');
    await createPatient(galaxy.tenant.id, 'In Galaxy');

    expect((await api().get('/api/patients').set(as(root.id))).body).toHaveLength(2);
    const filtered = await api().get(`/api/patients?tenantId=${city.tenant.id}`).set(as(root.id));
    expect(filtered.body.map((p: { name: string }) => p.name)).toEqual(['In City']);
    expect((await api().get('/api/tenants').set(as(root.id))).body).toHaveLength(3);

    const created = await api()
      .post('/api/patients')
      .set(as(root.id))
      .send(patientInput({ tenantId: galaxy.tenant.id }));
    expect(created.status).toBe(201);
    expect(created.body.tenantId).toBe(galaxy.tenant.id);
    const unknown = await api()
      .post('/api/patients')
      .set(as(root.id))
      .send(patientInput({ tenantId: '0195f000-0000-7000-8000-000000000000' }));
    expect(unknown.status).toBe(404);
  });

  it('keeps hospitals off the tenants list', async () => {
    const city = await hospital('City');
    expect((await api().get('/api/tenants').set(as(city.admin.id))).status).toBe(403);
  });
});
