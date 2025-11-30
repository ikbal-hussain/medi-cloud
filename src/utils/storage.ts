import { Tenant, User, Patient, Prescription } from '../types';

const STORAGE_KEYS = {
  TENANTS: 'hms_tenants',
  USERS: 'hms_users',
  PATIENTS: 'hms_patients',
  PRESCRIPTIONS: 'hms_prescriptions',
  CURRENT_USER: 'hms_current_user',
  INITIALIZED: 'hms_initialized',
};

export const storage = {
  getTenants: (): Tenant[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TENANTS);
    return data ? JSON.parse(data) : [];
  },

  setTenants: (tenants: Tenant[]) => {
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants));
  },

  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },

  setUsers: (users: User[]) => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getPatients: (): Patient[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PATIENTS);
    return data ? JSON.parse(data) : [];
  },

  setPatients: (patients: Patient[]) => {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
  },

  getPrescriptions: (): Prescription[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PRESCRIPTIONS);
    return data ? JSON.parse(data) : [];
  },

  setPrescriptions: (prescriptions: Prescription[]) => {
    localStorage.setItem(STORAGE_KEYS.PRESCRIPTIONS, JSON.stringify(prescriptions));
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  isInitialized: (): boolean => {
    return localStorage.getItem(STORAGE_KEYS.INITIALIZED) === 'true';
  },

  setInitialized: () => {
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  },
};

export const initializeDemoData = () => {
  if (storage.isInitialized()) {
    return;
  }

  const tenants: Tenant[] = [
    {
      id: 'tenant-1',
      name: 'City Hospital',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tenant-2',
      name: 'Galaxy Care',
      createdAt: new Date().toISOString(),
    },
  ];

  const users: User[] = [
    {
      id: 'user-1',
      tenantId: 'tenant-1',
      email: 'admin@city.com',
      password: '123',
      name: 'Dr. Sarah Admin',
      role: 'HOSPITAL_ADMIN',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-2',
      tenantId: 'tenant-1',
      email: 'doc@city.com',
      password: '123',
      name: 'Dr. John Smith',
      role: 'DOCTOR',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-3',
      tenantId: 'tenant-1',
      email: 'nurse@city.com',
      password: '123',
      name: 'Nurse Emily Brown',
      role: 'RECEPTIONIST',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-4',
      tenantId: 'tenant-2',
      email: 'admin@galaxy.com',
      password: '123',
      name: 'Dr. Michael Chen',
      role: 'HOSPITAL_ADMIN',
      createdAt: new Date().toISOString(),
    },
  ];

  const patients: Patient[] = [
    {
      id: 'patient-1',
      tenantId: 'tenant-1',
      name: 'Robert Johnson',
      age: 45,
      gender: 'Male',
      type: 'OPD',
      phoneNumber: '555-0101',
      address: '123 Main St, City',
      admissionDate: new Date().toISOString(),
      status: 'Active',
    },
    {
      id: 'patient-2',
      tenantId: 'tenant-1',
      name: 'Mary Williams',
      age: 32,
      gender: 'Female',
      type: 'IPD',
      phoneNumber: '555-0102',
      address: '456 Oak Ave, City',
      admissionDate: new Date().toISOString(),
      status: 'Active',
    },
    {
      id: 'patient-3',
      tenantId: 'tenant-1',
      name: 'James Davis',
      age: 67,
      gender: 'Male',
      type: 'IPD',
      phoneNumber: '555-0103',
      address: '789 Pine Rd, City',
      admissionDate: new Date().toISOString(),
      status: 'Active',
    },
    {
      id: 'patient-4',
      tenantId: 'tenant-1',
      name: 'Patricia Miller',
      age: 28,
      gender: 'Female',
      type: 'OPD',
      phoneNumber: '555-0104',
      address: '321 Elm St, City',
      admissionDate: new Date().toISOString(),
      status: 'Active',
    },
    {
      id: 'patient-5',
      tenantId: 'tenant-1',
      name: 'Michael Wilson',
      age: 54,
      gender: 'Male',
      type: 'OPD',
      phoneNumber: '555-0105',
      address: '654 Maple Dr, City',
      admissionDate: new Date().toISOString(),
      status: 'Discharged',
    },
    {
      id: 'patient-6',
      tenantId: 'tenant-2',
      name: 'Jennifer Garcia',
      age: 41,
      gender: 'Female',
      type: 'IPD',
      phoneNumber: '555-0201',
      address: '111 Galaxy Blvd, Town',
      admissionDate: new Date().toISOString(),
      status: 'Active',
    },
    {
      id: 'patient-7',
      tenantId: 'tenant-2',
      name: 'David Martinez',
      age: 35,
      gender: 'Male',
      type: 'OPD',
      phoneNumber: '555-0202',
      address: '222 Star Ave, Town',
      admissionDate: new Date().toISOString(),
      status: 'Active',
    },
    {
      id: 'patient-8',
      tenantId: 'tenant-2',
      name: 'Linda Rodriguez',
      age: 59,
      gender: 'Female',
      type: 'OPD',
      phoneNumber: '555-0203',
      address: '333 Moon St, Town',
      admissionDate: new Date().toISOString(),
      status: 'Active',
    },
  ];

  storage.setTenants(tenants);
  storage.setUsers(users);
  storage.setPatients(patients);
  storage.setPrescriptions([]);
  storage.setInitialized();
};
