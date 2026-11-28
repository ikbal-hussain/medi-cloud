import { Router, type Request } from 'express';
import { createUserSchema, updateUserSchema, type MessageDto, type UserDto } from '@medi-cloud/shared';
import { toUserDto } from '../../lib/dto';
import { AppError, badRequest, conflict, emailTaken, notFound } from '../../lib/errors';
import { parseId } from '../../lib/ids';
import { hashPassword } from '../../lib/password';
import { prisma } from '../../lib/prisma';
import { tenantForCreate, tenantScope } from '../../lib/tenancy';
import { authenticate, getAuth, requireRole } from '../../middleware/authenticate';

// Staff management: hospital admins manage their own hospital's staff; a SUPER_ADMIN manages anyone's.
export const usersRoutes = Router();
usersRoutes.use(authenticate, requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN'));

/** A user the caller may see and manage, or 404. Only a SUPER_ADMIN may touch a SUPER_ADMIN account. */
async function findManageable(req: Request) {
  const id = parseId(req.params['id'], 'User');
  const user = await prisma.user.findFirst({ where: { id, ...tenantScope(req) } });
  if (!user) throw notFound('User');
  if (user.role === 'SUPER_ADMIN' && getAuth(req).user.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'FORBIDDEN', 'Only a super admin can change a super admin account');
  }
  return user;
}

usersRoutes.get('/', async (req, res) => {
  const users = await prisma.user.findMany({ where: tenantScope(req), orderBy: { createdAt: 'desc' } });
  res.json(users.map(toUserDto) satisfies UserDto[]);
});

usersRoutes.get('/:id', async (req, res) => {
  res.json(toUserDto(await findManageable(req)) satisfies UserDto);
});

usersRoutes.post('/', async (req, res) => {
  const input = createUserSchema.parse(req.body);
  const tenantId = await tenantForCreate(req, input.tenantId);
  if (await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) throw emailTaken();

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    },
  });
  res.status(201).json(toUserDto(user) satisfies UserDto);
});

usersRoutes.put('/:id', async (req, res) => {
  const input = updateUserSchema.parse(req.body);
  const user = await findManageable(req);
  const me = getAuth(req).user;
  // Changing your own role could lock the hospital out of staff management.
  if (input.role && input.role !== user.role && user.id === me.id) throw badRequest("You can't change your own role");
  if (input.email && input.email !== user.email) {
    if (await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) throw emailTaken();
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      ...(input.password && { passwordHash: await hashPassword(input.password) }),
    },
  });
  res.json(toUserDto(updated) satisfies UserDto);
});

usersRoutes.delete('/:id', async (req, res) => {
  const user = await findManageable(req);
  if (user.id === getAuth(req).user.id) throw badRequest('Cannot delete yourself');
  if (await prisma.prescription.count({ where: { doctorId: user.id } })) {
    throw conflict("This staff member has written prescriptions, so their account can't be deleted");
  }
  await prisma.user.delete({ where: { id: user.id } });
  res.json({ message: 'User deleted successfully' } satisfies MessageDto);
});
