// Loads the demo data (prisma/demo-data.ts). It replaces every hospital, staff member and patient (super admins
// are kept), so it only runs against a local database unless ALLOW_DEMO_RESET=yes.
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import { isLocalDatabase, redact } from '../scripts/guard';
import { DEMO_HOSPITALS, loadDemoData } from './demo-data';

if (!isLocalDatabase(env.DATABASE_URL) && process.env['ALLOW_DEMO_RESET'] !== 'yes') {
  console.error(`Refusing to wipe a non-local database (${redact(env.DATABASE_URL)}).`);
  console.error('Set ALLOW_DEMO_RESET=yes if it really is a throwaway database.');
  process.exit(1);
}

async function main() {
  const kept = await loadDemoData(prisma);

  const logins = DEMO_HOSPITALS.map((h) =>
    h.staff.map((s, i) => `  ${(i === 0 ? h.name : '').padEnd(15)} ${`${s.email} / ${s.password}`.padEnd(28)} (${s.role.toLowerCase().replaceAll('_', ' ')})`).join('\n'),
  ).join('\n');
  console.log(`Demo data loaded into ${redact(env.DATABASE_URL)}\n\n${logins}\n`);
  console.log(kept.length ? `Kept ${kept.length} super admin(s): ${kept.join(', ')}` : 'No super admin yet: create one with `npm run create-super-admin`.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
