import { User, Tenant } from '../types';
import { authAPI, ApiError } from './api';

type Session = { user: User; tenant: Tenant };

const toSession = (data: Awaited<ReturnType<typeof authAPI.getCurrentUser>>): Session => ({
  user: {
    id: data.user.id,
    tenantId: data.user.tenantId,
    email: data.user.email,
    name: data.user.name,
    role: data.user.role as User['role'],
    createdAt: new Date().toISOString(),
  },
  tenant: {
    id: data.tenant.id,
    name: data.tenant.name,
    createdAt: data.tenant.createdAt,
  },
});

// Throws ApiError (401 for wrong credentials) or a network error, so the form can say which.
export const login = async (email: string, password: string): Promise<Session> =>
  toSession(await authAPI.login(email, password));

export const logout = () => {
  authAPI.logout();
};

// The API's 401 messages that mean the token itself is no good. Its other 401, 'Authentication failed', also
// covers a database error while checking the token, so that one must not log the user out.
const REJECTED_TOKEN_MESSAGES = new Set(['Invalid token', 'User not found', 'No token provided']);

/**
 * The logged-in session, or null when nobody is logged in on this browser.
 * Throws when the server can't be reached or can't answer (network error, 5xx): the session may still be
 * valid, so the app should offer a retry rather than show the logged-out page.
 */
export const getCurrentAuth = async (): Promise<Session | null> => {
  let token: string | null;
  try {
    token = authAPI.currentToken();
  } catch {
    return null; // site data blocked: no saved session to check
  }
  // Nobody has logged in on this browser: there's no session to check, so don't ask the server.
  if (!token) return null;
  try {
    return toSession(await authAPI.getCurrentUser());
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && REJECTED_TOKEN_MESSAGES.has(error.message)) {
      // Forget the token so the next visit doesn't send it again, unless another tab has already replaced it.
      authAPI.forgetToken(token);
      return null;
    }
    throw error;
  }
};

// Throws ApiError (e.g. 400 'Email already registered') or a network error.
export const registerHospital = async (
  hospitalName: string,
  adminEmail: string,
  adminName: string,
  password: string
): Promise<void> => {
  await authAPI.register(hospitalName, adminEmail, adminName, password);
};
