import { useState, useEffect } from 'react';
import { Plus, UserCog, Mail, Shield } from 'lucide-react';
import { User, UserRole } from '../types';
import { usersAPI, errorMessage } from '../utils/api';

// A new staff member: the user fields plus the initial password, which is never sent back by the API.
type NewUser = Omit<User, 'id' | 'tenantId' | 'createdAt'> & { password: string };

interface UserManagementProps {
  tenantId: string;
  userRole: UserRole;
}

export default function UserManagement({ tenantId, userRole }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [tenantId]);

  const loadUsers = async () => {
    try {
      const allUsers = await usersAPI.getAll();
      const tenantUsers = allUsers.filter((u) => u.tenantId === tenantId);
      setUsers(tenantUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleAddUser = async (newUser: NewUser) => {
    try {
      await usersAPI.create(newUser);
      await loadUsers();
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add user:', error);
      alert(errorMessage(error, 'Failed to add user. Please try again.'));
    }
  };

  if (userRole !== 'HOSPITAL_ADMIN') {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">You don't have permission to access this page</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Add Staff</span>
        </button>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <div key={user.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <UserCog className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
                  <div className="flex items-center space-x-2 mt-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                  <div className="mt-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'HOSPITAL_ADMIN'
                          ? 'bg-red-100 text-red-700'
                          : user.role === 'DOCTOR'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} onAdd={handleAddUser} />}
    </div>
  );
}

interface AddUserModalProps {
  onClose: () => void;
  onAdd: (user: NewUser) => void;
}

function AddUserModal({ onClose, onAdd }: AddUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'DOCTOR' as UserRole,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 relative">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Staff Member</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              minLength={8}
              placeholder="At least 8 characters"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="DOCTOR">Doctor</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="HOSPITAL_ADMIN">Hospital Admin</option>
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Add Staff
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
