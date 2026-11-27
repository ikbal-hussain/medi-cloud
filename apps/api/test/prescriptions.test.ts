import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { api, as, createPatient, createPrescription, hospital, superAdmin } from './helpers';

const rx = (patientId: string) => ({ patientId, medications: 'Amoxicillin 500mg', diagnosis: 'Bronchitis' });

describe('prescriptions', () => {
  it('doctors write them; the response names the patient and the doctor', async () => {
    const city = await hospital('City');
    const patient = await createPatient(city.tenant.id, 'Robert Johnson');
    const res = await api().post('/api/prescriptions').set(as(city.doctor.id)).send(rx(patient.id));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ patientName: 'Robert Johnson', doctorName: city.doctor.name, doctorId: city.doctor.id, notes: '' });

    const list = await api().get('/api/prescriptions').set(as(city.receptionist.id));
    expect(list.body).toHaveLength(1);
    expect(list.body[0].doctorName).toBe(city.doctor.name);
  });

  it('admins and receptionists cannot write them', async () => {
    const city = await hospital('City');
    const patient = await createPatient(city.tenant.id);
    for (const user of [city.admin, city.receptionist]) {
      expect((await api().post('/api/prescriptions').set(as(user.id)).send(rx(patient.id))).status).toBe(403);
    }
  });

  it('filters by patient and by doctor', async () => {
    const city = await hospital('City');
    const a = await createPatient(city.tenant.id, 'A');
    const b = await createPatient(city.tenant.id, 'B');
    await createPrescription(city.tenant.id, a.id, city.doctor.id);
    await createPrescription(city.tenant.id, b.id, city.doctor.id);
    const byPatient = await api().get(`/api/prescriptions?patientId=${a.id}`).set(as(city.doctor.id));
    expect(byPatient.body.map((p: { patientName: string }) => p.patientName)).toEqual(['A']);
    expect((await api().get('/api/prescriptions?doctorId=not-a-uuid').set(as(city.doctor.id))).body).toEqual([]);
  });

  it("a doctor may change or delete only their own; an admin may delete any", async () => {
    const city = await hospital('City');
    const colleague = await prisma.user.create({
      data: { tenantId: city.tenant.id, email: 'colleague@city.test', name: 'Dr. Colleague', role: 'DOCTOR', passwordHash: 'x' },
    });
    const patient = await createPatient(city.tenant.id);
    const theirs = await createPrescription(city.tenant.id, patient.id, colleague.id);

    const edit = await api().put(`/api/prescriptions/${theirs.id}`).set(as(city.doctor.id)).send({ notes: 'changed' });
    expect(edit.status).toBe(403);
    expect(edit.body.error).toBe('You can only update your own prescriptions');
    expect((await api().delete(`/api/prescriptions/${theirs.id}`).set(as(city.doctor.id))).status).toBe(403);

    const own = await api().put(`/api/prescriptions/${theirs.id}`).set(as(colleague.id)).send({ notes: 'Review in 7 days' });
    expect(own.body.notes).toBe('Review in 7 days');
    expect((await api().delete(`/api/prescriptions/${theirs.id}`).set(as(city.admin.id))).status).toBe(200);
  });

  it('a super admin writes for one of that hospital’s doctors, never someone else', async () => {
    const root = await superAdmin();
    const city = await hospital('City');
    const patient = await createPatient(city.tenant.id);
    const ok = await api()
      .post('/api/prescriptions')
      .set(as(root.id))
      .send({ ...rx(patient.id), tenantId: city.tenant.id, doctorId: city.doctor.id });
    expect(ok.status).toBe(201);
    expect(ok.body.doctorName).toBe(city.doctor.name);

    const notADoctor = await api()
      .post('/api/prescriptions')
      .set(as(root.id))
      .send({ ...rx(patient.id), tenantId: city.tenant.id, doctorId: city.receptionist.id });
    expect(notADoctor.status).toBe(400);
  });
});
