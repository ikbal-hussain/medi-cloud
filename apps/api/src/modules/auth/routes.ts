import { Router, type RequestHandler } from 'express';
import { loginSchema, registerSchema, type AuthResponseDto, type SessionDto } from '@medi-cloud/shared';
import { toSessionUser, toTenantDto } from '../../lib/dto';
import { AppError, emailTaken } from '../../lib/errors';
import { signToken } from '../../lib/jwt';
import { hashPassword, verifyPassword } from '../../lib/password';
import { prisma } from '../../lib/prisma';
import { authenticate, getAuth } from '../../middleware/authenticate';

/** `limitAttempts` throttles credential guessing on login and register. */
export function authRoutes(limitAttempts: RequestHandler): Router {
  const router = Router();

  // A new hospital and its first admin, created together: a failure leaves neither behind.
  router.post('/register', limitAttempts, async (req, res) => {
    const input = registerSchema.parse(req.body);
    const taken = await prisma.user.findUnique({ where: { email: input.adminEmail }, select: { id: true } });
    if (taken) throw emailTaken();

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email: input.adminEmail,
        name: input.adminName,
        passwordHash,
        role: 'HOSPITAL_ADMIN',
        tenant: { create: { name: input.hospitalName } },
      },
      include: { tenant: true },
    });

    const body: AuthResponseDto = {
      token: signToken({ userId: user.id }),
      user: toSessionUser(user),
      tenant: toTenantDto(user.tenant),
    };
    res.status(201).json(body);
  });

  router.post('/login', limitAttempts, async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email }, include: { tenant: true } });
    if (!(await verifyPassword(input.password, user?.passwordHash)) || !user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }
    const body: AuthResponseDto = {
      token: signToken({ userId: user.id }),
      user: toSessionUser(user),
      tenant: toTenantDto(user.tenant),
    };
    res.json(body);
  });

  router.get('/me', authenticate, (req, res) => {
    const { user, tenant } = getAuth(req);
    const body: SessionDto = { user: toSessionUser(user), tenant: toTenantDto(tenant) };
    res.json(body);
  });

  return router;
}
