// Demo data: two hospitals, staff for each role, patients and a prescription. Used by `npm run seed` and the tests.
import type { Gender, PatientType, StaffRole } from '@medi-cloud/shared';
import type { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword } from '../src/lib/password';

export interface DemoHospital {
  name: string;
  staff: { email: string; password: string; name: string; role: StaffRole }[];
  patients: { name: string; age: number; gender: Gender; type: PatientType; phoneNumber: string; address: string }[];
  /** `patient` is a patient name and `doctor` a staff email, both from this hospital. */
  prescriptions: { patient: string; doctor: string; medications: string; diagnosis: string; notes: string }[];
}

/** Public demo logins. The passwords are deliberately simple: they are published in the README. */
export const DEMO_HOSPITALS: DemoHospital[] = [
  {
    name: 'City Hospital',
    staff: [
      { email: 'admin@city.com', password: 'admin123', name: 'Dr. Sarah Admin', role: 'HOSPITAL_ADMIN' },
      { email: 'doc@city.com', password: 'doc123', name: 'Dr. John Smith', role: 'DOCTOR' },
      { email: 'nurse@city.com', password: 'nurse123', name: 'Nurse Emily Brown', role: 'RECEPTIONIST' },
    ],
    patients: [
      {
        name: 'Robert Johnson',
        age: 45,
        gender: 'Male',
        type: 'OPD',
        phoneNumber: '555-0101',
        address: '123 Main St, City',
      },
      {
        name: 'Mary Williams',
        age: 32,
        gender: 'Female',
        type: 'IPD',
        phoneNumber: '555-0102',
        address: '456 Oak Ave, City',
      },
      {
        name: 'James Davis',
        age: 67,
        gender: 'Male',
        type: 'IPD',
        phoneNumber: '555-0103',
        address: '789 Pine Rd, City',
      },
    ],
    prescriptions: [
      {
        patient: 'Robert Johnson',
        doctor: 'doc@city.com',
        medications: 'Amoxicillin 500mg - 3 times daily for 7 days\nParacetamol 500mg - as needed for fever',
        diagnosis: 'Acute Bronchitis',
        notes: 'Patient should rest and drink plenty of fluids. Follow up in 7 days if symptoms persist.',
      },
    ],
  },
  {
    name: 'Galaxy Care',
    staff: [{ email: 'admin@galaxy.com', password: 'admin123', name: 'Dr. Michael Chen', role: 'HOSPITAL_ADMIN' }],
    patients: [],
    prescriptions: [],
  },
];

/**
 * Replaces every hospital, staff member, patient and prescription with the demo data, in one transaction.
 * Platform super admins (and the tenant each belongs to) are kept, so a reset never locks the operator out.
 * Safe to run on a live database: other writes wait until it finishes. Returns the emails of the super admins kept.
 */
export async function loadDemoData(db: PrismaClient, hospitals: DemoHospital[] = DEMO_HOSPITALS): Promise<string[]> {
  // Hash first: bcrypt is slow, and the transaction should stay short.
  const staff = hospitals.flatMap((h) => h.staff);
  const hashes = new Map(await Promise.all(staff.map(async (s) => [s.email, await hashPassword(s.password)] as const)));

  return db.$transaction(
    async (tx) => {
      // Without this, a sign-up or a new prescription committed mid-reset could survive it, or make a delete
      // below fail on a foreign key. EXCLUSIVE still lets the site read; writes wait for the reset to finish.
      await tx.$executeRaw`LOCK TABLE tenants, users, patients, prescriptions IN EXCLUSIVE MODE`;

      const superAdmins = await tx.user.findMany({ where: { role: 'SUPER_ADMIN' }, select: { email: true } });
      const clash = superAdmins.find((a) => hashes.has(a.email));
      if (clash)
        throw new Error(`Super admin ${clash.email} uses a demo login's email. Change it before loading demo data.`);

      await tx.prescription.deleteMany();
      await tx.patient.deleteMany();
      await tx.user.deleteMany({ where: { role: { not: 'SUPER_ADMIN' } } });
      await tx.tenant.deleteMany({ where: { users: { none: {} } } });

      const admissionDate = new Date();
      for (const h of hospitals) {
        const tenant = await tx.tenant.create({ data: { name: h.name } });
        const users = new Map<string, string>();
        for (const s of h.staff) {
          const user = await tx.user.create({
            data: {
              tenantId: tenant.id,
              email: s.email,
              name: s.name,
              role: s.role,
              passwordHash: hashes.get(s.email)!,
            },
          });
          users.set(s.email, user.id);
        }
        const patients = new Map<string, string>();
        for (const p of h.patients) {
          patients.set(p.name, (await tx.patient.create({ data: { ...p, tenantId: tenant.id, admissionDate } })).id);
        }
        for (const { patient, doctor, ...rx } of h.prescriptions) {
          const patientId = patients.get(patient);
          const doctorId = users.get(doctor);
          if (!patientId || !doctorId)
            throw new Error(`${h.name}: a prescription names an unknown patient "${patient}" or doctor "${doctor}"`);
          await tx.prescription.create({ data: { ...rx, tenantId: tenant.id, patientId, doctorId } });
        }
      }

      return superAdmins.map((a) => a.email);
    },
    // A hosted database can be a few hundred milliseconds away; allow for that on top of ~15 queries.
    { maxWait: 10_000, timeout: 60_000 },
  );
}
