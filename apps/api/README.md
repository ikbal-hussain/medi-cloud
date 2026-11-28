# 🏥 Medi Cloud API

REST API for Medi Cloud: multi-tenant (one tenant per hospital), JWT authentication, role-based access.
TypeScript, Express 5, PostgreSQL with Prisma 7, zod validation.

Live at `https://medi-cloud-backend.vercel.app/api` (see [Deploying](#deploying-vercel--neon)).

**📖 Interactive API docs: [medi-cloud-backend.vercel.app/api/docs](https://medi-cloud-backend.vercel.app/api/docs)** (locally: http://localhost:3000/api/docs). Every endpoint, its roles, request and response shapes, with a "try it" button. They are generated from the same zod schemas the API validates with, and the tests fail if a route is undocumented, or if any operation's success response doesn't match its documented status and shape. The raw OpenAPI 3.1 document is at `/api/openapi.json`, ready for Postman, Insomnia or client generators.

## Run it locally

From the repo root (see the root README for the whole app):

```bash
npm install
npm run db:up                           # PostgreSQL 17 in Docker on localhost:5432
cp apps/api/.env.example apps/api/.env  # then adjust if needed
npm run db:migrate                      # create the tables
npm run seed:demo                       # optional: demo hospitals and users (replaces all hospitals; keeps super admins)
npm run dev -w @medi-cloud/api          # http://localhost:3000
```

## Configuration

All settings are environment variables, validated at startup (`src/config/env.ts`); the API refuses to start with a clear message if one is wrong. See [.env.example](.env.example).

| Variable          | Default                              | Notes                                                                                                                                                                                                                   |
| ----------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`    | (required)                           | PostgreSQL connection string                                                                                                                                                                                            |
| `JWT_SECRET`      | dev-only fallback                    | **Required when deployed** (`NODE_ENV=production` or on Vercel)                                                                                                                                                         |
| `JWT_EXPIRES_IN`  | `7d`                                 | Login token lifetime: whole seconds (`3600`) or a duration (`12h`, `7d`)                                                                                                                                                |
| `PORT`            | `3000`                               |                                                                                                                                                                                                                         |
| `CORS_ORIGINS`    | `https://medi-cloud-app.netlify.app` | Comma-separated; `*` matches part of one host label, e.g. `https://deploy-preview-*--medi-cloud-app.netlify.app`. Any `http://localhost` port is allowed when not deployed.                                             |
| `AUTH_RATE_LIMIT` | `20`                                 | Login/register attempts per IP per 15 minutes; `0` turns it off                                                                                                                                                         |
| `TRUST_PROXY`     | `1` on Vercel, else `0`              | Proxies in front of the API whose `X-Forwarded-For` gives the client IP. Set to `1` behind nginx or a load balancer; leave `0` when the API is exposed directly, or clients could fake their IP to dodge the rate limit |
| `LOG_LEVEL`       | `info`                               | JSON logs (pino); one line per request, no headers or bodies                                                                                                                                                            |
| `API_DOCS`        | `true`                               | Serve the interactive API docs at `/api/docs` and the OpenAPI document at `/api/openapi.json`                                                                                                                           |

## Scripts (`npm run <script> -w @medi-cloud/api`)

| Script               | What it does                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev`                | Watch mode with `tsx`                                                                                                                         |
| `build` / `start`    | Bundle to `dist/` with tsup, then run it                                                                                                      |
| `test`               | Vitest + Supertest against a real PostgreSQL test database (`TEST_DATABASE_URL`, default `medi_cloud_test` on the Docker one)                 |
| `typecheck`          | `tsc --noEmit`                                                                                                                                |
| `db:migrate`         | Apply migrations; after editing `prisma/schema.prisma`, also creates the new migration                                                        |
| `db:deploy`          | Apply migrations only (production)                                                                                                            |
| `db:check`           | Fails if `schema.prisma` has changes no migration covers (runs in CI)                                                                         |
| `db:studio`          | Browse the database                                                                                                                           |
| `seed`               | Replaces all hospitals, staff and patients with demo data (super admins are kept). Refuses a non-local database unless `ALLOW_DEMO_RESET=yes` |
| `create-super-admin` | Platform super admin from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` (12+ characters; no default)                                           |

## Deploying (Vercel + Neon)

The live API is the Vercel project `medi-cloud-backend`, built from this folder (Root Directory `apps/api`). Every push to `main` deploys it.

- **Region:** Singapore (`sin1` in [vercel.json](vercel.json)), next to its Neon PostgreSQL. Each request makes several database queries, so the API and the database share a region.
- **Settings:** `JWT_SECRET` and `CORS_ORIGINS` are set on the project. The Neon integration adds `DATABASE_URL` (pooled, used by the API) and `DATABASE_URL_UNPOOLED` (a direct connection).
- **Keep the database variables on Production only.** Preview deployments run unreviewed PR code (Dependabot's included) and must never reach the live database. Previews therefore have no database: they prove the build, nothing more.
- **Migrations run on each production deploy**, after a successful build ([scripts/vercel-build.sh](scripts/vercel-build.sh)). They use `DATABASE_URL_UNPOOLED`, because the pooled connection can't hold the lock migrations take, and the build fails if it's missing. Preview deployments skip them, and the build log says so.
- **Keep every migration backward-compatible.** Migrations run before Vercel switches traffic to the new deployment, and Vercel doesn't wait for CI, so the old code briefly runs on the new schema. Add a column first and drop the old one in a later release, never in the same one. If a migration fails, later deploys stop with `P3009` until it is fixed and marked with `prisma migrate resolve`.
- **Demo data:** `ALLOW_DEMO_RESET=yes DATABASE_URL=… npm run seed -w @medi-cloud/api` replaces every hospital, staff member and patient with the demo set, in one transaction. Super admins are kept, and writes made during the reset wait for it to finish.
- **First super admin:** `DATABASE_URL=… SUPER_ADMIN_EMAIL=… SUPER_ADMIN_PASSWORD=… npm run create-super-admin -w @medi-cloud/api`. Keep it private: it can see, change and delete every hospital's staff, patients and prescriptions.

Any other host works the same way: `npm run build && npm start` with `DATABASE_URL` and `JWT_SECRET` set, after `npm run db:deploy`.

## Roles

| Role             | Can                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `SUPER_ADMIN`    | Everything, in every hospital (`?tenantId=` to filter; creating staff, patients or prescriptions requires `tenantId` in the body) |
| `HOSPITAL_ADMIN` | Manage staff and patients; read and delete prescriptions, in their hospital                                                       |
| `DOCTOR`         | Add and edit patients; write prescriptions, and change or delete their own                                                        |
| `RECEPTIONIST`   | Manage patients (including delete); read prescriptions                                                                            |

Every hospital's data is invisible to other hospitals: another hospital's record answers 404, as if it didn't exist.

## Endpoints

All under `/api`. Authenticated routes need `Authorization: Bearer <token>`.

| Method               | Path                                  | Who                                                                                   |
| -------------------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| `GET`                | `/health`                             | anyone: server up (no database)                                                       |
| `GET`                | `/health/db`                          | anyone: database reachable (503 if not)                                               |
| `GET`                | `/docs`, `/openapi.json`              | anyone: interactive API docs and the OpenAPI 3.1 document (off with `API_DOCS=false`) |
| `POST`               | `/auth/register`                      | anyone: new hospital + its first admin → `{ token, user, tenant }`                    |
| `POST`               | `/auth/login`                         | anyone → `{ token, user, tenant }`                                                    |
| `GET`                | `/auth/me`                            | any user → `{ user, tenant }`                                                         |
| `GET` `POST`         | `/users`                              | admins                                                                                |
| `GET` `PUT` `DELETE` | `/users/:id`                          | admins (a staff member with prescriptions can't be deleted)                           |
| `GET`                | `/tenants`, `/tenants/:id`            | super admin                                                                           |
| `GET` `POST`         | `/patients`                           | any user                                                                              |
| `GET` `PUT`          | `/patients/:id`                       | any user                                                                              |
| `DELETE`             | `/patients/:id`                       | admins, receptionists (not a patient with prescriptions: discharge instead)           |
| `GET`                | `/prescriptions?patientId=&doctorId=` | any user; each includes `patientName` and `doctorName`                                |
| `POST`               | `/prescriptions`                      | doctors (and super admin, on behalf of a doctor)                                      |
| `GET`                | `/prescriptions/:id`                  | any user                                                                              |
| `PUT`                | `/prescriptions/:id`                  | the doctor who wrote it (and super admin)                                             |
| `DELETE`             | `/prescriptions/:id`                  | the doctor who wrote it, admins                                                       |

Request bodies are defined once in [`packages/shared/src/schemas.ts`](../../packages/shared/src/schemas.ts) and used by both the API and the web app.

## Requests and errors

Request bodies are JSON (form-encoded bodies are accepted too). Every error is JSON: `{ "error": "<message for people>", "code": "<stable code>", "details"?: [{ "path", "message" }] }`.

| Status | `code`                                        | When                                                    |
| ------ | --------------------------------------------- | ------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`                            | A field is missing or invalid (`details` lists each)    |
| 400    | `INVALID_JSON`                                | The body isn't valid JSON                               |
| 401    | `NO_TOKEN`, `INVALID_TOKEN`, `USER_NOT_FOUND` | The session is no good: log in again                    |
| 401    | `INVALID_CREDENTIALS`                         | Wrong email or password (same answer for both)          |
| 403    | `FORBIDDEN`                                   | The role can't do this                                  |
| 404    | `NOT_FOUND`                                   | No such record in your hospital                         |
| 409    | `EMAIL_TAKEN`, `CONFLICT`                     | Email in use; record still referenced                   |
| 429    | `RATE_LIMITED`                                | Too many sign-in attempts                               |
| 503    | `SERVICE_UNAVAILABLE`                         | Database unreachable: retry; the session is still valid |
| 500    | `INTERNAL`                                    | A bug; details are only in the server log               |

## Layout

```
apps/api/
├── prisma/            schema.prisma, migrations/, seed.ts
├── src/
│   ├── app.ts         Express app: security headers, CORS, logging, rate limit, routes
│   ├── server.ts      Long-running server (local, Docker)
│   ├── vercel.ts      Vercel entry (api/index.js re-exports the built app)
│   ├── config/env.ts  Validated settings
│   ├── lib/           Prisma client, errors, JWT, passwords, tenancy rules, response mapping
│   ├── middleware/    authenticate + requireRole, error handler
│   └── modules/       auth, users, tenants, patients, prescriptions, health, docs (one router each)
├── scripts/           create-super-admin, local-database guard
└── test/              API tests (one PostgreSQL database, wiped per test)
```
