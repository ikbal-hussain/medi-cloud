import { Router } from 'express';
import type { TenantDto } from '@medi-cloud/shared';
import { toTenantDto } from '../../lib/dto';
import { notFound } from '../../lib/errors';
import { parseId } from '../../lib/ids';
import { prisma } from '../../lib/prisma';
import { authenticate, requireRole } from '../../middleware/authenticate';

// Hospitals on the platform: SUPER_ADMIN only.
export const tenantsRoutes = Router();
tenantsRoutes.use(authenticate, requireRole('SUPER_ADMIN'));

tenantsRoutes.get('/', async (_req, res) => {
  const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(tenants.map(toTenantDto) satisfies TenantDto[]);
});

tenantsRoutes.get('/:id', async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: parseId(req.params['id'], 'Tenant') } });
  if (!tenant) throw notFound('Tenant');
  res.json(toTenantDto(tenant) satisfies TenantDto);
});
