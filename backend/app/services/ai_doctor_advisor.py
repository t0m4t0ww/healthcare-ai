# backend/app/services/ai_doctor_advisor.py
"""
AI Advisor cho Bác sĩ (Medical Copilot)
- Tính cách: Chuyên nghiệp, khách quan, súc tích (No-nonsense).
- Chức năng: Chẩn đoán phân biệt, tra cứu Guideline, phân tích cận lâm sàng.
- Tích hợp: Sử dụng Model mạnh nhất để phân tích X-quang/MRI.
"""

from .gemini_service import (
    gemini_chat_streaming, 
    gemini_chat, 
    analyze_xray_with_context  # Hàm chuyên biệt từ service
)

# --- SYSTEM PROMPT: Trợ lý chuyên môn ---
DOCTOR_SYSTEM_PROMPT = """Bạn là Medical Copilot (Trợ lý Y khoa AI) hỗ trợ bác sĩ lâm sàng.
Đối tượng giao tiếp: Bác sĩ chuyên khoa.

PHONG CÁCH:
- Chuyên nghiệp, khách quan, súc tích.
- Sử dụng thuật ngữ y khoa chính xác (Medical Terminology).

QUY TẮC TRÌNH BÀY (BẮT BUỘC ĐỂ DỄ ĐỌC):
1. BỐ CỤC THOÁNG: Bắt buộc phải có 1 dòng trống giữa các mục lớn.
2. TIÊU ĐỀ MỤC: Viết IN HOA cho các tiêu đề (thay vì dùng **in đậm**).
3. DANH SÁCH:
   - Dùng số (1. 2.) cho các chẩn đoán hoặc bước xử trí chính.
   - Dùng dấu gạch ngang (-) cho các ý nhỏ.
   - Xuống dòng rõ ràng sau mỗi ý.
4. KHÔNG DÙNG MARKDOWN: Tuyệt đối không dùng ký tự ** (in đậm), * (nghiêng) hay ##.

VÍ DỤ TRÌNH BÀY MẪU:
"Dựa trên lâm sàng, em đề xuất:

CHẨN ĐOÁN PHÂN BIỆT:

1. Nhồi máu cơ tim cấp (STEMI):
- Khả năng cao do đau thắt ngực điển hình.
- Cần loại trừ ngay.

2. Viêm màng ngoài tim cấp:
- Đau tăng khi hít sâu.

ĐỀ XUẤT CẬN LÂM SÀNG:
- ECG 12 chuyển đạo (Cấp cứu).
- Troponin T hs (Stat).

HƯỚNG XỬ TRÍ BAN ĐẦU:
- Thở oxy nếu SpO2 < 90%.
- Thiết lập đường truyền tĩnh mạch."

YÊU CẦU NỘI DUNG:
- Chẩn đoán phân biệt: Xếp theo độ ưu tiên.
- Red Flags: Cảnh báo ngay dấu hiệu nguy hiểm.
- Điều trị: Theo Guideline mới nhất (BYT, AHA, ESC...).
"""

def _format_clinical_context(context: dict) -> str:
    """
    Format dữ liệu lâm sàng từ Frontend gửi xuống (Vital signs, Symptoms)
    """
    if not context: return ""
    
    lines = ["\n=== DỮ LIỆU LÂM SÀNG HIỆN TẠI ==="]
    
    # Sinh hiệu
    vitals = context.get("vitals", {})
    if vitals:
        v_str = []
        if vitals.get("bp"): v_str.append(f"HA: {vitals['bp']} mmHg")
        if vitals.get("hr"): v_str.append(f"Mạch: {vitals['hr']} l/p")
        if vitals.get("spo2"): v_str.append(f"SpO2: {vitals['spo2']}%")
        if vitals.get("temp"): v_str.append(f"Nhiệt: {vitals['temp']}°C")
        if v_str: lines.append(f"• Sinh hiệu: {', '.join(v_str)}")
    
    # Triệu chứng & Tiền sử
    if context.get("symptoms"): 
        lines.append(f"• Lý do khám/Triệu chứng: {context['symptoms']}")
    if context.get("history"): 
        lines.append(f"• Tiền sử: {context['history']}")
    if context.get("current_meds"): 
        lines.append(f"• Thuốc đang dùng: {context['current_meds']}")
        
    lines.append("==================================\n")
    return "\n".join(lines)

def advise_doctor(user_message: str, conversation_id: str, clinical_context: dict = None) -> str:
    """
    Hàm chat chính cho Bác sĩ.
    Args:
        clinical_context: Dict chứa thông tin phiên khám hiện tại (symptoms, vitals...)
    """
    # 1. Chuẩn bị System Prompt
    context_str = _format_clinical_context(clinical_context)
    full_system = DOCTOR_SYSTEM_PROMPT
    
    if context_str:
        full_system += f"\n{context_str}\n[YÊU CẦU: Biện luận dựa trên dữ liệu lâm sàng trên]"

    # 2. Streaming response
    return gemini_chat_streaming(
        conversation_id=conversation_id,
        user_prompt=user_message,
        system=full_system
    )

def analyze_xray(xray_findings: str, clinical_summary: str = "") -> str:
    """
    Phân tích X-quang chuyên sâu.
    Wrapper gọi xuống service để dùng Model mạnh nhất (Gemini 2.5 Pro / 1.5 Pro).
    """
    # Hàm này từ gemini_service đã được tối ưu để dùng model xịn nhất
    return analyze_xray_with_context(
        xray_findings=xray_findings, 
        patient_info=clinical_summary
    )

def get_doctor_suggestions(chat_history_text: str = "") -> list:
    """Gợi ý câu hỏi tiếp theo (Autocomplete cho bác sĩ)"""
    prompt = "Gợi ý 4 câu hỏi/yêu cầu ngắn gọn (thuật ngữ y khoa) mà bác sĩ nên hỏi tiếp. Trả về list text."
    if chat_history_text:
        prompt = f"Context hội thoại: {chat_history_text}\n{prompt}"
        
    try:
        res = gemini_chat(prompt, temperature=0.5) # Temp thấp để nghiêm túc hơn
        lines = [l.strip("- *") for l in res.split("\n") if l.strip()]
        valid = [l for l in lines if len(l) < 60]
        return valid[:4] if len(valid) >= 2 else ["Chẩn đoán phân biệt", "Phác đồ điều trị", "Tương tác thuốc", "Chỉ định cận lâm sàng"]
    except:
        return ["Chẩn đoán phân biệt", "Hướng xử trí", "Liều dùng thuốc", "Cận lâm sàng tiếp theo"]