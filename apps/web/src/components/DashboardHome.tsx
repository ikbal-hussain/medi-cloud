import { Users, UserPlus, Activity, TrendingUp } from 'lucide-react';
import { User, Tenant } from '../types';
import { patientsAPI, usersAPI, prescriptionsAPI } from '../utils/api';
import { useState, useEffect } from 'react';

interface DashboardHomeProps {
  user: User;
  tenant: Tenant;
}

export default function DashboardHome({ user, tenant }: DashboardHomeProps) {
  // null = that number couldn't be loaded; shown as "—" rather than a 0 that looks like real data.
  const [stats, setStats] = useState<{
    totalPatients: number | null;
    activePatients: number | null;
    opdPatients: number | null;
    ipdPatients: number | null;
    totalStaff: number | null;
    totalPrescriptions: number | null;
  }>({
    totalPatients: null,
    activePatients: null,
    opdPatients: null,
    ipdPatients: null,
    totalStaff: null,
    totalPrescriptions: null,
  });
  const [someFailed, setSomeFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const canSeeStaff = user.role === 'HOSPITAL_ADMIN' || user.role === 'SUPER_ADMIN';

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      // Each request fills its own numbers, so one failure doesn't blank the rest.
      const [patients, users, prescriptions] = await Promise.allSettled([
        patientsAPI.getAll(),
        // Only admins may list staff: asking as a doctor or receptionist gets a 403.
        canSeeStaff ? usersAPI.getAll() : Promise.resolve([]),
        prescriptionsAPI.getAll(),
      ]);

      const tenantPatients =
        patients.status === 'fulfilled' ? patients.value.filter((p) => p.tenantId === user.tenantId) : null;
      const active = tenantPatients?.filter((p) => p.status === 'Active') ?? null;

      setStats({
        totalPatients: tenantPatients?.length ?? null,
        activePatients: active?.length ?? null,
        opdPatients: active?.filter((p) => p.type === 'OPD').length ?? null,
        ipdPatients: active?.filter((p) => p.type === 'IPD').length ?? null,
        totalStaff:
          users.status === 'fulfilled' ? users.value.filter((u) => u.tenantId === user.tenantId).length : null,
        totalPrescriptions:
          prescriptions.status === 'fulfilled'
            ? prescriptions.value.filter((p) => p.tenantId === user.tenantId).length
            : null,
      });
      const failures = [patients, users, prescriptions].filter((r) => r.status === 'rejected');
      failures.forEach((r) => console.error('Failed to load dashboard stats:', (r as PromiseRejectedResult).reason));
      setSomeFailed(failures.length > 0);
      setLoading(false);
    };

    loadStats();
  }, [user.tenantId, canSeeStaff]);

  const show = (n: number | null) => (n === null ? '—' : n);
  const share = (part: number | null) =>
    part !== null && stats.activePatients ? (part / stats.activePatients) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name.split(' ')[1] || user.name}</h1>
        <p className="text-gray-600 mt-2">Here's what's happening at {tenant.name} today</p>
      </div>

      {someFailed && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Some numbers couldn't be loaded and show as —. Refresh to try again.
        </div>
      )}

      <div
        className={`grid grid-cols-1 md:grid-cols-2 ${canSeeStaff ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6 mb-8`}
      >
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{show(stats.totalPatients)}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Patients</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{show(stats.activePatients)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {canSeeStaff && (
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-primary-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Staff</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{show(stats.totalStaff)}</p>
              </div>
              <div className="bg-primary-100 p-3 rounded-full">
                <UserPlus className="h-8 w-8 text-primary-600" />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Prescriptions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{show(stats.totalPrescriptions)}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Patient Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">OPD Patients</span>
                <span className="text-sm font-bold text-blue-600">{show(stats.opdPatients)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${share(stats.opdPatients)}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">IPD Patients</span>
                <span className="text-sm font-bold text-primary-600">{show(stats.ipdPatients)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${share(stats.ipdPatients)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors">
              <p className="font-medium text-primary-900">Add New Patient</p>
              <p className="text-sm text-primary-700">Register a new patient in the system</p>
            </button>
            {(user.role === 'DOCTOR' || user.role === 'HOSPITAL_ADMIN') && (
              <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <p className="font-medium text-blue-900">Write Prescription</p>
                <p className="text-sm text-blue-700">Create a new prescription for a patient</p>
              </button>
            )}
            {user.role === 'HOSPITAL_ADMIN' && (
              <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                <p className="font-medium text-green-900">Add Staff Member</p>
                <p className="text-sm text-green-700">Add doctors or receptionists</p>
              </button>
            )}
          </div>
        </div> */}
      </div>
    </div>
  );
}
