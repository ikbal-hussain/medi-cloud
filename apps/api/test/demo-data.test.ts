import { describe, expect, it } from 'vitest';
import { DEMO_HOSPITALS, loadDemoData } from '../prisma/demo-data';
import { prisma } from '../src/lib/prisma';
import { api, createPatient, hospital, PASSWORD, superAdmin } from './helpers';

const login = (email: string, password: string) => api().post('/api/auth/login').send({ email, password });

/** True if a hospital made by `hospital()` and its patient are all still there. */
const untouched = async (other: Awaited<ReturnType<typeof hospital>>, patientId: string) =>
  Boolean(
    (await prisma.tenant.findUnique({ where: { id: other.tenant.id } })) &&
    (await prisma.user.findUnique({ where: { id: other.admin.id } })) &&
    (await prisma.patient.findUnique({ where: { id: patientId } })),
  );

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
    const rx = await prisma.prescription.findFirstOrThrow({ include: { patient: true, doctor: true } });
    expect([rx.patient.name, rx.doctor.email, rx.diagnosis]).toEqual([
      'Robert Johnson',
      'doc@city.com',
      'Acute Bronchitis',
    ]);
  });

  it('gives the same result when run again', async () => {
    await superAdmin();
    await loadDemoData(prisma);
    const count = async () => [
      await prisma.tenant.count(),
      await prisma.user.count(),
      await prisma.patient.count(),
      await prisma.prescription.count(),
    ];
    const first = await count();
    await loadDemoData(prisma);
    expect(await count()).toEqual(first);
    expect(first).toEqual([3, 5, 3, 1]);
  });

  it('changes nothing if a super admin uses a demo email', async () => {
    const root = await superAdmin();
    await prisma.user.update({ where: { id: root.id }, data: { email: 'admin@city.com' } });
    const other = await hospital('Other');
    const patient = await createPatient(other.tenant.id);

    await expect(loadDemoData(prisma)).rejects.toThrow(/admin@city\.com/);
    expect(await untouched(other, patient.id)).toBe(true);
  });

  it('rolls back every delete if loading fails part-way', async () => {
    const other = await hospital('Other');
    const patient = await createPatient(other.tenant.id);
    const broken = [
      { ...DEMO_HOSPITALS[0]!, prescriptions: [{ ...DEMO_HOSPITALS[0]!.prescriptions[0]!, patient: 'Nobody' }] },
    ];

    await expect(loadDemoData(prisma, broken)).rejects.toThrow(/unknown patient "Nobody"/);
    expect(await untouched(other, patient.id)).toBe(true);
    expect(await prisma.tenant.count({ where: { name: 'City Hospital' } })).toBe(0);
  });

  it('waits for writes already in progress, so none survive the reset', async () => {
    // A sign-up that has inserted its hospital but not committed yet when the reset starts.
    let commit!: () => void;
    let inserted!: () => void;
    const insertedYet = new Promise<void>((resolve) => (inserted = resolve));
    const signUp = prisma.$transaction(async (tx) => {
      await tx.tenant.create({ data: { name: 'Mid-reset sign-up' } });
      inserted();
      await new Promise<void>((resolve) => (commit = resolve));
    });
    await insertedYet;

    const reset = loadDemoData(prisma);
    // Long enough for an unlocked reset to finish first, which would let the sign-up survive.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    commit();
    await signUp;
    await reset;

    expect(await prisma.tenant.findFirst({ where: { name: 'Mid-reset sign-up' } })).toBeNull();
  });
});
