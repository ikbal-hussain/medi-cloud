import { Router, type Request } from 'express';
import { createPatientSchema, updatePatientSchema, type MessageDto, type PatientDto } from '@medi-cloud/shared';
import { toPatientDto } from '../../lib/dto';
import { conflict, notFound } from '../../lib/errors';
import { parseId } from '../../lib/ids';
import { prisma } from '../../lib/prisma';
import { tenantForCreate, tenantScope } from '../../lib/tenancy';
import { authenticate, requireRole } from '../../middleware/authenticate';

// Every role works with patients; only admins and receptionists may delete one.
export const patientsRoutes = Router();
patientsRoutes.use(authenticate);

async function findInScope(req: Request) {
  const patient = await prisma.patient.findFirst({
    where: { id: parseId(req.params['id'], 'Patient'), ...tenantScope(req) },
  });
  if (!patient) throw notFound('Patient');
  return patient;
}

patientsRoutes.get('/', async (req, res) => {
  const patients = await prisma.patient.findMany({ where: tenantScope(req), orderBy: { createdAt: 'desc' } });
  res.json(patients.map(toPatientDto) satisfies PatientDto[]);
});

patientsRoutes.get('/:id', async (req, res) => {
  res.json(toPatientDto(await findInScope(req)) satisfies PatientDto);
});

patientsRoutes.post('/', async (req, res) => {
  const { tenantId: requested, ...input } = createPatientSchema.parse(req.body);
  const tenantId = await tenantForCreate(req, requested);
  const patient = await prisma.patient.create({ data: { ...input, tenantId } });
  res.status(201).json(toPatientDto(patient) satisfies PatientDto);
});

patientsRoutes.put('/:id', async (req, res) => {
  const input = updatePatientSchema.parse(req.body);
  const patient = await findInScope(req);
  const updated = await prisma.patient.update({ where: { id: patient.id }, data: input });
  res.json(toPatientDto(updated) satisfies PatientDto);
});

patientsRoutes.delete('/:id', requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST'), async (req, res) => {
  const patient = await findInScope(req);
  if (await prisma.prescription.count({ where: { patientId: patient.id } })) {
    throw conflict("This patient has prescriptions, so they can't be deleted. Mark them as Discharged instead");
  }
  await prisma.patient.delete({ where: { id: patient.id } });
  res.json({ message: 'Patient deleted successfully' } satisfies MessageDto);
});
