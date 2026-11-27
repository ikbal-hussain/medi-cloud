import type { Gender, PatientStatus, PatientType, Role } from './constants';

// Response bodies. Dates are ISO 8601 strings.

export interface TenantDto {
  id: string;
  name: string;
  createdAt: string;
}

export interface UserDto {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface SessionDto {
  user: Pick<UserDto, 'id' | 'email' | 'name' | 'role' | 'tenantId'>;
  tenant: TenantDto;
}

export interface AuthResponseDto extends SessionDto {
  token: string;
}

export interface PatientDto {
  id: string;
  tenantId: string;
  name: string;
  age: number;
  gender: Gender;
  type: PatientType;
  phoneNumber: string;
  address: string;
  admissionDate: string;
  status: PatientStatus;
}

export interface PrescriptionDto {
  id: string;
  tenantId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  medications: string;
  diagnosis: string;
  notes: string;
  createdAt: string;
}

export interface MessageDto {
  message: string;
}
