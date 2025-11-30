import { useState } from 'react';
import { Building2, UserPlus, LogIn, Activity, Users, Shield } from 'lucide-react';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';

interface LandingPageProps {
  onAuthSuccess: () => void;
}

export default function LandingPage({ onAuthSuccess }: LandingPageProps) {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-teal-600" />
              <span className="text-2xl font-bold text-gray-900">MediCloud</span>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-teal-600 transition-colors"
              >
                <LogIn className="h-5 w-5" />
                <span>Login</span>
              </button>
              <button
                onClick={() => setShowRegister(true)}
                className="flex items-center space-x-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <UserPlus className="h-5 w-5" />
                <span>Register Hospital</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Modern Healthcare Management
            <span className="block text-teal-600 mt-2">Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Streamline your hospital operations with our comprehensive SaaS platform.
            Manage patients, staff, prescriptions, and more—all in one place.
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={() => setShowRegister(true)}
              className="px-8 py-3 bg-teal-600 text-white text-lg font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-lg"
            >
              Get Started Free
            </button>
            <button
              onClick={() => setShowLogin(true)}
              className="px-8 py-3 bg-white text-teal-600 text-lg font-semibold rounded-lg hover:bg-gray-50 transition-colors border-2 border-teal-600"
            >
              Sign In
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-shadow">
            <div className="bg-blue-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Multi-Tenant Architecture</h3>
            <p className="text-gray-600">
              Complete data isolation for each hospital. Your data stays secure and separate.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-shadow">
            <div className="bg-teal-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Role-Based Access</h3>
            <p className="text-gray-600">
              Manage admins, doctors, and receptionists with granular permission controls.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-shadow">
            <div className="bg-green-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Secure & Compliant</h3>
            <p className="text-gray-600">
              Built with healthcare standards in mind. Your patient data is always protected.
            </p>
          </div>
        </div>

        <div className="mt-20 bg-white rounded-xl shadow-md p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Everything Your Hospital Needs
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center mt-1">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Patient Management</h4>
                <p className="text-gray-600">Track OPD and IPD patients with complete medical records</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center mt-1">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Digital Prescriptions</h4>
                <p className="text-gray-600">Create and manage prescriptions digitally</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center mt-1">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Staff Management</h4>
                <p className="text-gray-600">Add and manage doctors, nurses, and administrative staff</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center mt-1">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Real-time Dashboard</h4>
                <p className="text-gray-600">Monitor key metrics and hospital operations at a glance</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={onAuthSuccess} />}
      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} onSuccess={onAuthSuccess} />}
    </div>
  );
}
