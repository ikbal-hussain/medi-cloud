import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env';
import { PrismaClient } from '../generated/prisma/client';

// One client (and connection pool) per process. A 5 s connect timeout keeps a database outage well inside
// Vercel's function time limit, so callers get a quick 503 instead of a hung request.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000 });

export const prisma = new PrismaClient({ adapter });
