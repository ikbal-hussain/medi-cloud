import { z } from 'zod';
import {
  apiErrorBodySchema,
  authResponseDtoSchema,
  createPatientSchema,
  createPrescriptionSchema,
  createUserSchema,
  loginSchema,
  messageDtoSchema,
  patientDtoSchema,
  prescriptionDtoSchema,
  registerSchema,
  sessionDtoSchema,
  tenantDtoSchema,
  updatePatientSchema,
  updatePrescriptionSchema,
  updateUserSchema,
  userDtoSchema,
  type Role,
} from '@medi-cloud/shared';
import pkg from '../../../package.json';

// The OpenAPI 3.1 description of the API, served at /api/openapi.json and rendered at /api/docs.
// Request and response shapes come from the same zod schemas the API validates with and the tests check
// responses against, and a test fails if a route exists without being listed here (or the other way round).

export const healthSchema = z.strictObject({ status: z.literal('OK'), message: z.string() });
export const databaseHealthSchema = z.strictObject({ status: z.literal('OK'), database: z.literal('up') });

const requestSchemas = {
  RegisterRequest: registerSchema,
  LoginRequest: loginSchema,
  CreateUserRequest: createUserSchema,
  UpdateUserRequest: updateUserSchema,
  CreatePatientRequest: createPatientSchema,
  UpdatePatientRequest: updatePatientSchema,
  CreatePrescriptionRequest: createPrescriptionSchema,
  UpdatePrescriptionRequest: updatePrescriptionSchema,
};

export const responseSchemas = {
  Health: healthSchema,
  DatabaseHealth: databaseHealthSchema,
  AuthResponse: authResponseDtoSchema,
  Session: sessionDtoSchema,
  User: userDtoSchema,
  Tenant: tenantDtoSchema,
  Patient: patientDtoSchema,
  Prescription: prescriptionDtoSchema,
  Message: messageDtoSchema,
  Error: apiErrorBodySchema,
};

type Access = 'public' | 'signed-in' | Role[];

export interface Operation {
  method: 'get' | 'post' | 'put' | 'delete';
  /** OpenAPI style, relative to /api, e.g. /patients/{id}. */
  path: string;
  operationId: string;
  tag: string;
  summary: string;
  description?: string;
  access: Access;
  /** Query parameters (all optional strings): name → description. */
  query?: Record<string, string>;
  body?: { schema: keyof typeof requestSchemas; example?: Record<string, unknown> };
  response: { schema: keyof typeof responseSchemas; list?: true; status?: 200 | 201 };
  /** Errors beyond the ones implied by access, body and {id}: status → when. */
  errors?: Record<number, string>;
}

const ADMINS: Role[] = ['SUPER_ADMIN', 'HOSPITAL_ADMIN'];
const tenantQuery = { tenantId: 'SUPER_ADMIN only: just this hospital. Others always get their own.' };

export const operations: Operation[] = [
  {
    method: 'get',
    path: '/health',
    operationId: 'health',
    tag: 'System',
    summary: 'Is the server up?',
    description: 'Answers without touching the database, so it shows the server itself is running.',
    access: 'public',
    response: { schema: 'Health' },
  },
  {
    method: 'get',
    path: '/health/db',
    operationId: 'databaseHealth',
    tag: 'System',
    summary: 'Is the database reachable?',
    access: 'public',
    response: { schema: 'DatabaseHealth' },
    errors: { 503: 'The database is unreachable (SERVICE_UNAVAILABLE)' },
  },
  {
    method: 'post',
    path: '/auth/register',
    operationId: 'register',
    tag: 'Auth',
    summary: 'Register a hospital and its first admin',
    description: 'Creates the hospital (tenant) and a HOSPITAL_ADMIN, and logs them in.',
    access: 'public',
    body: {
      schema: 'RegisterRequest',
      example: {
        hospitalName: 'Sunrise Clinic',
        adminEmail: 'owner@sunrise.test',
        adminName: 'Dr. Asha Rao',
        password: 'a-long-passphrase',
      },
    },
    response: { schema: 'AuthResponse', status: 201 },
    errors: {
      409: 'The email is already registered (EMAIL_TAKEN)',
      429: 'Too many attempts from this IP (RATE_LIMITED)',
    },
  },
  {
    method: 'post',
    path: '/auth/login',
    operationId: 'login',
    tag: 'Auth',
    summary: 'Log in',
    description: 'Returns a token to send as `Authorization: Bearer <token>`.',
    access: 'public',
    body: { schema: 'LoginRequest', example: { email: 'admin@city.com', password: 'admin123' } },
    response: { schema: 'AuthResponse' },
    errors: {
      401: 'Wrong email or password (INVALID_CREDENTIALS)',
      429: 'Too many attempts from this IP (RATE_LIMITED)',
    },
  },
  {
    method: 'get',
    path: '/auth/me',
    operationId: 'me',
    tag: 'Auth',
    summary: 'Who am I?',
    access: 'signed-in',
    response: { schema: 'Session' },
  },
  {
    method: 'get',
    path: '/users',
    operationId: 'listUsers',
    tag: 'Staff',
    summary: 'List staff',
    access: ADMINS,
    query: tenantQuery,
    response: { schema: 'User', list: true },
  },
  {
    method: 'get',
    path: '/users/{id}',
    operationId: 'getUser',
    tag: 'Staff',
    summary: 'Get a staff member',
    access: ADMINS,
    response: { schema: 'User' },
  },
  {
    method: 'post',
    path: '/users',
    operationId: 'createUser',
    tag: 'Staff',
    summary: 'Add a staff member',
    description: 'In your own hospital. A SUPER_ADMIN may name another with `tenantId`.',
    access: ADMINS,
    body: {
      schema: 'CreateUserRequest',
      example: { email: 'new.doctor@city.com', password: 'a-long-passphrase', name: 'Dr. New Doctor', role: 'DOCTOR' },
    },
    response: { schema: 'User', status: 201 },
    errors: { 409: 'The email is already registered (EMAIL_TAKEN)' },
  },
  {
    method: 'put',
    path: '/users/{id}',
    operationId: 'updateUser',
    tag: 'Staff',
    summary: 'Change a staff member',
    description: 'Send only the fields to change. You cannot change your own role.',
    access: ADMINS,
    body: { schema: 'UpdateUserRequest', example: { name: 'Dr. Renamed' } },
    response: { schema: 'User' },
    errors: { 409: 'The email is already registered (EMAIL_TAKEN)' },
  },
  {
    method: 'delete',
    path: '/users/{id}',
    operationId: 'deleteUser',
    tag: 'Staff',
    summary: 'Remove a staff member',
    access: ADMINS,
    response: { schema: 'Message' },
    errors: { 400: 'You cannot delete yourself', 409: 'They have written prescriptions, so the account is kept' },
  },
  {
    method: 'get',
    path: '/tenants',
    operationId: 'listTenants',
    tag: 'Hospitals',
    summary: 'List hospitals',
    access: ['SUPER_ADMIN'],
    response: { schema: 'Tenant', list: true },
  },
  {
    method: 'get',
    path: '/tenants/{id}',
    operationId: 'getTenant',
    tag: 'Hospitals',
    summary: 'Get a hospital',
    access: ['SUPER_ADMIN'],
    response: { schema: 'Tenant' },
  },
  {
    method: 'get',
    path: '/patients',
    operationId: 'listPatients',
    tag: 'Patients',
    summary: 'List patients',
    description: 'Newest first.',
    access: 'signed-in',
    query: tenantQuery,
    response: { schema: 'Patient', list: true },
  },
  {
    method: 'get',
    path: '/patients/{id}',
    operationId: 'getPatient',
    tag: 'Patients',
    summary: 'Get a patient',
    access: 'signed-in',
    response: { schema: 'Patient' },
  },
  {
    method: 'post',
    path: '/patients',
    operationId: 'createPatient',
    tag: 'Patients',
    summary: 'Admit a patient',
    access: 'signed-in',
    body: {
      schema: 'CreatePatientRequest',
      example: {
        name: 'Anita Das',
        age: 41,
        gender: 'Female',
        type: 'OPD',
        phoneNumber: '555-0142',
        address: '12 Lake Road',
        admissionDate: '2026-11-28T09:00:00.000Z',
      },
    },
    response: { schema: 'Patient', status: 201 },
  },
  {
    method: 'put',
    path: '/patients/{id}',
    operationId: 'updatePatient',
    tag: 'Patients',
    summary: 'Change a patient',
    description: 'Send only the fields to change.',
    access: 'signed-in',
    body: { schema: 'UpdatePatientRequest', example: { status: 'Discharged' } },
    response: { schema: 'Patient' },
  },
  {
    method: 'delete',
    path: '/patients/{id}',
    operationId: 'deletePatient',
    tag: 'Patients',
    summary: 'Delete a patient',
    access: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST'],
    response: { schema: 'Message' },
    errors: { 409: 'The patient has prescriptions: mark them Discharged instead' },
  },
  {
    method: 'get',
    path: '/prescriptions',
    operationId: 'listPrescriptions',
    tag: 'Prescriptions',
    summary: 'List prescriptions',
    description: 'Newest first.',
    access: 'signed-in',
    query: { ...tenantQuery, patientId: 'Only this patient’s', doctorId: 'Only this doctor’s' },
    response: { schema: 'Prescription', list: true },
  },
  {
    method: 'get',
    path: '/prescriptions/{id}',
    operationId: 'getPrescription',
    tag: 'Prescriptions',
    summary: 'Get a prescription',
    access: 'signed-in',
    response: { schema: 'Prescription' },
  },
  {
    method: 'post',
    path: '/prescriptions',
    operationId: 'createPrescription',
    tag: 'Prescriptions',
    summary: 'Write a prescription',
    description:
      'A doctor writes as themselves, for a patient of their hospital. A SUPER_ADMIN must name the doctor (`doctorId`).',
    access: ['DOCTOR', 'SUPER_ADMIN'],
    body: {
      schema: 'CreatePrescriptionRequest',
      example: {
        patientId: '00000000-0000-7000-8000-000000000000',
        medications: 'Paracetamol 500mg - as needed for fever',
        diagnosis: 'Viral fever',
        notes: 'Rest and fluids. Review in 3 days.',
      },
    },
    response: { schema: 'Prescription', status: 201 },
    errors: { 404: 'No such patient in that hospital' },
  },
  {
    method: 'put',
    path: '/prescriptions/{id}',
    operationId: 'updatePrescription',
    tag: 'Prescriptions',
    summary: 'Change a prescription',
    description: 'Send only the fields to change. A doctor may change only their own.',
    access: ['DOCTOR', 'SUPER_ADMIN'],
    body: { schema: 'UpdatePrescriptionRequest', example: { notes: 'Review in 5 days instead.' } },
    response: { schema: 'Prescription' },
  },
  {
    method: 'delete',
    path: '/prescriptions/{id}',
    operationId: 'deletePrescription',
    tag: 'Prescriptions',
    summary: 'Delete a prescription',
    description: 'A doctor may delete only their own.',
    access: ['DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'],
    response: { schema: 'Message' },
  },
];

/** The zod schema a successful response of `op` must match. */
export function responseSchemaOf(op: Operation): z.ZodType {
  const schema = responseSchemas[op.response.schema];
  return op.response.list ? z.array(schema) : schema;
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object, example?: unknown) => ({
  'application/json': { schema, ...(example !== undefined && { example }) },
});

/** JSON Schemas for OpenAPI components, with references between them. */
function componentSchemas(schemas: Record<string, z.ZodType>, io: 'input' | 'output') {
  const registry = z.registry<{ id: string }>();
  for (const [id, schema] of Object.entries(schemas)) registry.add(schema, { id });
  const { schemas: out } = z.toJSONSchema(registry, {
    io,
    uri: (id) => `#/components/schemas/${id}`,
    // Dates are sent as ISO 8601 strings.
    unrepresentable: 'any',
    override: (ctx) => {
      if (ctx.zodSchema._zod.def.type === 'date')
        Object.assign(ctx.jsonSchema, { type: 'string', format: 'date-time' });
    },
  });
  // Each comes out as a standalone JSON Schema document; as a component it needs neither header.
  for (const schema of Object.values(out)) {
    delete schema.$schema;
    delete schema.$id;
  }
  return out;
}

function errorResponses(op: Operation) {
  const errors: Record<number, string> = {};
  if (op.body) errors[400] = 'Invalid input (VALIDATION_ERROR, with `details`)';
  if (op.access !== 'public') errors[401] = 'No token, or an invalid one (NO_TOKEN, INVALID_TOKEN, USER_NOT_FOUND)';
  if (Array.isArray(op.access)) errors[403] = 'Your role may not do this (FORBIDDEN)';
  if (op.path.includes('{id}')) errors[404] = 'Not found, or in another hospital (NOT_FOUND)';
  Object.assign(errors, op.errors);
  return Object.fromEntries(
    Object.entries(errors).map(([status, description]) => [status, { description, content: json(ref('Error')) }]),
  );
}

function accessText(access: Access) {
  if (access === 'public') return 'No login needed.';
  if (access === 'signed-in') return 'Any logged-in user, in their own hospital.';
  return `Roles: ${access.join(', ')}.`;
}

const DESCRIPTION = `REST API of [Medi Cloud](https://github.com/ikbal-hussain/medi-cloud), an open-source, multi-tenant hospital management platform.

**Try it:** call **POST /auth/login** with a demo login (\`admin@city.com\` / \`admin123\`, \`doc@city.com\` / \`doc123\`, \`nurse@city.com\` / \`nurse123\`), then paste the \`token\` under *Authentication*.

- **Hospitals are isolated.** Everyone works inside their own hospital (tenant); another hospital's records answer 404. Only a \`SUPER_ADMIN\` sees across hospitals, and can narrow lists with \`?tenantId=\`.
- **Errors** are \`{ error, code, details? }\`. Branch on \`code\`; \`error\` is for people.
- **503 \`SERVICE_UNAVAILABLE\`** on any endpoint means the database is unreachable: retry shortly.`;

let cached: object | undefined;

/** The OpenAPI document (built once). */
export function openApiDocument(): object {
  cached ??= {
    openapi: '3.1.0',
    info: {
      title: 'Medi Cloud API',
      version: pkg.version,
      description: DESCRIPTION,
      license: { name: 'MIT', identifier: 'MIT' },
    },
    servers: [{ url: '/api' }],
    tags: ['Auth', 'Patients', 'Prescriptions', 'Staff', 'Hospitals', 'System'].map((name) => ({ name })),
    paths: operations.reduce<Record<string, Record<string, object>>>((paths, op) => {
      const pathParams = [...op.path.matchAll(/\{(\w+)\}/g)].map(([, name]) => ({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      }));
      const queryParams = Object.entries(op.query ?? {}).map(([name, description]) => ({
        name,
        in: 'query',
        required: false,
        description,
        schema: { type: 'string', format: 'uuid' },
      }));
      const status = op.response.status ?? 200;
      const success = op.response.list ? { type: 'array', items: ref(op.response.schema) } : ref(op.response.schema);
      (paths[op.path] ??= {})[op.method] = {
        operationId: op.operationId,
        tags: [op.tag],
        summary: op.summary,
        description: [accessText(op.access), op.description].filter(Boolean).join(' '),
        security: op.access === 'public' ? [] : [{ bearerAuth: [] }],
        ...(pathParams.length + queryParams.length > 0 && { parameters: [...pathParams, ...queryParams] }),
        ...(op.body && {
          requestBody: { required: true, content: json(ref(op.body.schema), op.body.example) },
        }),
        responses: {
          [status]: { description: status === 201 ? 'Created' : 'OK', content: json(success) },
          ...errorResponses(op),
        },
      };
      return paths;
    }, {}),
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: { ...componentSchemas(requestSchemas, 'input'), ...componentSchemas(responseSchemas, 'output') },
    },
  };
  return cached;
}
