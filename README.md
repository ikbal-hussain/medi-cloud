# 🏥 Medi Cloud

> Open-source, multi-tenant hospital management platform: React app and Express API in one repo.

**🌐 Live Application:** [https://medi-cloud-app.netlify.app/](https://medi-cloud-app.netlify.app/)

---

## ✨ Features

- 🔐 **JWT Authentication** - Secure login and registration
- 👥 **Role-Based Dashboard** - Different views for Admin, Doctor, and Receptionist
- 🏥 **Patient Management** - Add, view, and manage patients (OPD/IPD)
- 💊 **Prescription Management** - Create and manage digital prescriptions
- 👨‍⚕️ **Staff Management** - Add and manage hospital staff (Admin only)
- 📊 **Dashboard Analytics** - Real-time statistics and patient distribution
- 🎨 **Modern UI** - Beautiful, responsive design with Tailwind CSS

---

## 🚀 Quick Start

This is a monorepo: the React app is in `apps/web`, the API in `apps/api` (npm workspaces).

### Prerequisites

- Node.js 22.9 or newer (see `.nvmrc`)
- Docker (for PostgreSQL), or your own PostgreSQL 15+ and its URL in `apps/api/.env`

### Run it

```bash
git clone https://github.com/ikbal-hussain/medi-cloud.git
cd medi-cloud
npm install
npm run db:up                           # PostgreSQL in Docker
cp apps/api/.env.example apps/api/.env
npm run db:migrate                      # create the tables
npm run seed:demo                       # optional: demo hospitals and users (wipes the local database)
npm run dev                             # API on http://localhost:3000, app on http://localhost:5173
```

### Or run everything in Docker

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env   # once
docker compose up --build                           # app on http://localhost:8080 (WEB_PORT to change)
docker compose exec api npm run seed                # optional demo data
```

Demo logins after `seed:demo`: `admin@city.com` / `admin123`, `doc@city.com` / `doc123`, `nurse@city.com` / `nurse123`.

---

## 🛠️ Tech Stack

- **Web:** React 18, TypeScript, Vite, Tailwind CSS, Lucide icons
- **API:** TypeScript, Express 5, PostgreSQL, Prisma 7, zod, JWT, pino logs
- **Shared:** one package of zod schemas, types and error codes used by both
- **Tooling:** npm workspaces, ESLint, Vitest + Supertest (against real PostgreSQL), Playwright end-to-end tests, Docker, GitHub Actions CI, Dependabot

---

## 📁 Project Structure

```
medi-cloud/
├── apps/
│   ├── web/        React app (Vite): src/components, src/utils/api.ts, src/types
│   └── api/        REST API: prisma/ (schema, migrations, seed), src/modules (see apps/api/README.md)
├── packages/
│   └── shared/     zod schemas, response types, error codes, roles
├── docker-compose.yml          PostgreSQL for development, or the whole platform with `--build`
├── .github/workflows/ci.yml    lint, typecheck, migration check, tests, build on every PR
├── netlify.toml    web app deploy (Netlify builds apps/web)
└── package.json    workspace root and shared scripts
```

---

## 🔌 API Integration

The app calls the API at `VITE_API_URL`:
- **Development:** `http://localhost:3000/api` (when `VITE_API_URL` isn't set)
- **Production:** `https://medi-cloud-backend.vercel.app/api` (set on Netlify; still the old MongoDB API until the PostgreSQL deploy ships)

API endpoints are documented in [apps/api/README.md](apps/api/README.md).

---

## 📝 Available Scripts (run from the repo root)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the API and the app together |
| `npm run db:up` | Start PostgreSQL in Docker |
| `npm run db:migrate` | Apply database migrations |
| `npm run seed:demo` | Reset the local database and load demo data |
| `npm test` | Unit and API tests (needs PostgreSQL running) |
| `npm run test:e2e` | End-to-end tests in a real browser (Playwright); starts its own API and app |
| `npm run lint` / `typecheck` / `build` | Checks and production builds for every workspace |

---

## 🎭 User Roles

- **HOSPITAL_ADMIN** - Full access to manage hospital operations
- **DOCTOR** - Can create prescriptions and view patients
- **RECEPTIONIST** - Can manage patients

---

## 🗺️ Roadmap

Medi Cloud is becoming a fully open-source (MIT), self-hostable platform: TypeScript end to end on PostgreSQL, custom roles and permissions, email notifications, configurable AI assistants (Groq, Gemini, OpenRouter), appointments, billing, lab reports and a patient portal.

---
## 👤 Author

**Ikbal Hussain**

- GitHub: [@ikbal-hussain](https://github.com/ikbal-hussain)

---

**⭐ If you find this project helpful, please consider giving it a star!**

