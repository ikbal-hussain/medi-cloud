# 🏥 Medi Cloud Frontend

> Modern hospital management system frontend built with React, TypeScript, and Tailwind CSS.

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

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd medi-cloud
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

   The application will open at `http://localhost:5173`

4. **Build for production**
   ```bash
   npm run build
   ```

---

## 🛠️ Tech Stack

- **Framework:** React 18
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **HTTP Client:** Fetch API

---

## 📁 Project Structure

```
medi-cloud/
├── src/
│   ├── components/          # React components
│   │   ├── Dashboard.tsx
│   │   ├── DashboardHome.tsx
│   │   ├── LandingPage.tsx
│   │   ├── LoginModal.tsx
│   │   ├── RegisterModal.tsx
│   │   ├── PatientManagement.tsx
│   │   ├── PrescriptionManagement.tsx
│   │   ├── UserManagement.tsx
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── utils/
│   │   ├── api.ts           # API service
│   │   └── auth.ts          # Authentication utilities
│   ├── types/
│   │   └── index.ts         # TypeScript types
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── public/                  # Static assets
├── tailwind.config.js       # Tailwind configuration
└── package.json
```

---

## 🔌 API Integration

The frontend calls the API at `VITE_API_URL`:
- **Development:** `http://localhost:3000/api` (when `VITE_API_URL` isn't set)
- **Production:** `https://medi-cloud-backend.vercel.app/api` (set on Netlify)

---

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |

---

## 🎭 User Roles

- **HOSPITAL_ADMIN** - Full access to manage hospital operations
- **DOCTOR** - Can create prescriptions and view patients
- **RECEPTIONIST** - Can manage patients

---

## 🔗 Backend API

This frontend requires the [Medi Cloud Backend](https://github.com/ikbal-hussain/medi-cloud-backend) API to be running.

**Backend Repository:** [medi-cloud-backend](https://github.com/ikbal-hussain/medi-cloud-backend)  
**Backend API:** `https://medi-cloud-backend.vercel.app/api` ([health check](https://medi-cloud-backend.vercel.app/api/health))

---
## 👤 Author

**Ikbal Hussain**

- GitHub: [@ikbal-hussain](https://github.com/ikbal-hussain)

---

**⭐ If you find this project helpful, please consider giving it a star!**

