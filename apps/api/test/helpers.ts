import request from 'supertest';
import { createApp, type AppOptions } from '../src/app';
import { signToken } from '../src/lib/jwt';
import { hashPassword } from '../src/lib/password';
import { prisma } from '../src/lib/prisma';

export const PASSWORD = 'correct-horse-9';
let passwordHash: string | undefined;

export const api = (options?: AppOptions) => request(createApp(options));

/** Bearer header for a user id. */
export const as = (userId: string) => ({ Authorization: `Bearer ${signToken({ userId })}` });

/** A hospital with one user per role, all with PASSWORD. */
export async function hospital(name: string) {
  passwordHash ??= await hashPassword(PASSWORD);
  const tenant = await prisma.tenant.create({ data: { name } });
  const slug = name.toLowerCase().replace(/[^a-z]+/g, '');
  const user = (role: 'HOSPITAL_ADMIN' | 'DOCTOR' | 'RECEPTIONIST', who: string) =>
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `${who}@${slug}.test`,
        name: `${who} of ${name}`,
        role,
        passwordHash: passwordHash!,
      },
    });
  const [admin, doctor, receptionist] = await Promise.all([
    user('HOSPITAL_ADMIN', 'admin'),
    user('DOCTOR', 'doctor'),
    user('RECEPTIONIST', 'reception'),
  ]);
  return { tenant, admin, doctor, receptionist };
}

export async function superAdmin() {
  passwordHash ??= await hashPassword(PASSWORD);
  return prisma.user.create({
    data: {
      email: 'root@platform.test',
      name: 'Root',
      role: 'SUPER_ADMIN',
      passwordHash,
      tenant: { create: { name: 'Platform administration' } },
    },
  });
}

export const patientInput = (overrides: Record<string, unknown> = {}) => ({
  name: 'Mary Williams',
  age: 32,
  gender: 'Female',
  type: 'IPD',
  phoneNumber: '555-0102',
  address: '456 Oak Ave',
  admissionDate: '2026-11-27T00:00:00.000Z',
  ...overrides,
});

export const createPatient = (tenantId: string, name = 'Mary Williams') =>
  prisma.patient.create({
    data: {
      tenantId,
      name,
      age: 32,
      gender: 'Female',
      type: 'IPD',
      phoneNumber: '555-0102',
      address: '456 Oak Ave',
      admissionDate: new Date('2026-11-27'),
    },
  });

export const createPrescription = (tenantId: string, patientId: string, doctorId: string) =>
  prisma.prescription.create({
    data: { tenantId, patientId, doctorId, medications: 'Paracetamol 500mg', diagnosis: 'Fever' },
  });
