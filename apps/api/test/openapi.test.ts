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

  it('describe what each read endpoint really returns', async () => {
    const root = await superAdmin();
    const city = await hospital('City');
    const patient = await createPatient(city.tenant.id);
    const rx = await createPrescription(city.tenant.id, patient.id, city.doctor.id);
    const ids: Record<string, string> = {
      '/users/{id}': city.doctor.id,
      '/tenants/{id}': city.tenant.id,
      '/patients/{id}': patient.id,
      '/prescriptions/{id}': rx.id,
    };

    for (const op of operations.filter((o) => o.method === 'get')) {
      const res = await api()
        .get(`/api${op.path.replace('{id}', ids[op.path] ?? '')}`)
        .set(as(root.id));
      expect(res.status, op.operationId).toBe(200);
      if (op.response.list) expect(res.body.length, `${op.operationId} returned an empty list`).toBeGreaterThan(0);
      const parsed = responseSchemaOf(op).safeParse(res.body);
      expect(parsed.error?.issues ?? [], op.operationId).toEqual([]);
    }

    const login = await api().post('/api/auth/login').send({ email: city.admin.email, password: PASSWORD });
    expect(
      responseSchemaOf(operations.find((o) => o.operationId === 'login')!).safeParse(login.body).error,
    ).toBeUndefined();
    const failed = await api().post('/api/auth/login').send({ email: city.admin.email, password: 'wrong-password' });
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
