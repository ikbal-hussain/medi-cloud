import { afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma';

// Every test starts from an empty database.
beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE prescriptions, patients, users, tenants CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});
