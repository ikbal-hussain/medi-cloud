import { useState, useEffect } from 'react';
import { Plus, Search, User, Phone, MapPin } from 'lucide-react';
import { Patient } from '../types';
import { storage } from '../utils/storage';

interface PatientManagementProps {
  tenantId: string;
}

export default function PatientManagement({ tenantId }: PatientManagementProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'OPD' | 'IPD'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'Active' | 'Discharged'>('ALL');

  useEffect(() => {
    loadPatients();
  }, [tenantId]);

  const loadPatients = () => {
    const allPatients = storage.getPatients();
    const tenantPatients = allPatients.filter((p) => p.tenantId === tenantId);
    setPatients(tenantPatients);
  };

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phoneNumber.includes(searchTerm);
    const matchesType = filterType === 'ALL' || patient.type === filterType;
    const matchesStatus = filterStatus === 'ALL' || patient.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleAddPatient = (newPatient: Omit<Patient, 'id' | 'tenantId' | 'admissionDate'>) => {
    const patient: Patient = {
      ...newPatient,
      id: `patient-${Date.now()}`,
      tenantId,
      admissionDate: new Date().toISOString(),
    };

    const allPatients = storage.getPatients();
    storage.setPatients([...allPatients, patient]);
    loadPatients();
    setShowAddModal(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Patient Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Add Patient</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'ALL' | 'OPD' | 'IPD')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="ALL">All Types</option>
            <option value="OPD">OPD</option>
            <option value="IPD">IPD</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'Active' | 'Discharged')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="ALL">All Status</option>
            <option value="Active">Active</option>
            <option value="Discharged">Discharged</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredPatients.map((patient) => (
          <div key={patient.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="bg-teal-100 p-3 rounded-full">
                  <User className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{patient.name}</h3>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    <span>{patient.age} years</span>
                    <span>•</span>
                    <span>{patient.gender}</span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Phone className="h-4 w-4" />
                      <span>{patient.phoneNumber}</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 mt-1 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{patient.address}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    patient.type === 'OPD'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-teal-100 text-teal-700'
                  }`}
                >
                  {patient.type}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    patient.status === 'Active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {patient.status}
                </span>
              </div>
            </div>
          </div>
        ))}
        {filteredPatients.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No patients found</p>
          </div>
        )}
      </div>

      {showAddModal && <AddPatientModal onClose={() => setShowAddModal(false)} onAdd={handleAddPatient} />}
    </div>
  );
}

interface AddPatientModalProps {
  onClose: () => void;
  onAdd: (patient: Omit<Patient, 'id' | 'tenantId' | 'admissionDate'>) => void;
}

function AddPatientModal({ onClose, onAdd }: AddPatientModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    type: 'OPD' as 'OPD' | 'IPD',
    phoneNumber: '',
    address: '',
    status: 'Active' as 'Active' | 'Discharged',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...formData,
      age: parseInt(formData.age),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 relative max-h-screen overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Patient</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
                min="0"
                max="150"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' | 'Other' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'OPD' | 'IPD' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="OPD">OPD</option>
                <option value="IPD">IPD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Discharged' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="Active">Active</option>
                <option value="Discharged">Discharged</option>
              </select>
            </div>
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
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Add Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
