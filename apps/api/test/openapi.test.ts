import { compileErrors, validate } from '@readme/openapi-parser';
import type { RequestHandler } from 'express';
import { describe, expect, it } from 'vitest';
import { apiRouters } from '../src/app';
import { operations, responseSchemaOf, responseSchemas } from '../src/modules/docs/openapi';
import { api, as, createPatient, createPrescription, hospital, PASSWORD, superAdmin } from './helpers';

const key = (method: string, path: string) => `${method.toUpperCase()} ${path}`;

describe('API docs', () => {
  it('serve a valid OpenAPI 3.1 document', async () => {
    const res = await api().get('/api/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.1.0');
    const result = await validate(structuredClone(res.body));
    expect(result.valid, result.valid ? '' : compileErrors(result)).toBe(true);
  });

  it('list exactly the routes the API has', () => {
    const noop: RequestHandler = (_req, _res, next) => next();
    const actual = apiRouters(noop).flatMap(([mount, router]) =>
      router.stack
        .filter((layer) => layer.route)
        .flatMap((layer) => {
          const route = layer.route!;
          const path = `${mount}${route.path === '/' ? '' : route.path}`
            .replace(/^\/api/, '')
            .replace(/:(\w+)/g, '{$1}');
          return Object.keys((route as unknown as { methods: Record<string, boolean> }).methods).map((m) =>
            key(m, path),
          );
        }),
    );
    const documented = operations.map((op) => key(op.method, op.path));
    expect([...documented].sort()).toEqual([...actual].sort());
  });

  it('answer every documented operation with its documented status and shape', async () => {
    const root = await superAdmin();
    const city = await hospital('City');
    const patient = await createPatient(city.tenant.id);
    const rx = await createPrescription(city.tenant.id, patient.id, city.doctor.id);
    const tenantId = city.tenant.id;
    // Records the write operations create, by operationId, for the ones that change or delete them.
    const made: Record<string, string> = {};
    // The record each {id} operation acts on, and body fields added to the documented example: a SUPER_ADMIN
    // (who runs everything here) must name the hospital and the doctor.
    const plan: Record<string, { id?: () => string | undefined; body?: () => object }> = {
      login: { body: () => ({ email: city.admin.email, password: PASSWORD }) },
      getUser: { id: () => city.doctor.id },
      createUser: { body: () => ({ tenantId }) },
      updateUser: { id: () => made['createUser'] },
      deleteUser: { id: () => made['createUser'] },
      getTenant: { id: () => tenantId },
      getPatient: { id: () => patient.id },
      createPatient: { body: () => ({ tenantId }) },
      updatePatient: { id: () => made['createPatient'] },
      deletePatient: { id: () => made['createPatient'] },
      getPrescription: { id: () => rx.id },
      createPrescription: { body: () => ({ tenantId, patientId: made['createPatient'], doctorId: city.doctor.id }) },
      updatePrescription: { id: () => made['createPrescription'] },
      deletePrescription: { id: () => made['createPrescription'] },
    };
    // Deletes last, in reverse (a prescription before its patient).
    const ordered = [
      ...operations.filter((op) => op.method !== 'delete'),
      ...operations.filter((op) => op.method === 'delete').reverse(),
    ];

    for (const op of ordered) {
      const step = plan[op.operationId] ?? {};
      const path = `/api${op.path.replace('{id}', step.id?.() ?? 'missing-from-plan')}`;
      const body = op.body && { ...op.body.example, ...step.body?.() };
      const res = await api()[op.method](path).set(as(root.id)).send(body);
      expect(res.status, `${op.operationId}: ${JSON.stringify(res.body)}`).toBe(op.response.status ?? 200);
      expect(responseSchemaOf(op).safeParse(res.body).error?.issues ?? [], op.operationId).toEqual([]);
      if (op.response.list) expect(res.body.length, `${op.operationId} returned an empty list`).toBeGreaterThan(0);
      if (op.method === 'post' && res.body.id) made[op.operationId] = res.body.id;
    }

    const failed = await api().post('/api/auth/login').send({ email: city.admin.email, password: 'wrong-password' });
    expect(failed.status).toBe(401);
    expect(responseSchemas.Error.safeParse(failed.body).error).toBeUndefined();
  });

  it('render the docs page with Scalar, pinned and integrity-checked, under a strict CSP', async () => {
    const res = await api().get('/api/docs');
    expect(res.status).toBe(200);
    expect(res.type).toBe('text/html');
    expect(res.text).toMatch(/data-url="\/api\/openapi.json"/);
    expect(res.text).toMatch(/@scalar\/api-reference@\d+\.\d+\.\d+\/.+integrity="sha384-[A-Za-z0-9+/]+={0,2}"/s);
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain("script-src 'self' https://cdn.jsdelivr.net;");
    expect(csp).toContain("connect-src 'self';");
  });

  it('can be turned off', async () => {
    expect((await api({ apiDocs: false }).get('/api/docs')).status).toBe(404);
    expect((await api({ apiDocs: false }).get('/api/openapi.json')).status).toBe(404);
  });
});
