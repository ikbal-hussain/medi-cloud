// Demo data: two hospitals, staff for each role, patients and a prescription.
// It deletes everything first, so it only runs against a local database unless ALLOW_DEMO_RESET=yes.
import { env } from '../src/config/env';
import { hashPassword } from '../src/lib/password';
import { prisma } from '../src/lib/prisma';
import { isLocalDatabase, redact } from '../scripts/guard';

if (!isLocalDatabase(env.DATABASE_URL) && process.env['ALLOW_DEMO_RESET'] !== 'yes') {
  console.error(`Refusing to wipe a non-local database (${redact(env.DATABASE_URL)}).`);
  console.error('Set ALLOW_DEMO_RESET=yes if it really is a throwaway database.');
  process.exit(1);
}

const staff = async (tenantId: string, email: string, password: string, name: string, role: 'HOSPITAL_ADMIN' | 'DOCTOR' | 'RECEPTIONIST') =>
  prisma.user.create({ data: { tenantId, email, name, role, passwordHash: await hashPassword(password) } });

async function main() {
  await prisma.$transaction([
    prisma.prescription.deleteMany(),
    prisma.patient.deleteMany(),
    prisma.user.deleteMany(),
    prisma.tenant.deleteMany(),
  ]);

  const city = await prisma.tenant.create({ data: { name: 'City Hospital' } });
  await staff(city.id, 'admin@city.com', 'admin123', 'Dr. Sarah Admin', 'HOSPITAL_ADMIN');
  const doctor = await staff(city.id, 'doc@city.com', 'doc123', 'Dr. John Smith', 'DOCTOR');
  await staff(city.id, 'nurse@city.com', 'nurse123', 'Nurse Emily Brown', 'RECEPTIONIST');

  const galaxy = await prisma.tenant.create({ data: { name: 'Galaxy Care' } });
  await staff(galaxy.id, 'admin@galaxy.com', 'admin123', 'Dr. Michael Chen', 'HOSPITAL_ADMIN');

  const today = new Date();
  const [robert] = await prisma.patient.createManyAndReturn({
    data: [
      { tenantId: city.id, name: 'Robert Johnson', age: 45, gender: 'Male', type: 'OPD', phoneNumber: '555-0101', address: '123 Main St, City', admissionDate: today },
      { tenantId: city.id, name: 'Mary Williams', age: 32, gender: 'Female', type: 'IPD', phoneNumber: '555-0102', address: '456 Oak Ave, City', admissionDate: today },
      { tenantId: city.id, name: 'James Davis', age: 67, gender: 'Male', type: 'IPD', phoneNumber: '555-0103', address: '789 Pine Rd, City', admissionDate: today },
    ],
  });

  await prisma.prescription.create({
    data: {
      tenantId: city.id,
      patientId: robert!.id,
      doctorId: doctor.id,
      medications: 'Amoxicillin 500mg - 3 times daily for 7 days\nParacetamol 500mg - as needed for fever',
      diagnosis: 'Acute Bronchitis',
      notes: 'Patient should rest and drink plenty of fluids. Follow up in 7 days if symptoms persist.',
    },
  });

  console.log(`Demo data loaded into ${redact(env.DATABASE_URL)}

  City Hospital   admin@city.com / admin123   (admin)
                  doc@city.com / doc123       (doctor)
                  nurse@city.com / nurse123   (receptionist)
  Galaxy Care     admin@galaxy.com / admin123 (admin)
`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
