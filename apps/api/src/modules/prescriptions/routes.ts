import { Router, type Request } from 'express';
import {
  createPrescriptionSchema,
  updatePrescriptionSchema,
  type MessageDto,
  type PrescriptionDto,
} from '@medi-cloud/shared';
import { prescriptionNames, toPrescriptionDto } from '../../lib/dto';
import { AppError, badRequest, notFound } from '../../lib/errors';
import { isUuid, parseId } from '../../lib/ids';
import { prisma } from '../../lib/prisma';
import { tenantForCreate, tenantScope } from '../../lib/tenancy';
import { authenticate, getAuth, requireRole } from '../../middleware/authenticate';

// Everyone may read prescriptions; doctors write them. A doctor may change or delete only their own.
export const prescriptionsRoutes = Router();
prescriptionsRoutes.use(authenticate);

async function findInScope(req: Request) {
  const id = parseId(req.params['id'], 'Prescription');
  const prescription = await prisma.prescription.findFirst({ where: { id, ...tenantScope(req) }, include: prescriptionNames });
  if (!prescription) throw notFound('Prescription');
  return prescription;
}

function assertOwnIfDoctor(req: Request, doctorId: string, action: 'update' | 'delete') {
  const { user } = getAuth(req);
  if (user.role === 'DOCTOR' && doctorId !== user.id) {
    throw new AppError(403, 'FORBIDDEN', `You can only ${action} your own prescriptions`);
  }
}

prescriptionsRoutes.get('/', async (req, res) => {
  const filter = (name: 'patientId' | 'doctorId') => {
    const value = req.query[name];
    if (typeof value !== 'string' || value === '') return {};
    // An id that isn't a UUID matches nothing.
    return { [name]: isUuid(value) ? value : '00000000-0000-0000-0000-000000000000' };
  };
  const prescriptions = await prisma.prescription.findMany({
    where: { ...tenantScope(req), ...filter('patientId'), ...filter('doctorId') },
    include: prescriptionNames,
    orderBy: { createdAt: 'desc' },
  });
  res.json(prescriptions.map(toPrescriptionDto) satisfies PrescriptionDto[]);
});

prescriptionsRoutes.get('/:id', async (req, res) => {
  res.json(toPrescriptionDto(await findInScope(req)) satisfies PrescriptionDto);
});

prescriptionsRoutes.post('/', requireRole('DOCTOR', 'SUPER_ADMIN'), async (req, res) => {
  const input = createPrescriptionSchema.parse(req.body);
  const { user } = getAuth(req);
  const tenantId = await tenantForCreate(req, input.tenantId);

  // The patient must belong to the same hospital: no prescriptions for other hospitals' patients.
  const patient = isUuid(input.patientId)
    ? await prisma.patient.findFirst({ where: { id: input.patientId, tenantId }, select: { id: true } })
    : null;
  if (!patient) throw notFound('Patient');

  // A SUPER_ADMIN may write on behalf of one of that hospital's doctors; everyone else writes as themselves.
  let doctorId = user.id;
  if (user.role === 'SUPER_ADMIN' && input.doctorId !== undefined) {
    const doctor = isUuid(input.doctorId)
      ? await prisma.user.findFirst({ where: { id: input.doctorId, tenantId, role: 'DOCTOR' }, select: { id: true } })
      : null;
    if (!doctor) throw badRequest('doctorId must be a doctor in that hospital');
    doctorId = doctor.id;
  }

  const prescription = await prisma.prescription.create({
    data: { tenantId, patientId: patient.id, doctorId, medications: input.medications, diagnosis: input.diagnosis, notes: input.notes },
    include: prescriptionNames,
  });
  res.status(201).json(toPrescriptionDto(prescription) satisfies PrescriptionDto);
});

prescriptionsRoutes.put('/:id', requireRole('DOCTOR', 'SUPER_ADMIN'), async (req, res) => {
  const input = updatePrescriptionSchema.parse(req.body);
  const prescription = await findInScope(req);
  assertOwnIfDoctor(req, prescription.doctorId, 'update');
  const updated = await prisma.prescription.update({ where: { id: prescription.id }, data: input, include: prescriptionNames });
  res.json(toPrescriptionDto(updated) satisfies PrescriptionDto);
});

prescriptionsRoutes.delete('/:id', requireRole('DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const prescription = await findInScope(req);
  assertOwnIfDoctor(req, prescription.doctorId, 'delete');
  await prisma.prescription.delete({ where: { id: prescription.id } });
  res.json({ message: 'Prescription deleted successfully' } satisfies MessageDto);
});
