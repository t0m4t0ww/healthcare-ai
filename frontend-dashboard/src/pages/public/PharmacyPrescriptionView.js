// src/pages/public/PharmacyPrescriptionView.js
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  Pill, User, Calendar, Shield, Printer, 
  CheckCircle, AlertCircle, Loader2, FileText,
  Clock, Phone, MapPin, QrCode
} from 'lucide-react';
import api from '../../services/services';

/**
 * Pharmacy Prescription View
 * Trang hiển thị đơn thuốc khi nhà thuốc quét QR code
 * URL: /pharmacy/prescription/:ehrId?code=xxx
 */
const PharmacyPrescriptionView = () => {
  const { ehrId } = useParams();
  const [searchParams] = useSearchParams();
  const verificationCode = searchParams.get('code');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prescription, setPrescription] = useState(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!ehrId || !verificationCode) {
      setError('Mã QR không hợp lệ. Vui lòng quét lại.');
      setLoading(false);
      return;
    }

    fetchPrescription();
  }, [ehrId, verificationCode]);

  const fetchPrescription = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch EHR record
      const response = await api.get(`/ehr/records/${ehrId}`);
      const record = response.data;

      // Verify code (simple verification)
      const expectedCode = btoa(ehrId + new Date(record.created_at || record.date).toISOString().slice(0, 10));
      const isValid = verificationCode.startsWith(expectedCode.slice(0, 10)); // Partial match

      if (!isValid) {
        setError('Mã xác thực không chính xác. Đơn thuốc có thể đã hết hạn hoặc bị sửa đổi.');
        setVerified(false);
      } else {
        setVerified(true);
      }

      setPrescription(record);
    } catch (err) {
      console.error('Error fetching prescription:', err);
      setError('Không tìm thấy đơn thuốc. Vui lòng kiểm tra lại mã QR.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <Loader2 size={48} className="mx-auto text-cyan-600 animate-spin mb-4" />
          <p className="text-slate-600 font-medium">Đang tải đơn thuốc...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Lỗi xác thực</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (!prescription) return null;

  const patientInfo = prescription.patient_info || {};
  const doctorInfo = prescription.doctor || prescription.doctor_info || {};
  const medications = prescription.medications || prescription.prescription || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 p-4 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto">
        {/* Header - Verification Status */}
        <div className={`mb-6 p-4 rounded-2xl border-2 print:hidden ${
          verified 
            ? 'bg-green-50 border-green-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center gap-3">
            {verified ? (
              <>
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-green-900">✓ Đơn thuốc hợp lệ</p>
                  <p className="text-sm text-green-700">Đã xác thực thành công</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                  <AlertCircle size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-yellow-900">⚠ Cảnh báo</p>
                  <p className="text-sm text-yellow-700">Không thể xác thực hoàn toàn. Vui lòng kiểm tra kỹ.</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Prescription Card */}
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-200 overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-6 print:bg-cyan-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border-2 border-white/30">
                  <Pill size={32} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">ĐƠN THUỐC</h1>
                  <p className="text-cyan-100 text-sm mt-1">MEDITECH HOSPITAL</p>
                </div>
              </div>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors flex items-center gap-2 print:hidden"
              >
                <Printer size={18} />
                In đơn
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            
            {/* Patient & Doctor Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Patient */}
              <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-4">
                  <User size={20} className="text-blue-600" />
                  <h3 className="font-bold text-blue-900">Thông tin bệnh nhân</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-600">Họ tên:</span>
                    <p className="font-semibold text-slate-900 text-lg">
                      {patientInfo.full_name || patientInfo.name || 'Bệnh nhân'}
                    </p>
                  </div>
                  {patientInfo.date_of_birth && (
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-500" />
                      <span className="text-slate-600">Ngày sinh:</span>
                      <span className="font-medium text-slate-900">
                        {formatDate(patientInfo.date_of_birth)}
                      </span>
                    </div>
                  )}
                  {patientInfo.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-500" />
                      <span className="text-slate-600">SĐT:</span>
                      <span className="font-medium text-slate-900">{patientInfo.phone}</span>
                    </div>
                  )}
                  {patientInfo.address && (
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-slate-500" />
                      <span className="text-slate-600">Địa chỉ:</span>
                      <span className="font-medium text-slate-900">{patientInfo.address}</span>
                    </div>
                  )}
                </div>

                {/* Allergy Warning */}
                {patientInfo.allergies_medications && (
                  <div className="mt-4 p-3 bg-red-100 border-2 border-red-300 rounded-lg">
                    <p className="text-xs font-bold text-red-800 flex items-center gap-2">
                      <AlertCircle size={14} />
                      ⚠ DỊ ỨNG: {patientInfo.allergies_medications}
                    </p>
                  </div>
                )}
              </div>

              {/* Doctor */}
              <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={20} className="text-green-600" />
                  <h3 className="font-bold text-green-900">Bác sĩ kê đơn</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-600">Họ tên:</span>
                    <p className="font-semibold text-slate-900 text-lg">
                      BS. {doctorInfo.full_name || doctorInfo.name || 'N/A'}
                    </p>
                  </div>
                  {doctorInfo.specialty && (
                    <div>
                      <span className="text-slate-600">Chuyên khoa:</span>
                      <p className="font-medium text-slate-900">{doctorInfo.specialty}</p>
                    </div>
                  )}
                  {doctorInfo.license_number && (
                    <div>
                      <span className="text-slate-600">Số chứng chỉ:</span>
                      <p className="font-medium text-slate-900">{doctorInfo.license_number}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-500" />
                    <span className="text-slate-600">Ngày kê:</span>
                    <span className="font-medium text-slate-900">
                      {formatDate(prescription.created_at || prescription.date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnosis */}
            {prescription.diagnosis && (
              <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={20} className="text-purple-600" />
                  <h3 className="font-bold text-purple-900">Chẩn đoán</h3>
                </div>
                <p className="text-slate-900 font-medium text-base">
                  {prescription.diagnosis}
                </p>
              </div>
            )}

            {/* Medications List */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border-2 border-cyan-200">
              <div className="flex items-center gap-2 mb-4">
                <Pill size={20} className="text-cyan-600" />
                <h3 className="font-bold text-cyan-900 text-xl">
                  Danh sách thuốc ({medications.length} loại)
                </h3>
              </div>

              <div className="space-y-4">
                {medications.map((med, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl p-5 border-2 border-cyan-200 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 text-lg mb-2">
                          {med.drug_name || med.name}
                        </h4>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Liều dùng</p>
                            <p className="font-semibold text-slate-900">{med.dosage || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Tần suất</p>
                            <p className="font-semibold text-slate-900">{med.frequency || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Thời gian</p>
                            <p className="font-semibold text-slate-900">{med.duration || 'N/A'}</p>
                          </div>
                        </div>
                        {med.instructions && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-800">
                              <strong>💡 Hướng dẫn:</strong> {med.instructions}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Treatment Notes */}
            {prescription.treatment && (
              <div className="bg-amber-50 rounded-xl p-6 border-2 border-amber-200">
                <h3 className="font-bold text-amber-900 mb-3">Hướng dẫn điều trị</h3>
                <p className="text-slate-900 leading-relaxed">{prescription.treatment}</p>
              </div>
            )}

            {/* Footer Info */}
            <div className="border-t-2 border-slate-200 pt-6 text-center text-sm text-slate-600">
              <p className="mb-2">
                <strong>Mã hồ sơ:</strong> {ehrId}
              </p>
              <p className="text-xs text-slate-500">
                Đơn thuốc này chỉ có giá trị khi có mã QR hợp lệ và đã được xác thực
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs">
                <QrCode size={14} />
                <span>Được tạo từ Hệ thống MEDITECH HOSPITAL EHR</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyPrescriptionView;

