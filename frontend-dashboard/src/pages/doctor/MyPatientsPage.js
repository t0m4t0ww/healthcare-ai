// src/pages/doctor/MyPatientsPage.jsx
import React, { useState, useEffect } from 'react';
import { Search, Filter, Users, Phone, Mail, Calendar, Eye, FileText } from 'lucide-react';
import api from '../../services/services';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import socket from '../../services/socket';

const MyPatientsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    // ✅ Đợi user load xong mới gọi API
    if (user) {
      console.log('✅ User loaded, fetching patients...');
      fetchPatients();
    } else {
      console.log('⏳ Waiting for user to load...');
    }
  }, [user]); // ✅ Thêm user vào dependency

  useEffect(() => {
    filterPatients();
  }, [searchQuery, patients]);

  // ✅ Real-time Socket.IO updates for patient data
  useEffect(() => {
    if (!user?.doctor_id && !user?.id && !user?._id) return;

    console.log('🔌 [MyPatientsPage] Setting up Socket.IO listeners...');

    // Listen for patient profile updates
    const handlePatientUpdate = (data) => {
      console.log('👤 [MyPatientsPage] Patient updated:', data);
      fetchPatients(); // Refresh patient list
    };

    // Listen for new EHR records (indicates new patient or updated patient data)
    const handleEHRCreated = (data) => {
      console.log('📋 [MyPatientsPage] EHR record created:', data);
      fetchPatients();
    };

    // Listen for appointment completions (may add new patients to the list)
    const handleAppointmentCompleted = (data) => {
      console.log('✅ [MyPatientsPage] Appointment completed:', data);
      fetchPatients();
    };

    socket.on('patient_updated', handlePatientUpdate);
    socket.on('ehr_record_created', handleEHRCreated);
    socket.on('appointment_updated', handleAppointmentCompleted);

    return () => {
      console.log('🔌 [MyPatientsPage] Cleaning up Socket.IO listeners...');
      socket.off('patient_updated', handlePatientUpdate);
      socket.off('ehr_record_created', handleEHRCreated);
      socket.off('appointment_updated', handleAppointmentCompleted);
    };
  }, [user]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      console.log('👤 Current user:', user);
      console.log('🆔 user.id:', user?.id);
      console.log('🆔 user.user_id:', user?.user_id);
      
      // ✅ Backend uses auth token to identify doctor, no need for doctor_id param
      const response = await api.get('/patients/my-patients');

      console.log('📦 API response:', response.data);
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      console.log('✅ Patients data:', data);
      console.log('📊 Total patients:', data.length);
      
      setPatients(data);
      setFilteredPatients(data);
    } catch (error) {
      console.error('❌ Error fetching patients:', error);
      console.error('   Error response:', error.response);
      console.error('   Error status:', error.response?.status);
      console.error('   Error data:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const filterPatients = () => {
    if (!searchQuery.trim()) {
      setFilteredPatients(patients);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = patients.filter(
      (patient) =>
        patient.full_name?.toLowerCase().includes(query) ||
        patient.mrn?.toLowerCase().includes(query) ||
        patient.phone?.includes(query) ||
        patient.email?.toLowerCase().includes(query)
    );
    setFilteredPatients(filtered);
  };

  const handleViewDetail = (patient) => {
    setSelectedPatient(patient);
    setShowDetailModal(true);
  };

  const handleViewHistory = (patient) => {
    navigate(`/doctor/consultation/history/${patient._id || patient.id}`);
  };

  const getGenderBadge = (gender) => {
    if (gender === 'male') {
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium">Nam</span>;
    }
    if (gender === 'female') {
      return <span className="px-2 py-1 bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 rounded-full text-xs font-medium">Nữ</span>;
    }
    return <span className="px-2 py-1 bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300 rounded-full text-xs font-medium">Khác</span>;
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Đang tải danh sách bệnh nhân..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Bệnh nhân của tôi</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Tổng số: <strong>{patients.length}</strong> bệnh nhân
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, MRN, số điện thoại, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Patients List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {filteredPatients.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              {searchQuery ? 'Không tìm thấy bệnh nhân phù hợp' : 'Chưa có bệnh nhân nào'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredPatients.map((patient) => {
              const dob = patient.date_of_birth || patient.dob;
              const age = dob ? new Date().getFullYear() - new Date(dob).getFullYear() : 'N/A';

              return (
                <div
                  key={patient._id || patient.id}
                  className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-lg">
                        {patient.full_name?.charAt(0) || 'P'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">{patient.full_name}</h3>
                          {getGenderBadge(patient.gender)}
                          <span className="text-sm text-slate-600 dark:text-slate-400">{age} tuổi</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            MRN: {patient.mrn}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone size={14} />
                            {patient.phone}
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail size={14} />
                            {patient.email || 'Chưa có email'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetail(patient)}
                        className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2"
                      >
                        <Eye size={16} />
                        Xem chi tiết
                      </button>
                      <button
                        onClick={() => handleViewHistory(patient)}
                        className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors flex items-center gap-2"
                      >
                        <FileText size={16} />
                        Lịch sử khám
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Patient Detail Modal */}
      {showDetailModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Thông tin bệnh nhân</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Họ tên</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedPatient.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">MRN</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedPatient.mrn}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Ngày sinh</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {selectedPatient.date_of_birth || selectedPatient.dob
                      ? new Date(selectedPatient.date_of_birth || selectedPatient.dob).toLocaleDateString('vi-VN')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Giới tính</p>
                  <div>{getGenderBadge(selectedPatient.gender)}</div>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Số điện thoại</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedPatient.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Email</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedPatient.email || 'Chưa có'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Địa chỉ</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedPatient.address || 'Chưa có'}</p>
                </div>
              </div>

              {selectedPatient.medical_history && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Tiền sử bệnh</p>
                  <p className="text-slate-900 dark:text-slate-100">{selectedPatient.medical_history}</p>
                </div>
              )}

              {selectedPatient.allergies_medications && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Dị ứng thuốc</p>
                  <p className="text-red-600 dark:text-red-400 font-medium">{selectedPatient.allergies_medications}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPatientsPage;