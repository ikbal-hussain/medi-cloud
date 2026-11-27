import { describe, expect, it } from 'vitest';
import { createPatientSchema, createUserSchema, loginSchema, registerSchema, updatePatientSchema } from './schemas';

describe('shared schemas', () => {
  it('normalises emails', () => {
    expect(loginSchema.parse({ email: '  Admin@City.COM ', password: 'x' }).email).toBe('admin@city.com');
  });

  it('rejects an invalid email with a readable message', () => {
    const result = loginSchema.safeParse({ email: 'nope', password: 'x' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Enter a valid email address');
  });

  it('requires new passwords of at least 8 characters, but not on login', () => {
    const base = { hospitalName: 'City', adminEmail: 'a@b.co', adminName: 'A' };
    expect(registerSchema.safeParse({ ...base, password: 'short' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'long-enough' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'doc123' }).success).toBe(true);
  });

  it('never lets the API assign SUPER_ADMIN', () => {
    const result = createUserSchema.safeParse({ email: 'a@b.co', password: 'long-enough', name: 'A', role: 'SUPER_ADMIN' });
    expect(result.success).toBe(false);
  });

  it('coerces form values for patients and defaults the status', () => {
    const patient = createPatientSchema.parse({
      name: ' Mary ',
      age: '32',
      gender: 'Female',
      type: 'IPD',
      phoneNumber: '555-0102',
      address: '1 Main St',
      admissionDate: '2026-11-27',
    });
    expect(patient).toMatchObject({ name: 'Mary', age: 32, status: 'Active' });
    expect(patient.admissionDate).toBeInstanceOf(Date);
  });

  it('rejects impossible ages and unknown enums', () => {
    expect(updatePatientSchema.safeParse({ age: -1 }).success).toBe(false);
    expect(updatePatientSchema.safeParse({ age: 3.5 }).success).toBe(false);
    expect(updatePatientSchema.safeParse({ type: 'ER' }).success).toBe(false);
    expect(updatePatientSchema.safeParse({}).success).toBe(true);
  });
});
