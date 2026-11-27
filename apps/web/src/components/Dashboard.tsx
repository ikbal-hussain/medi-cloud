import { useState } from 'react';
import { User, Tenant } from '../types';
import Sidebar from './Sidebar';
import Header from './Header';
import DashboardHome from './DashboardHome';
import PatientManagement from './PatientManagement';
import UserManagement from './UserManagement';
import PrescriptionManagement from './PrescriptionManagement';

interface DashboardProps {
  user: User;
  tenant: Tenant;
  onLogout: () => void;
}

export type PageType = 'home' | 'patients' | 'users' | 'prescriptions';

export default function Dashboard({ user, tenant, onLogout }: DashboardProps) {
  const [currentPage, setCurrentPage] = useState<PageType>('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <DashboardHome user={user} tenant={tenant} />;
      case 'patients':
        return <PatientManagement tenantId={user.tenantId} />;
      case 'users':
        return <UserManagement tenantId={user.tenantId} userRole={user.role} />;
      case 'prescriptions':
        return <PrescriptionManagement tenantId={user.tenantId} userId={user.id} userName={user.name} userRole={user.role} />;
      default:
        return <DashboardHome user={user} tenant={tenant} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        userRole={user.role}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} tenant={tenant} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
