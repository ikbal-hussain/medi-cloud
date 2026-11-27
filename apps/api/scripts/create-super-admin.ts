// Creates the platform's SUPER_ADMIN, who can see and manage every hospital.
//   SUPER_ADMIN_EMAIL=you@example.com SUPER_ADMIN_PASSWORD='a long passphrase' npm run create-super-admin -w @medi-cloud/api
// There's deliberately no default password: this repository is public.
import { loginSchema, newPassword } from '@medi-cloud/shared';
import { hashPassword } from '../src/lib/password';
import { prisma } from '../src/lib/prisma';

async function main() {
  const email = loginSchema.shape.email.safeParse(process.env['SUPER_ADMIN_EMAIL']);
  const password = newPassword.min(12, { error: 'SUPER_ADMIN_PASSWORD must be at least 12 characters' }).safeParse(process.env['SUPER_ADMIN_PASSWORD']);
  if (!email.success || !password.success) {
    console.error('Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD (12+ characters).');
    if (!password.success) console.error(password.error.issues[0]?.message);
    process.exit(1);
  }

  const existing = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' }, select: { email: true } });
  if (existing) {
    console.log(`A super admin already exists (${existing.email}). Nothing changed.`);
    return;
  }
  if (await prisma.user.findUnique({ where: { email: email.data }, select: { id: true } })) {
    console.error(`${email.data} is already a user. Pick another email for the super admin.`);
    process.exit(1);
  }

  await prisma.user.create({
    data: {
      email: email.data,
      name: process.env['SUPER_ADMIN_NAME'] ?? 'Super Admin',
      role: 'SUPER_ADMIN',
      passwordHash: await hashPassword(password.data),
      tenant: { create: { name: 'Platform administration' } },
    },
  });
  console.log(`Super admin created: ${email.data}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
