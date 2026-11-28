import { z } from 'zod';
import { GENDERS, PATIENT_STATUSES, PATIENT_TYPES, ROLES } from './constants';

// Response bodies. The API docs (OpenAPI) are generated from these schemas, and the API tests check real responses
// against them. They are strict, so a field the API sends but doesn't document fails the tests.

const id = z.uuid();
/** ISO 8601, e.g. 2026-11-28T10:30:00.000Z. */
const timestamp = z.iso.datetime();

export const tenantDtoSchema = z.strictObject({ id, name: z.string(), createdAt: timestamp });
export type TenantDto = z.infer<typeof tenantDtoSchema>;

export const userDtoSchema = z.strictObject({
  id,
  tenantId: id,
  email: z.email(),
  name: z.string(),
  role: z.enum(ROLES),
  createdAt: timestamp,
});
export type UserDto = z.infer<typeof userDtoSchema>;

/** The logged-in user and their hospital. */
export const sessionDtoSchema = z.strictObject({
  user: userDtoSchema.pick({ id: true, email: true, name: true, role: true, tenantId: true }).strict(),
  tenant: tenantDtoSchema,
});
export type SessionDto = z.infer<typeof sessionDtoSchema>;

export const authResponseDtoSchema = sessionDtoSchema.extend({
  token: z.string().meta({ description: 'Send as `Authorization: Bearer <token>`' }),
});
export type AuthResponseDto = z.infer<typeof authResponseDtoSchema>;

export const patientDtoSchema = z.strictObject({
  id,
  tenantId: id,
  name: z.string(),
  age: z.int().min(0).max(150),
  gender: z.enum(GENDERS),
  type: z.enum(PATIENT_TYPES),
  phoneNumber: z.string(),
  address: z.string(),
  admissionDate: timestamp,
  status: z.enum(PATIENT_STATUSES),
});
export type PatientDto = z.infer<typeof patientDtoSchema>;

export const prescriptionDtoSchema = z.strictObject({
  id,
  tenantId: id,
  patientId: id,
  patientName: z.string(),
  doctorId: id,
  doctorName: z.string(),
  medications: z.string(),
  diagnosis: z.string(),
  notes: z.string(),
  createdAt: timestamp,
});
export type PrescriptionDto = z.infer<typeof prescriptionDtoSchema>;

export const messageDtoSchema = z.strictObject({ message: z.string() });
export type MessageDto = z.infer<typeof messageDtoSchema>;
