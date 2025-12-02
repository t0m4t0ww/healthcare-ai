// 
import React, { useCallback, useState } from "react";
import { 
  Upload, Image as ImageIcon, Brain, Activity, AlertTriangle, 
  CheckCircle, Clock, Download, Zap, Eye, RotateCw, Trash2
} from "lucide-react";
import { predictXray } from "../../services/services";
import { toast } from "react-toastify";
import { useNotifications } from "../../context/NotificationContext";

const API_HOST = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function XrayResultsPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [patientName, setPatientName] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const { notify } = useNotifications?.() || { notify: () => {} };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setFile(droppedFile);
      setResult(null);
      setPreview(URL.createObjectURL(droppedFile));
    } else {
      toast.warn("Vui lòng chọn file ảnh hợp lệ");
    }
  };

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setPreview(URL.createObjectURL(f));
  };

  const onSubmit = useCallback(async () => {
    if (!file) {
      toast.info("Chọn ảnh X-quang trước đã");
      return;
    }
    setLoading(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      // Simulate upload progress (AI processing simulation)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const data = await predictXray(file, patientName || undefined, {
        conf: 0.25,
        iou: 0.45,
        imgsz: 640,
        device: "cpu",
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setResult(data);

      const top = data?.top;
      toast.success("Đã phân tích X-quang phổi");
      notify({
        title: "X-quang",
        message: `Đã phân tích X-quang phổi${
          patientName ? ` cho ${patientName}` : ""
        }${top ? `: ${top.label} · ${(top.prob * 100).toFixed(1)}%` : ""}`,
        type: "success",
      });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || "Gọi mô hình thất bại";
      console.error("Xray error:", e?.response?.data || e);
      setError(msg);
      toast.error(msg);
      notify({ title: "Lỗi", message: msg, type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [file, patientName, notify]);

  const clearAll = () => {
    setFile(null);
    setPreview("");
    setResult(null);
    setPatientName("");
    setError(null);
    setUploadProgress(0);
  };

  const getConfidenceColor = (prob) => {
    if (prob >= 0.8) return "text-emerald-500";
    if (prob >= 0.6) return "text-yellow-500";
    return "text-rose-500";
  };

  const getConfidenceBadge = (prob) => {
    if (prob >= 0.8) return "badge-success";
    if (prob >= 0.6) return "badge-warning";
    return "badge-error";
  };

  // Build absolute URL nếu BE trả relative
  const annotatedUrl =
    result?.annotated_image_url
      ? result.annotated_image_url.startsWith("http")
        ? result.annotated_image_url
        : `${API_HOST}${result.annotated_image_url}`
      : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-4">
          Chẩn đoán X-quang phổi
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Sử dụng AI để phân tích và phát hiện bất thường trên ảnh X-quang phổi với độ chính xác cao
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          {/* Patient Info */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Brain size={20} className="text-emerald-500" />
              Thông tin bệnh nhân
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tên bệnh nhân (tùy chọn)
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Upload size={20} className="text-emerald-500" />
              Tải ảnh X-quang
            </h2>
            
            <div 
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                dragActive 
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" 
                  : "border-slate-300 dark:border-slate-600 hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                onChange={onPick}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-full flex items-center justify-center">
                  <ImageIcon size={28} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                    {dragActive ? "Thả ảnh vào đây" : "Kéo thả ảnh X-quang hoặc"}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Hỗ trợ JPG, PNG, JPEG - Tối đa 10MB
                  </p>
                </div>
                <button className="btn btn-primary gap-2">
                  <Upload size={16} />
                  Chọn ảnh từ máy
                </button>
              </div>
            </div>

            {/* Preview */}
            {preview && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Xem trước</h3>
                  <button 
                    onClick={clearAll}
                    className="btn btn-ghost btn-sm gap-1 text-rose-500 hover:text-rose-600"
                  >
                    <Trash2 size={14} />
                    Xóa
                  </button>
                </div>
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img 
                    src={preview} 
                    alt="preview" 
                    className="w-full max-h-64 object-contain bg-slate-50 dark:bg-slate-700"
                  />
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {loading && uploadProgress > 0 && (
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    {uploadProgress < 100 ? 'Đang xử lý...' : 'Hoàn tất!'}
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && !loading && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                      Lỗi xử lý
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-6">
              <button 
                className="btn btn-primary flex-1 gap-2" 
                onClick={onSubmit} 
                disabled={!file || loading}
              >
                {loading ? (
                  <>
                    <RotateCw size={16} className="animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    Phân tích AI
                  </>
                )}
              </button>
              <button 
                className="btn btn-ghost gap-2" 
                onClick={clearAll} 
                disabled={!file && !result}
              >
                <Trash2 size={16} />
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {!result ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center mb-4">
                <Activity size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                Chưa có kết quả
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Tải lên ảnh X-quang và nhấn "Phân tích AI" để xem kết quả
              </p>
            </div>
          ) : (
            <>
              {/* Top Disclaimer - Always visible with results */}
              <div className="bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-amber-900/20 border-2 border-red-400 dark:border-red-700 rounded-2xl p-5 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center animate-pulse">
                      <AlertTriangle size={24} className="text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-2">
                      ⚠️ Kết quả AI chỉ mang tính tham khảo
                    </h3>
                    <div className="space-y-2 text-sm text-red-800 dark:text-red-200">
                      <p className="flex items-start gap-2">
                        <span className="text-red-600 font-bold mt-0.5">•</span>
                        <span><strong>KHÔNG thay thế</strong> chẩn đoán chính thức của bác sĩ chuyên khoa X-quang</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="text-red-600 font-bold mt-0.5">•</span>
                        <span><strong>BẮT BUỘC</strong> xác nhận với bác sĩ chuyên khoa trước khi ra quyết định điều trị</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="text-red-600 font-bold mt-0.5">•</span>
                        <span>AI có thể có <strong>sai sót</strong> - Luôn ưu tiên đánh giá lâm sàng</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <CheckCircle size={20} className="text-emerald-500" />
                      Kết quả chẩn đoán
                    </h2>
                    {patientName && (
                      <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Bệnh nhân: <span className="font-medium">{patientName}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Thời gian</div>
                    <div className="font-medium text-slate-700 dark:text-slate-300">
                      {new Date().toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>

                {/* Top prediction */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Chẩn đoán chính (Confidence cao nhất)
                    </span>
                    <span className={`badge ${getConfidenceBadge(result.top?.prob || 0)} gap-1`}>
                      <Activity size={12} />
                      {result.top?.prob ? (result.top.prob * 100).toFixed(1) : "0"}%
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {result.top?.label || "Không xác định"}
                  </div>
                </div>
              </div>

              {/* All Predictions */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Brain size={18} className="text-emerald-500" />
                  Chi tiết phân tích
                </h3>

                <div className="space-y-3">
                  {(result.predictions || []).map((p, i) => (
                    <div 
                      key={p.id ?? `${p.label}-${i}-${(p.box || []).join("_")}`}
                      className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {i + 1}. {p.label}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${getConfidenceColor(p.prob)}`}>
                            {(p.prob * 100).toFixed(1)}%
                          </span>
                          <span className={`badge badge-sm ${getConfidenceBadge(p.prob)}`}>
                            {p.prob >= 0.8 ? 'Cao' : p.prob >= 0.6 ? 'Trung bình' : 'Thấp'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.round(p.prob * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Annotated Image */}
              {annotatedUrl && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Eye size={18} className="text-emerald-500" />
                      Ảnh đã đánh dấu vùng bất thường
                    </h3>
                    <a
                      href={annotatedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost btn-sm gap-2"
                    >
                      <Download size={14} />
                      Tải xuống
                    </a>
                  </div>
                  
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img
                      src={annotatedUrl}
                      alt="Ảnh X-quang đã phân tích"
                      className="w-full object-contain bg-slate-50 dark:bg-slate-700"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        e.currentTarget.alt = "Không tải được ảnh annotated";
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Bottom Disclaimer - Repeated for emphasis */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-400 dark:border-amber-700 rounded-2xl p-5 shadow-md">
                <div className="flex items-start gap-4">
                  <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-amber-900 dark:text-amber-100 mb-2">
                      📋 Quy trình khuyến nghị
                    </h4>
                    <ol className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-amber-600">1.</span>
                        <span>Sử dụng kết quả AI như một <strong>công cụ sàng lọc ban đầu</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-amber-600">2.</span>
                        <span><strong>Luôn xác nhận</strong> với bác sĩ chuyên khoa X-quang trước khi đưa ra chẩn đoán</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-amber-600">3.</span>
                        <span>Kết hợp với <strong>khám lâm sàng</strong> và các xét nghiệm khác nếu cần</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-red-600">⚠️</span>
                        <span className="font-semibold">Không ra quyết định điều trị chỉ dựa trên kết quả AI</span>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}