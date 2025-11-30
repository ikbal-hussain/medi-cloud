const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Get auth token from localStorage
const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Set auth token in localStorage
const setToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

// Remove auth token from localStorage
const removeToken = (): void => {
  localStorage.removeItem('auth_token');
};

// API request helper
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const data = await apiRequest<{
      token: string;
      user: { id: string; email: string; name: string; role: string; tenantId: string };
      tenant: { id: string; name: string; createdAt: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    return data;
  },

  register: async (hospitalName: string, adminEmail: string, adminName: string, password: string) => {
    const data = await apiRequest<{
      token: string;
      user: { id: string; email: string; name: string; role: string; tenantId: string };
      tenant: { id: string; name: string; createdAt: string };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ hospitalName, adminEmail, adminName, password }),
    });
    setToken(data.token);
    return data;
  },

  getCurrentUser: async () => {
    return apiRequest<{
      user: { id: string; email: string; name: string; role: string; tenantId: string };
      tenant: { id: string; name: string; createdAt: string };
    }>('/auth/me');
  },

  logout: () => {
    removeToken();
  },
};

// Users API
export const usersAPI = {
  getAll: async () => {
    const users = await apiRequest<Array<{
      id: string;
      tenantId: string;
      email: string;
      name: string;
      role: string;
      createdAt: string;
    }>>('/users');
    return users;
  },

  getById: async (id: string) => {
    return apiRequest<{
      id: string;
      tenantId: string;
      email: string;
      name: string;
      role: string;
      createdAt: string;
    }>(`/users/${id}`);
  },

  create: async (user: { email: string; password: string; name: string; role: string }) => {
    return apiRequest<{
      id: string;
      tenantId: string;
      email: string;
      name: string;
      role: string;
      createdAt: string;
    }>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  update: async (id: string, user: { email?: string; name?: string; role?: string; password?: string }) => {
    return apiRequest<{
      id: string;
      tenantId: string;
      email: string;
      name: string;
      role: string;
      createdAt: string;
    }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  },

  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// Patients API
export const patientsAPI = {
  getAll: async () => {
    const patients = await apiRequest<Array<{
      id: string;
      tenantId: string;
      name: string;
      age: number;
      gender: string;
      type: string;
      phoneNumber: string;
      address: string;
      admissionDate: string;
      status: string;
    }>>('/patients');
    return patients;
  },

  getById: async (id: string) => {
    return apiRequest<{
      id: string;
      tenantId: string;
      name: string;
      age: number;
      gender: string;
      type: string;
      phoneNumber: string;
      address: string;
      admissionDate: string;
      status: string;
    }>(`/patients/${id}`);
  },

  create: async (patient: {
    name: string;
    age: number;
    gender: string;
    type: string;
    phoneNumber: string;
    address: string;
    admissionDate: string;
    status?: string;
  }) => {
    return apiRequest<{
      id: string;
      tenantId: string;
      name: string;
      age: number;
      gender: string;
      type: string;
      phoneNumber: string;
      address: string;
      admissionDate: string;
      status: string;
    }>('/patients', {
      method: 'POST',
      body: JSON.stringify(patient),
    });
  },

  update: async (id: string, patient: {
    name?: string;
    age?: number;
    gender?: string;
    type?: string;
    phoneNumber?: string;
    address?: string;
    admissionDate?: string;
    status?: string;
  }) => {
    return apiRequest<{
      id: string;
      tenantId: string;
      name: string;
      age: number;
      gender: string;
      type: string;
      phoneNumber: string;
      address: string;
      admissionDate: string;
      status: string;
    }>(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patient),
    });
  },

  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/patients/${id}`, {
      method: 'DELETE',
    });
  },
};

// Prescriptions API
export const prescriptionsAPI = {
  getAll: async (patientId?: string, doctorId?: string) => {
    const params = new URLSearchParams();
    if (patientId) params.append('patientId', patientId);
    if (doctorId) params.append('doctorId', doctorId);
    const query = params.toString();
    const endpoint = query ? `/prescriptions?${query}` : '/prescriptions';
    const prescriptions = await apiRequest<Array<{
      id: string;
      tenantId: string;
      patientId: string;
      doctorId: string;
      medications: string;
      diagnosis: string;
      notes: string;
      createdAt: string;
    }>>(endpoint);
    return prescriptions;
  },

  getById: async (id: string) => {
    return apiRequest<{
      id: string;
      tenantId: string;
      patientId: string;
      doctorId: string;
      medications: string;
      diagnosis: string;
      notes: string;
      createdAt: string;
    }>(`/prescriptions/${id}`);
  },

  create: async (prescription: {
    patientId: string;
    medications: string;
    diagnosis: string;
    notes?: string;
  }) => {
    return apiRequest<{
      id: string;
      tenantId: string;
      patientId: string;
      doctorId: string;
      medications: string;
      diagnosis: string;
      notes: string;
      createdAt: string;
    }>('/prescriptions', {
      method: 'POST',
      body: JSON.stringify(prescription),
    });
  },

  update: async (id: string, prescription: {
    medications?: string;
    diagnosis?: string;
    notes?: string;
  }) => {
    return apiRequest<{
      id: string;
      tenantId: string;
      patientId: string;
      doctorId: string;
      medications: string;
      diagnosis: string;
      notes: string;
      createdAt: string;
    }>(`/prescriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(prescription),
    });
  },

  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/prescriptions/${id}`, {
      method: 'DELETE',
    });
  },
};

export { getToken, setToken, removeToken };

