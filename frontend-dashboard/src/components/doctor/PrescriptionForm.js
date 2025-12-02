// src/components/doctor/PrescriptionForm.jsx
import React, { useState } from 'react';
import { Pill, Plus, Trash2, AlertCircle } from 'lucide-react';

const PrescriptionForm = ({ prescriptions, onChange }) => {
  const [showAddForm, setShowAddForm] = useState(false);

  const addPrescription = () => {
    const newPrescription = {
      id: Date.now(),
      drug_name: '',
      dosage: '',
      frequency: '',
      duration: '',
      duration_unit: 'ngày',
      instructions: '',
      notes: ''
    };
    onChange([...prescriptions, newPrescription]);
    setShowAddForm(true);
  };

  const updatePrescription = (id, field, value) => {
    const updated = prescriptions.map(rx => 
      rx.id === id ? { ...rx, [field]: value } : rx
    );
    onChange(updated);
  };

  const removePrescription = (id) => {
    const filtered = prescriptions.filter(rx => rx.id !== id);
    onChange(filtered);
    if (filtered.length === 0) {
      setShowAddForm(false);
    }
  };

  const frequencyOptions = [
    { value: '1 lần/ngày', label: '1 lần/ngày' },
    { value: '2 lần/ngày', label: '2 lần/ngày' },
    { value: '3 lần/ngày', label: '3 lần/ngày' },
    { value: '4 lần/ngày', label: '4 lần/ngày' },
    { value: 'Khi cần', label: 'Khi cần' },
    { value: 'Trước ăn', label: 'Trước ăn' },
    { value: 'Sau ăn', label: 'Sau ăn' }
  ];

  const durationUnits = [
    { value: 'ngày', label: 'ngày' },
    { value: 'tuần', label: 'tuần' },
    { value: 'tháng', label: 'tháng' }
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Pill className="text-blue-500" size={20} />
          Đơn thuốc
        </h3>
        <button
          type="button"
          onClick={addPrescription}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Thêm thuốc
        </button>
      </div>

      {prescriptions.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <Pill size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-600 dark:text-slate-400">Chưa có thuốc nào được kê đơn</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
            Nhấn "Thêm thuốc" để kê đơn thuốc cho bệnh nhân
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((rx, index) => (
            <div
              key={rx.id}
              className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 bg-slate-50 dark:bg-slate-700/50"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                  Thuốc #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removePrescription(rx.id)}
                  className="text-red-500 hover:text-red-600 transition-colors"
                  title="Xóa thuốc"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Drug Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Tên thuốc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Paracetamol 500mg"
                    value={rx.drug_name}
                    onChange={(e) => updatePrescription(rx.id, 'drug_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Dosage */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Liều lượng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 1 viên, 5ml"
                    value={rx.dosage}
                    onChange={(e) => updatePrescription(rx.id, 'dosage', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Tần suất <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={rx.frequency}
                    onChange={(e) => updatePrescription(rx.id, 'frequency', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Chọn tần suất</option>
                    {frequencyOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Thời gian dùng <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Số lượng"
                      value={rx.duration}
                      onChange={(e) => updatePrescription(rx.id, 'duration', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      required
                    />
                    <select
                      value={rx.duration_unit}
                      onChange={(e) => updatePrescription(rx.id, 'duration_unit', e.target.value)}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {durationUnits.map(unit => (
                        <option key={unit.value} value={unit.value}>{unit.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Instructions */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Hướng dẫn sử dụng
                  </label>
                  <textarea
                    placeholder="Ví dụ: Uống sau bữa ăn, không uống cùng sữa..."
                    value={rx.instructions}
                    onChange={(e) => updatePrescription(rx.id, 'instructions', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-16"
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Ghi chú bổ sung
                  </label>
                  <input
                    type="text"
                    placeholder="Ghi chú thêm về thuốc này..."
                    value={rx.notes}
                    onChange={(e) => updatePrescription(rx.id, 'notes', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warning */}
      {prescriptions.length > 0 && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <AlertCircle size={18} className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-700 dark:text-orange-300">
            <p className="font-medium mb-1">Lưu ý khi kê đơn:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Kiểm tra kỹ lịch sử dị ứng thuốc của bệnh nhân</li>
              <li>Cân nhắc tương tác thuốc với các thuốc đang dùng</li>
              <li>Ghi rõ liều lượng và hướng dẫn sử dụng</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionForm;