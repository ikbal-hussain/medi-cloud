import type { Request, RequestHandler } from 'express';
import type { Role } from '@medi-cloud/shared';
import type { Tenant, User } from '../generated/prisma/client';
import { AppError } from '../lib/errors';
import { isUuid } from '../lib/ids';
import { verifyToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

export interface AuthContext {
  user: User;
  tenant: Tenant;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

/**
 * Requires a valid `Authorization: Bearer <token>` and loads the user and their hospital.
 * Only a missing, invalid or orphaned token is a 401. A database failure while checking it propagates (503/500),
 * so a client never mistakes an outage for being logged out.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  // The scheme name is case-insensitive (RFC 9110).
  const token = /^Bearer\s+(\S+)\s*$/i.exec(req.headers.authorization ?? '')?.[1];
  if (!token) throw new AppError(401, 'NO_TOKEN', 'No token provided');

  const payload = verifyToken(token);
  // Tokens from the old MongoDB API carry ObjectIds, which can't match any user here.
  if (!payload || !isUuid(payload.userId)) throw new AppError(401, 'INVALID_TOKEN', 'Invalid token');

  const found = await prisma.user.findUnique({ where: { id: payload.userId }, include: { tenant: true } });
  if (!found) throw new AppError(401, 'USER_NOT_FOUND', 'User not found');

  const { tenant, ...user } = found;
  req.auth = { user, tenant };
  next();
};

/** The logged-in user. Only valid on routes behind `authenticate`. */
export function getAuth(req: Request): AuthContext {
  if (!req.auth) throw new Error('getAuth() used on a route without authenticate');
  return req.auth;
}

/** Allows only the given roles (403 otherwise). */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!roles.includes(getAuth(req).user.role)) throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
    next();
  };
