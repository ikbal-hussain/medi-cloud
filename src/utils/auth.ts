import { User, Tenant } from '../types';
import { storage } from './storage';

export const login = (email: string, password: string): { user: User; tenant: Tenant } | null => {
  const users = storage.getUsers();
  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return null;
  }

  const tenants = storage.getTenants();
  const tenant = tenants.find((t) => t.id === user.tenantId);

  if (!tenant) {
    return null;
  }

  storage.setCurrentUser(user);
  return { user, tenant };
};

export const logout = () => {
  storage.setCurrentUser(null);
};

export const getCurrentAuth = (): { user: User; tenant: Tenant } | null => {
  const user = storage.getCurrentUser();
  if (!user) {
    return null;
  }

  const tenants = storage.getTenants();
  const tenant = tenants.find((t) => t.id === user.tenantId);

  if (!tenant) {
    return null;
  }

  return { user, tenant };
};

export const registerHospital = (hospitalName: string, adminEmail: string, adminName: string, password: string): boolean => {
  const tenants = storage.getTenants();
  const users = storage.getUsers();

  if (users.some((u) => u.email === adminEmail)) {
    return false;
  }

  const tenantId = `tenant-${Date.now()}`;
  const userId = `user-${Date.now()}`;

  const newTenant: Tenant = {
    id: tenantId,
    name: hospitalName,
    createdAt: new Date().toISOString(),
  };

  const newUser: User = {
    id: userId,
    tenantId,
    email: adminEmail,
    password,
    name: adminName,
    role: 'HOSPITAL_ADMIN',
    createdAt: new Date().toISOString(),
  };

  storage.setTenants([...tenants, newTenant]);
  storage.setUsers([...users, newUser]);

  return true;
};
