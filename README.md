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

- Node.js 20 or newer (22 recommended, see `.nvmrc`)
- MongoDB running locally (`mongodb://localhost:27017`), or set `MONGODB_URI`

### Run it

```bash
git clone https://github.com/ikbal-hussain/medi-cloud.git
cd medi-cloud
npm install
npm run seed:demo   # optional: demo hospitals and users (wipes the database first)
npm run dev         # API on http://localhost:3000, app on http://localhost:5173
```

Demo logins after `seed:demo`: `admin@city.com` / `admin123`, `doc@city.com` / `doc123`, `nurse@city.com` / `nurse123`.

---

## 🛠️ Tech Stack

- **Web:** React 18, TypeScript, Vite, Tailwind CSS, Lucide icons
- **API:** Node.js, Express, MongoDB (Mongoose), JWT auth
- **Tooling:** npm workspaces, ESLint, GitHub Actions CI

---

## 📁 Project Structure

```
medi-cloud/
├── apps/
│   ├── web/        React app (Vite): src/components, src/utils/api.ts, src/types
│   └── api/        Express API: src/routes, src/models, src/middleware (see apps/api/README.md)
├── .github/workflows/ci.yml   lint, typecheck, build on every PR
├── netlify.toml    web app deploy (Netlify builds apps/web)
└── package.json    workspace root and shared scripts
```

---

## 🔌 API Integration

The app calls the API at `VITE_API_URL`:
- **Development:** `http://localhost:3000/api` (when `VITE_API_URL` isn't set)
- **Production:** `https://medi-cloud-backend.vercel.app/api` (set on Netlify)

API endpoints are documented in [apps/api/README.md](apps/api/README.md).

---

## 📝 Available Scripts (run from the repo root)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the API and the app together |
| `npm run build` | Build every workspace |
| `npm run lint` | Lint every workspace |
| `npm run typecheck` | Type-check every workspace |
| `npm run seed:demo` | Reset the database and load demo data |

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

