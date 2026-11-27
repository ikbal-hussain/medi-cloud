import { Home, Users, UserCog, FileText, Activity } from 'lucide-react';
import { UserRole } from '../types';
import { PageType } from './Dashboard';

interface SidebarProps {
  userRole: UserRole;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

export default function Sidebar({ userRole, currentPage, onPageChange }: SidebarProps) {
  const menuItems = [
    { id: 'home' as PageType, label: 'Dashboard', icon: Home, roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST'] },
    { id: 'patients' as PageType, label: 'Patients', icon: Users, roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST'] },
    { id: 'prescriptions' as PageType, label: 'Prescriptions', icon: FileText, roles: ['HOSPITAL_ADMIN', 'DOCTOR'] },
    { id: 'users' as PageType, label: 'Staff Management', icon: UserCog, roles: ['HOSPITAL_ADMIN'] },
  ];

  const filteredItems = menuItems.filter((item) => item.roles.includes(userRole));

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Activity className="h-8 w-8 text-primary-600" />
          <span className="text-xl font-bold text-gray-900">MediCloud</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="px-4 py-2 bg-blue-50 rounded-lg">
          <p className="text-xs font-medium text-blue-900">Multi-Tenant SaaS</p>
          <p className="text-xs text-blue-700 mt-1">Data Isolated</p>
        </div>
      </div>
    </div>
  );
}
