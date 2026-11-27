# 🏥 Medi Cloud API

REST API for Medi Cloud: multi-tenant (one tenant per hospital), JWT authentication, role-based access.
TypeScript, Express 5, PostgreSQL with Prisma 7, zod validation.

> ⚠️ **Not deployed from here yet.** The live API (`https://medi-cloud-backend.vercel.app/api`) still runs the old
> MongoDB version from [medi-cloud-backend](https://github.com/ikbal-hussain/medi-cloud-backend). It moves to this
> folder when the PostgreSQL deploy ships.

## Run it locally

From the repo root (see the root README for the whole app):

```bash
npm install
npm run db:up                           # PostgreSQL 17 in Docker on localhost:5432
cp apps/api/.env.example apps/api/.env  # then adjust if needed
npm run db:migrate                      # create the tables
npm run seed:demo                       # optional: demo hospitals and users (wipes the local database)
npm run dev -w @medi-cloud/api          # http://localhost:3000
```

## Configuration

All settings are environment variables, validated at startup (`src/config/env.ts`); the API refuses to start with a clear message if one is wrong. See [.env.example](.env.example).

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `JWT_SECRET` | dev-only fallback | **Required when deployed** (`NODE_ENV=production` or on Vercel) |
| `JWT_EXPIRES_IN` | `7d` | Login token lifetime |
| `PORT` | `3000` | |
| `CORS_ORIGINS` | `https://medi-cloud-app.netlify.app` | Comma-separated; `*` matches part of one host label, e.g. `https://deploy-preview-*--medi-cloud-app.netlify.app`. Any `http://localhost` port is allowed when not deployed. |
| `AUTH_RATE_LIMIT` | `20` | Login/register attempts per IP per 15 minutes; `0` turns it off |
| `LOG_LEVEL` | `info` | JSON logs (pino); one line per request, no headers or bodies |

## Scripts (`npm run <script> -w @medi-cloud/api`)

| Script | What it does |
|---|---|
| `dev` | Watch mode with `tsx` |
| `build` / `start` | Bundle to `dist/` with tsup, then run it |
| `test` | Vitest + Supertest against a real PostgreSQL test database (`TEST_DATABASE_URL`, default `medi_cloud_test` on the Docker one) |
| `typecheck` | `tsc --noEmit` |
| `db:migrate` | Apply migrations; after editing `prisma/schema.prisma`, also creates the new migration |
| `db:deploy` | Apply migrations only (production) |
| `db:check` | Fails if `schema.prisma` has changes no migration covers (runs in CI) |
| `db:studio` | Browse the database |
| `seed` | Demo data. Refuses a non-local database unless `ALLOW_DEMO_RESET=yes` |
| `create-super-admin` | Platform super admin from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` (12+ characters; no default) |

## Roles

| Role | Can |
|---|---|
| `SUPER_ADMIN` | Everything, in every hospital (`?tenantId=` to filter; `tenantId` in a body to act in one) |
| `HOSPITAL_ADMIN` | Manage staff and patients; read and delete prescriptions, in their hospital |
| `DOCTOR` | Add and edit patients; write prescriptions, and change or delete their own |
| `RECEPTIONIST` | Manage patients (including delete); read prescriptions |

Every hospital's data is invisible to other hospitals: another hospital's record answers 404, as if it didn't exist.

## Endpoints

All under `/api`. Authenticated routes need `Authorization: Bearer <token>`.

| Method | Path | Who |
|---|---|---|
| `GET` | `/health` | anyone: server up (no database) |
| `GET` | `/health/db` | anyone: database reachable (503 if not) |
| `POST` | `/auth/register` | anyone: new hospital + its first admin → `{ token, user, tenant }` |
| `POST` | `/auth/login` | anyone → `{ token, user, tenant }` |
| `GET` | `/auth/me` | any user → `{ user, tenant }` |
| `GET` `POST` | `/users` | admins |
| `GET` `PUT` `DELETE` | `/users/:id` | admins (a staff member with prescriptions can't be deleted) |
| `GET` | `/tenants`, `/tenants/:id` | super admin |
| `GET` `POST` | `/patients` | any user |
| `GET` `PUT` | `/patients/:id` | any user |
| `DELETE` | `/patients/:id` | admins, receptionists (not a patient with prescriptions: discharge instead) |
| `GET` | `/prescriptions?patientId=&doctorId=` | any user; each includes `patientName` and `doctorName` |
| `POST` | `/prescriptions` | doctors (and super admin, on behalf of a doctor) |
| `GET` | `/prescriptions/:id` | any user |
| `PUT` | `/prescriptions/:id` | the doctor who wrote it (and super admin) |
| `DELETE` | `/prescriptions/:id` | the doctor who wrote it, admins |

Request bodies are defined once in [`packages/shared/src/schemas.ts`](../../packages/shared/src/schemas.ts) and used by both the API and the web app.

## Errors

Every error is JSON: `{ "error": "<message for people>", "code": "<stable code>", "details"?: [{ "path", "message" }] }`.

| Status | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | A field is missing or invalid (`details` lists each) |
| 400 | `INVALID_JSON` | The body isn't valid JSON |
| 401 | `NO_TOKEN`, `INVALID_TOKEN`, `USER_NOT_FOUND` | The session is no good: log in again |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password (same answer for both) |
| 403 | `FORBIDDEN` | The role can't do this |
| 404 | `NOT_FOUND` | No such record in your hospital |
| 409 | `EMAIL_TAKEN`, `CONFLICT` | Email in use; record still referenced |
| 429 | `RATE_LIMITED` | Too many sign-in attempts |
| 503 | `SERVICE_UNAVAILABLE` | Database unreachable: retry; the session is still valid |
| 500 | `INTERNAL` | A bug; details are only in the server log |

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
│   └── modules/       auth, users, tenants, patients, prescriptions (one router each)
├── scripts/           create-super-admin, local-database guard
└── test/              API tests (one PostgreSQL database, wiped per test)
```
