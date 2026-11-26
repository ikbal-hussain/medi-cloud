export type UserRole = 'SUPER_ADMIN' | 'HOSPITAL_ADMIN' | 'DOCTOR' | 'RECEPTIONIST';

export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface Patient {
  id: string;
  tenantId: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  type: 'OPD' | 'IPD';
  phoneNumber: string;
  address: string;
  admissionDate: string;
  status: 'Active' | 'Discharged';
}

export interface Prescription {
  id: string;
  tenantId: string;
  patientId: string;
  doctorId: string;
  medications: string;
  diagnosis: string;
  notes: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  tenantId: string | null;
  tenant: Tenant | null;
}
