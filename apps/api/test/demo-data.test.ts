import { describe, expect, it } from 'vitest';
import { DEMO_HOSPITALS, loadDemoData } from '../prisma/demo-data';
import { prisma } from '../src/lib/prisma';
import { api, createPatient, hospital, PASSWORD, superAdmin } from './helpers';

const login = (email: string, password: string) => api().post('/api/auth/login').send({ email, password });

// The live demo is reset with this, so it must never lock out the platform's super admin.
describe('demo data', () => {
  it('replaces every hospital but keeps the super admin, who can still log in', async () => {
    const root = await superAdmin();
    const other = await hospital('Other');
    await createPatient(other.tenant.id);

    expect(await loadDemoData(prisma)).toEqual([root.email]);

    expect((await login(root.email, PASSWORD)).status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: other.admin.id } })).toBeNull();
    const names = (await prisma.tenant.findMany({ select: { name: true } })).map((t) => t.name).sort();
    expect(names).toEqual(['City Hospital', 'Galaxy Care', 'Platform administration']);
    for (const s of DEMO_HOSPITALS.flatMap((h) => h.staff)) {
      expect((await login(s.email, s.password)).status, s.email).toBe(200);
    }
  });

  it('gives the same result when run again', async () => {
    await superAdmin();
    await loadDemoData(prisma);
    const count = async () => [await prisma.tenant.count(), await prisma.user.count(), await prisma.patient.count(), await prisma.prescription.count()];
    const first = await count();
    await loadDemoData(prisma);
    expect(await count()).toEqual(first);
    expect(first).toEqual([3, 5, 3, 1]);
  });

  it('changes nothing if a super admin uses a demo email', async () => {
    const root = await superAdmin();
    await prisma.user.update({ where: { id: root.id }, data: { email: 'admin@city.com' } });
    const other = await hospital('Other');

    await expect(loadDemoData(prisma)).rejects.toThrow(/admin@city\.com/);
    expect(await prisma.user.findUnique({ where: { id: other.admin.id } })).not.toBeNull();
  });
});
