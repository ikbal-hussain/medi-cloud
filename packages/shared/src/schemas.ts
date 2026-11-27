import { z } from 'zod';
import { GENDERS, PATIENT_STATUSES, PATIENT_TYPES, STAFF_ROLES } from './constants';

// Request bodies the API accepts. The web app uses the same schemas for its forms.

const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Enter a valid email address' }));

/** A new password. Login doesn't use this: existing passwords are checked as they are. */
export const newPassword = z
  .string({ error: 'Password is required' })
  .min(8, { error: 'Password must be at least 8 characters' })
  .max(128, { error: 'Password must be at most 128 characters' });

const name = (label: string, max = 120) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, { error: `${label} is required` })
    .max(max, { error: `${label} must be at most ${max} characters` });

const id = (label: string) => z.string({ error: `${label} is required` }).trim().min(1, { error: `${label} is required` });

export const loginSchema = z.object({
  email,
  password: z.string({ error: 'Password is required' }).min(1, { error: 'Password is required' }),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  hospitalName: name('Hospital name').min(2, { error: 'Hospital name must be at least 2 characters' }),
  adminEmail: email,
  adminName: name('Admin name'),
  password: newPassword,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const createUserSchema = z.object({
  email,
  password: newPassword,
  name: name('Name'),
  role: z.enum(STAFF_ROLES, { error: 'Role must be HOSPITAL_ADMIN, DOCTOR or RECEPTIONIST' }),
  /** Only a SUPER_ADMIN may create a user in another hospital. */
  tenantId: z.string().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.omit({ tenantId: true }).partial();
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

const patientFields = {
  name: name('Name'),
  age: z.coerce
    .number({ error: 'Age must be a number' })
    .int({ error: 'Age must be a whole number' })
    .min(0, { error: 'Age cannot be negative' })
    .max(150, { error: 'Age must be at most 150' }),
  gender: z.enum(GENDERS, { error: 'Gender must be Male, Female or Other' }),
  type: z.enum(PATIENT_TYPES, { error: 'Type must be OPD or IPD' }),
  phoneNumber: name('Phone number', 30),
  address: name('Address', 300),
  admissionDate: z.coerce.date({ error: 'Admission date must be a valid date' }),
  status: z.enum(PATIENT_STATUSES, { error: 'Status must be Active or Discharged' }),
};

export const createPatientSchema = z.object({
  ...patientFields,
  status: patientFields.status.default('Active'),
  tenantId: z.string().optional(),
});
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = z.object(patientFields).partial();
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

const prescriptionText = {
  medications: name('Medications', 5000),
  diagnosis: name('Diagnosis', 2000),
  notes: z.string().trim().max(5000, { error: 'Notes must be at most 5000 characters' }),
};

export const createPrescriptionSchema = z.object({
  patientId: id('Patient'),
  ...prescriptionText,
  notes: prescriptionText.notes.default(''),
  /** Only a SUPER_ADMIN may write on behalf of a doctor, or in another hospital. */
  doctorId: z.string().optional(),
  tenantId: z.string().optional(),
});
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

export const updatePrescriptionSchema = z.object(prescriptionText).partial();
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;
