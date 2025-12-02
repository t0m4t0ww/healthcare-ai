// src/components/medical/PrescriptionQRCode.js
import React, { useEffect, useRef, useState } from 'react';
import { QrCode, Download, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';

/**
 * Prescription QR Code Generator
 * Tạo QR code cho đơn thuốc để nhà thuốc quét
 */
const PrescriptionQRCode = ({ prescription, ehrId, patientInfo }) => {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [qrData, setQrData] = useState('');

  useEffect(() => {
    if (!prescription || !ehrId) return;

    // Extract patient info with fallbacks
    const patientName = patientInfo?.full_name || patientInfo?.name || 'Bệnh nhân';
    const patientId = patientInfo?.patient_id || patientInfo?.citizen_id || patientInfo?._id || ehrId;
    const verificationCode = btoa(ehrId + new Date().toISOString().slice(0, 10));

    // ✅ OPTION 1: Generate URL (recommended - cleaner)
    const baseUrl = window.location.origin; // e.g., http://localhost:3000
    const prescriptionUrl = `${baseUrl}/pharmacy/prescription/${ehrId}?code=${verificationCode}`;
    
    // ✅ OPTION 2: Beautified JSON (fallback)
    const prescriptionData = {
      type: 'prescription',
      ehr_id: ehrId,
      patient: {
        name: patientName,
        id: patientId,
      },
      medications: prescription.map(med => ({
        name: med.drug_name || med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions || med.notes,
      })),
      issued_date: new Date().toISOString(),
      verification_code: verificationCode,
      view_url: prescriptionUrl, // URL to view in browser
    };

    // Use URL for QR (nhà thuốc quét sẽ mở browser)
    const qrContent = prescriptionUrl;
    setQrData(JSON.stringify(prescriptionData, null, 2)); // For copy button

    // Generate QR code with URL
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        qrContent, // URL instead of raw JSON
        {
          width: 280,
          margin: 2,
          color: {
            dark: '#0891b2', // Cyan-600
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H', // High error correction
        },
        (error) => {
          if (error) console.error('QR Code generation error:', error);
        }
      );
    }
  }, [prescription, ehrId, patientInfo]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `prescription-qr-${ehrId}.png`;
    link.href = url;
    link.click();
  };

  const handleCopyData = async () => {
    try {
      await navigator.clipboard.writeText(qrData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  if (!prescription || prescription.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 rounded-2xl border-2 border-cyan-200 dark:border-cyan-800 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <QrCode size={20} className="text-cyan-600 dark:text-cyan-400" />
            QR Code Đơn Thuốc
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Quét mã tại nhà thuốc để lấy đơn thuốc
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center">
        {/* QR Canvas */}
        <div className="bg-white rounded-xl p-4 shadow-lg mb-4">
          <canvas ref={canvasRef} />
        </div>

        {/* Verification Code & Patient Info */}
        <div className="text-center mb-4 space-y-2">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Bệnh nhân:
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {patientInfo?.full_name || patientInfo?.name || 'Bệnh nhân'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Mã xác thực:
            </p>
            <code className="text-sm font-mono bg-white dark:bg-slate-800 px-3 py-1 rounded border border-slate-200 dark:border-slate-700">
              {qrData ? btoa(ehrId + new Date().toISOString().slice(0, 10)).slice(0, 12) : 'N/A'}
            </code>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium text-sm"
          >
            <Download size={16} />
            Tải xuống
          </button>
          
          <button
            onClick={handleCopyData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium text-sm"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Đã copy' : 'Copy data'}
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-800 dark:text-blue-300">
            <strong>🏥 Hướng dẫn sử dụng:</strong>
          </p>
          <ul className="text-xs text-blue-800 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
            <li>Quét mã QR tại nhà thuốc để hiển thị đơn thuốc đầy đủ</li>
            <li>Nhân viên có thể xem chi tiết và in đơn</li>
            <li>Hoặc xuất trình mã xác thực nếu không quét được</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionQRCode;

/**
 * Để sử dụng trong EHR PDF Service:
 * 1. Cài đặt: npm install qrcode
 * 2. Import vào PDF generation
 * 3. Thêm QR code vào phần cuối prescription section
 */

