import type { Request } from 'express';
import { getAuth } from '../middleware/authenticate';
import { AppError, notFound } from './errors';
import { isUuid } from './ids';
import { prisma } from './prisma';

// Multi-tenancy rules in one place. Everyone works inside their own hospital (tenant); only a SUPER_ADMIN
// may look across hospitals or act in another one.

const denied = () => new AppError(403, 'FORBIDDEN', 'Access denied to this tenant');

/** `where` filter for reading hospital-owned rows. A SUPER_ADMIN sees every hospital, or one via ?tenantId=. */
export function tenantScope(req: Request): { tenantId?: string } {
  const { user } = getAuth(req);
  const asked = typeof req.query['tenantId'] === 'string' && req.query['tenantId'] ? req.query['tenantId'] : undefined;
  if (user.role === 'SUPER_ADMIN') {
    if (asked === undefined) return {};
    // Not a UUID can't be a hospital: match nothing rather than ask the database.
    return { tenantId: isUuid(asked) ? asked : '00000000-0000-0000-0000-000000000000' };
  }
  if (asked !== undefined && asked !== user.tenantId) throw denied();
  return { tenantId: user.tenantId };
}

/** The hospital a new row belongs to: the caller's own, or (SUPER_ADMIN only) an existing one they name. */
export async function tenantForCreate(req: Request, requested: string | undefined): Promise<string> {
  const { user } = getAuth(req);
  if (requested === undefined || requested === user.tenantId) return user.tenantId;
  if (user.role !== 'SUPER_ADMIN') throw denied();
  const exists =
    isUuid(requested) && (await prisma.tenant.findUnique({ where: { id: requested }, select: { id: true } }));
  if (!exists) throw notFound('Hospital');
  return requested;
}
