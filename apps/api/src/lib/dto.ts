import type { PatientDto, PrescriptionDto, TenantDto, UserDto } from '@medi-cloud/shared';
import type { Patient, Prescription, Tenant, User } from '../generated/prisma/client';

// Database rows to API responses. Password hashes and internal columns never leave through here.

export const toTenantDto = (t: Tenant): TenantDto => ({ id: t.id, name: t.name, createdAt: t.createdAt.toISOString() });

export const toUserDto = (u: User): UserDto => ({
  id: u.id,
  tenantId: u.tenantId,
  email: u.email,
  name: u.name,
  role: u.role,
  createdAt: u.createdAt.toISOString(),
});

export const toSessionUser = (u: User) => ({ id: u.id, email: u.email, name: u.name, role: u.role, tenantId: u.tenantId });

export const toPatientDto = (p: Patient): PatientDto => ({
  id: p.id,
  tenantId: p.tenantId,
  name: p.name,
  age: p.age,
  gender: p.gender,
  type: p.type,
  phoneNumber: p.phoneNumber,
  address: p.address,
  admissionDate: p.admissionDate.toISOString(),
  status: p.status,
});

export type PrescriptionWithNames = Prescription & { patient: { name: string }; doctor: { name: string } };

/** Include this in prescription queries so toPrescriptionDto has the names. */
export const prescriptionNames = { patient: { select: { name: true } }, doctor: { select: { name: true } } } as const;

export const toPrescriptionDto = (p: PrescriptionWithNames): PrescriptionDto => ({
  id: p.id,
  tenantId: p.tenantId,
  patientId: p.patientId,
  patientName: p.patient.name,
  doctorId: p.doctorId,
  doctorName: p.doctor.name,
  medications: p.medications,
  diagnosis: p.diagnosis,
  notes: p.notes,
  createdAt: p.createdAt.toISOString(),
});
