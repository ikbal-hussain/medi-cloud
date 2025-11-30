import { User, Tenant } from '../types';
import { authAPI } from './api';

export const login = async (email: string, password: string): Promise<{ user: User; tenant: Tenant } | null> => {
  try {
    const data = await authAPI.login(email, password);
    return {
      user: {
        id: data.user.id,
        tenantId: data.user.tenantId,
        email: data.user.email,
        password: '', // Don't store password
        name: data.user.name,
        role: data.user.role as User['role'],
        createdAt: new Date().toISOString(),
      },
      tenant: {
        id: data.tenant.id,
        name: data.tenant.name,
        createdAt: data.tenant.createdAt,
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
};

export const logout = () => {
  authAPI.logout();
};

export const getCurrentAuth = async (): Promise<{ user: User; tenant: Tenant } | null> => {
  try {
    const data = await authAPI.getCurrentUser();
    return {
      user: {
        id: data.user.id,
        tenantId: data.user.tenantId,
        email: data.user.email,
        password: '', // Don't store password
        name: data.user.name,
        role: data.user.role as User['role'],
        createdAt: new Date().toISOString(),
      },
      tenant: {
        id: data.tenant.id,
        name: data.tenant.name,
        createdAt: data.tenant.createdAt,
      },
    };
  } catch (error) {
    console.error('Get current auth error:', error);
    return null;
  }
};

export const registerHospital = async (
  hospitalName: string,
  adminEmail: string,
  adminName: string,
  password: string
): Promise<boolean> => {
  try {
    await authAPI.register(hospitalName, adminEmail, adminName, password);
    return true;
  } catch (error) {
    console.error('Registration error:', error);
    return false;
  }
};
