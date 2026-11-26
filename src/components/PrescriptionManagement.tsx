import { useState, useEffect } from 'react';
import { Plus, FileText, Calendar, User } from 'lucide-react';
import { Prescription, Patient, UserRole } from '../types';
import { prescriptionsAPI, patientsAPI, usersAPI } from '../utils/api';

interface PrescriptionManagementProps {
  tenantId: string;
  userId: string;
  userRole: UserRole;
}

export default function PrescriptionManagement({ tenantId, userRole }: PrescriptionManagementProps) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    try {
      const allPrescriptions = await prescriptionsAPI.getAll();
      const tenantPrescriptions = allPrescriptions.filter((p) => p.tenantId === tenantId);
      setPrescriptions(tenantPrescriptions);

      const allPatients = await patientsAPI.getAll();
      const tenantPatients = allPatients.filter((p) => p.tenantId === tenantId);
      setPatients(tenantPatients);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleAddPrescription = async (newPrescription: Omit<Prescription, 'id' | 'tenantId' | 'createdAt' | 'doctorId'>) => {
    try {
      await prescriptionsAPI.create(newPrescription);
      await loadData();
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add prescription:', error);
      alert('Failed to add prescription. Please try again.');
    }
  };

  const getPatientName = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    return patient?.name || 'Unknown Patient';
  };

  const [doctors, setDoctors] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const allUsers = await usersAPI.getAll();
        const doctorsList = allUsers
          .filter((u) => u.role === 'DOCTOR' && u.tenantId === tenantId)
          .map((u) => ({ id: u.id, name: u.name }));
        setDoctors(doctorsList);
      } catch (error) {
        console.error('Failed to load doctors:', error);
      }
    };
    loadDoctors();
  }, [tenantId]);

  const getDoctorName = (doctorId: string) => {
    const doctor = doctors.find((d) => d.id === doctorId);
    return doctor?.name || 'Unknown Doctor';
  };

  if (userRole === 'RECEPTIONIST') {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">You don't have permission to access prescriptions</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Prescription Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>New Prescription</span>
        </button>
      </div>

      <div className="grid gap-4">
        {prescriptions.map((prescription) => (
          <div key={prescription.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-4">
                <div className="bg-primary-100 p-3 rounded-full">
                  <FileText className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{getPatientName(prescription.patientId)}</h3>
                  <div className="flex items-center space-x-2 mt-1 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span>Dr. {getDoctorName(prescription.doctorId)}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(prescription.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Diagnosis:</p>
                <p className="text-sm text-gray-600">{prescription.diagnosis}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Medications:</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{prescription.medications}</p>
              </div>
              {prescription.notes && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Notes:</p>
                  <p className="text-sm text-gray-600">{prescription.notes}</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {prescriptions.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No prescriptions found</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddPrescriptionModal
          patients={patients}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddPrescription}
        />
      )}
    </div>
  );
}

interface AddPrescriptionModalProps {
  patients: Patient[];
  onClose: () => void;
  onAdd: (prescription: Omit<Prescription, 'id' | 'tenantId' | 'createdAt' | 'doctorId'>) => void;
}

function AddPrescriptionModal({ patients, onClose, onAdd }: AddPrescriptionModalProps) {
  const [formData, setFormData] = useState({
    patientId: '',
    diagnosis: '',
    medications: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-8 relative max-h-screen overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Write New Prescription</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Patient</label>
            <select
              value={formData.patientId}
              onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">Choose a patient...</option>
              {patients
                .filter((p) => p.status === 'Active')
                .map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} - {patient.age} years - {patient.type}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
            <input
              type="text"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Acute Bronchitis"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Medications</label>
            <textarea
              value={formData.medications}
              onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={6}
              placeholder="List medications with dosage and frequency..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: Amoxicillin 500mg - 3 times daily for 7 days
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
              placeholder="Any special instructions or notes..."
            />
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
              Create Prescription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
