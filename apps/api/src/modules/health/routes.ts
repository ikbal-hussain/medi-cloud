import { Router } from 'express';
import type { z } from 'zod';
import { prisma } from '../../lib/prisma';
import type { databaseHealthSchema, healthSchema } from '../docs/openapi';

export const healthRoutes = Router();

// Answers without the database, so it shows the server itself is up.
healthRoutes.get('/', (_req, res) => {
  res.json({ status: 'OK', message: 'Server is running' } satisfies z.infer<typeof healthSchema>);
});

// Also checks the database (503 when it's unreachable).
healthRoutes.get('/db', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'OK', database: 'up' } satisfies z.infer<typeof databaseHealthSchema>);
});
