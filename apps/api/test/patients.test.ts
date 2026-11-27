import { describe, expect, it } from 'vitest';
import { api, as, createPatient, createPrescription, hospital, patientInput } from './helpers';

describe('patients', () => {
  it('every role can add and list patients; the form values are coerced', async () => {
    const city = await hospital('City');
    for (const user of [city.admin, city.doctor, city.receptionist]) {
      const res = await api().post('/api/patients').set(as(user.id)).send(patientInput({ name: `By ${user.role}`, age: '41' }));
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ age: 41, status: 'Active', tenantId: city.tenant.id });
    }
    expect((await api().get('/api/patients').set(as(city.doctor.id))).body).toHaveLength(3);
  });

  it('accepts newborns (age 0) and rejects impossible values', async () => {
    const city = await hospital('City');
    const asNurse = () => api().post('/api/patients').set(as(city.receptionist.id));
    expect((await asNurse().send(patientInput({ age: 0 }))).status).toBe(201);
    for (const bad of [
      { age: -1 },
      { age: 2.5 },
      { age: '' },
      { age: null },
      { admissionDate: null },
      { gender: 'Unknown' },
      { type: 'ER' },
      { admissionDate: 'yesterday' },
      { name: '  ' },
    ]) {
      const res = await asNurse().send(patientInput(bad));
      expect(res.status, JSON.stringify(bad)).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    }
  });

  it("doesn't reset an age to 0 when a form sends it empty", async () => {
    const city = await hospital('City');
    const patient = await createPatient(city.tenant.id);
    const res = await api().put(`/api/patients/${patient.id}`).set(as(city.doctor.id)).send({ age: null });
    expect(res.status).toBe(400);
  });

  it('updates a patient', async () => {
    const city = await hospital('City');
    const patient = await createPatient(city.tenant.id);
    const res = await api().put(`/api/patients/${patient.id}`).set(as(city.doctor.id)).send({ status: 'Discharged' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Discharged');
    expect(res.body.name).toBe('Mary Williams');
  });

  it('only admins and receptionists delete, and never a patient with prescriptions', async () => {
    const city = await hospital('City');
    const patient = await createPatient(city.tenant.id);
    expect((await api().delete(`/api/patients/${patient.id}`).set(as(city.doctor.id))).status).toBe(403);

    await createPrescription(city.tenant.id, patient.id, city.doctor.id);
    const blocked = await api().delete(`/api/patients/${patient.id}`).set(as(city.receptionist.id));
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toMatch(/Mark them as Discharged/);

    const other = await createPatient(city.tenant.id, 'No records');
    expect((await api().delete(`/api/patients/${other.id}`).set(as(city.receptionist.id))).status).toBe(200);
  });
});
