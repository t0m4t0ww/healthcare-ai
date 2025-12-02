// src/components/doctor/AttachmentUploader.jsx
import React, { useState } from 'react';
import { Upload, File, X, Image, FileText, AlertCircle } from 'lucide-react';
import api from '../../services/services';

const AttachmentUploader = ({ attachments, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      const uploadPromises = files.map(async (file) => {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} quá lớn (max 10MB)`);
        }

        // Upload file
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        return {
          id: Date.now() + Math.random(),
          filename: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: response.data.file_url || response.data.url,
          uploaded_at: new Date().toISOString(),
          description: ''
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      onChange([...attachments, ...uploadedFiles]);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.response?.data?.message || error.message || 'Lỗi upload file');
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset input
    }
  };

  const removeAttachment = (id) => {
    onChange(attachments.filter(att => att.id !== id));
  };

  const updateDescription = (id, description) => {
    onChange(attachments.map(att => 
      att.id === id ? { ...att, description } : att
    ));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return <Image size={20} className="text-blue-500" />;
    }
    return <FileText size={20} className="text-slate-500" />;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <Upload className="text-indigo-500" size={20} />
        File đính kèm
      </h3>

      {/* Upload Area */}
      <div className="mb-4">
        <label className="block w-full cursor-pointer">
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
            <Upload size={48} className="mx-auto text-slate-400 dark:text-slate-500 mb-3" />
            <p className="text-slate-700 dark:text-slate-300 font-medium mb-1">
              {uploading ? 'Đang tải lên...' : 'Nhấn để chọn file'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Hỗ trợ: JPG, PNG, PDF (tối đa 10MB)
            </p>
          </div>
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">
            <p className="font-medium">Lỗi upload:</p>
            <p>{uploadError}</p>
          </div>
        </div>
      )}

      {/* Uploaded Files List */}
      {attachments.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Đã tải lên ({attachments.length} file)
          </p>
          {attachments.map((file) => (
            <div
              key={file.id}
              className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 bg-slate-50 dark:bg-slate-700/50"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {getFileIcon(file.file_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {file.filename}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatFileSize(file.file_size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(file.id)}
                      className="text-red-500 hover:text-red-600 transition-colors flex-shrink-0"
                      title="Xóa file"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Description Input */}
                  <input
                    type="text"
                    placeholder="Mô tả file (ví dụ: X-quang phổi, kết quả xét nghiệm máu...)"
                    value={file.description || ''}
                    onChange={(e) => updateDescription(file.id, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  {/* Image Preview */}
                  {file.file_type.startsWith('image/') && file.file_url && (
                    <div className="mt-2">
                      <img
                        src={file.file_url}
                        alt={file.filename}
                        className="max-w-full h-auto max-h-48 rounded border border-slate-200 dark:border-slate-600"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
          Chưa có file đính kèm
        </div>
      )}

      {/* Info */}
      <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <AlertCircle size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">Lưu ý:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Upload kết quả xét nghiệm, X-quang, hoặc hình ảnh liên quan</li>
            <li>Thêm mô tả chi tiết cho từng file để dễ tra cứu sau này</li>
            <li>File sẽ được lưu trữ an toàn và mã hóa</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AttachmentUploader;