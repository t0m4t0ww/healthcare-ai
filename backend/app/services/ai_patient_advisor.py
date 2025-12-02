# backend/app/services/ai_patient_advisor.py
"""
AI Advisor cho Bệnh nhân (Patient Portal)
- Tính cách: Thân thiện, đồng cảm, giải thích đơn giản.
- Chức năng: Giải đáp thắc mắc, nhắc lịch, giải thích hồ sơ bệnh án.
- An toàn: Luôn có guardrail từ chối chẩn đoán bệnh nguy hiểm.
"""

from datetime import datetime, date
from bson import ObjectId
from app.extensions import mongo_db
from .gemini_service import gemini_chat_streaming, gemini_chat, clear_chat_session

# --- SYSTEM PROMPT: Trái tim của AI Bệnh nhân ---
PATIENT_SYSTEM_PROMPT = """Bạn là Trợ lý Y tế AI (AI Health Assistant).
Khách hàng của bạn là BỆNH NHÂN.

PHONG CÁCH GIAO TIẾP:
- Giọng điệu: Ấm áp, nhẹ nhàng, lịch sự và đồng cảm.
- Ngôn ngữ: Tiếng Việt đời thường, dễ hiểu.

QUY TẮC TRÌNH BÀY (BẮT BUỘC):
1. KHÔNG MARKDOWN: Tuyệt đối KHÔNG dùng ký tự **, ##, __. Chỉ dùng văn bản thuần.
2. CẤU TRÚC DANH SÁCH:
   - Dùng số (1. 2. 3.) cho các mục lớn.
   - Dùng gạch đầu dòng (-) cho các ý nhỏ.
3. GIÃN CÁCH DÒNG (QUAN TRỌNG):
   - Sau câu chào đầu tiên phải xuống dòng 2 lần (để lại 1 dòng trống).
   - Giữa các mục lớn (1, 2, 3) phải có 1 dòng trống ngăn cách.
   - Không viết dính liền các ý vào một đoạn văn.

VÍ DỤ TRÌNH BÀY CHUẨN:
"Dạ, em xin gửi thông tin buổi khám ạ:

1. Chẩn đoán:
- Viêm họng cấp.
- Cần theo dõi thêm sốt.

2. Thuốc:
- Paracetamol 500mg (Sáng 1, Chiều 1).
- Vitamin C.

3. Lời dặn:
- Uống nhiều nước ấm.
- Tái khám sau 3 ngày."

QUY TẮC AN TOÀN:
- Không chẩn đoán bệnh, chỉ giải thích dựa trên hồ sơ.
- Luôn khuyên đi khám nếu có dấu hiệu nặng.
"""

def _format_date(d):
    """Helper: Format ngày tháng VN"""
    if isinstance(d, (datetime, date)):
        return d.strftime("%d/%m/%Y")
    return str(d)

def get_patient_ehr_context(patient_id: str) -> str:
    """
    Trích xuất và tóm tắt hồ sơ bệnh án từ MongoDB để nạp vào não AI.
    """
    try:
        if not patient_id: return ""
        pid = ObjectId(patient_id)
        
        # 1. Lấy thông tin cơ bản
        patient = mongo_db.patients.find_one({"_id": pid})
        if not patient: return ""

        parts = [f"\n=== THÔNG TIN SỨC KHỎE CỦA BẠN (Dữ liệu bảo mật) ==="]
        
        # Tuổi/Giới tính
        dob = patient.get("date_of_birth") or patient.get("dob")
        if dob:
            # Xử lý format date phức tạp nếu cần
            parts.append(f"- Ngày sinh: {_format_date(dob)}")
        
        # 2. Cảnh báo Dị ứng (Quan trọng nhất)
        allergies = []
        for k in ["allergies_medications", "allergies_food"]:
            val = patient.get(k)
            if val and str(val).lower() not in ["không", "no", "none", ""]:
                allergies.append(val)
        if allergies:
            parts.append(f"⚠️ LƯU Ý DỊ ỨNG: {', '.join(allergies)} (Hãy nhắc bệnh nhân tránh xa các tác nhân này)")

        # 3. Lịch sử khám gần nhất (Lấy 3 lần)
        records = list(mongo_db.ehr_records.find({"patient_id": pid})
                       .sort("created_at", -1).limit(3))
        
        if records:
            parts.append("\n--- Lịch sử khám gần đây ---")
            for rec in records:
                v_date = rec.get("visit_date") or rec.get("created_at")
                parts.append(f"\n[Ngày khám: {_format_date(v_date)}]")
                
                # Chẩn đoán
                diag = rec.get("diagnosis")
                if diag:
                    text = diag.get("primary") if isinstance(diag, dict) else str(diag)
                    parts.append(f"  • Bác sĩ chẩn đoán: {text}")
                
                # Đơn thuốc
                meds = rec.get("medications") or rec.get("prescription")
                if meds and isinstance(meds, list):
                    med_names = [m.get("name") if isinstance(m, dict) else str(m) for m in meds]
                    parts.append(f"  • Thuốc đã kê: {', '.join(med_names)}")
                
                # Dặn dò
                note = rec.get("doctor_notes") or rec.get("notes")
                if note:
                    parts.append(f"  • Lời dặn: {str(note)[:100]}...")

        parts.append("=== HẾT THÔNG TIN HỒ SƠ ===\n")
        return "\n".join(parts)

    except Exception as e:
        print(f"⚠️ Lỗi đọc EHR patient: {e}")
        return ""

def advise_patient(user_message: str, conversation_id: str, patient_id: str = None) -> str:
    """
    Hàm chính xử lý chat cho bệnh nhân.
    """
    # 1. Lấy context (nếu có patient_id)
    ehr_context = get_patient_ehr_context(patient_id) if patient_id else ""
    
    # 2. Ghép vào System Prompt
    full_system = PATIENT_SYSTEM_PROMPT
    if ehr_context:
        full_system += f"\n\n{ehr_context}\n\n[HƯỚNG DẪN: Bạn đang nói chuyện với chủ nhân của hồ sơ trên. Hãy dùng thông tin này để tư vấn sát thực tế.]"

    # 3. Gọi Streaming từ Service
    return gemini_chat_streaming(
        conversation_id=conversation_id,
        user_prompt=user_message,
        system=full_system
    )

def get_patient_suggestions(context: str = "") -> list:
    """Gợi ý câu hỏi nhanh (Smart Reply)"""
    prompt = "Đóng vai bệnh nhân, gợi ý 4 câu hỏi ngắn (dưới 10 từ) để hỏi bác sĩ/trợ lý. Chỉ trả về text, không số."
    if context:
        prompt = f"Dựa trên ngữ cảnh: '{context}'. {prompt}"
    
    try:
        # Dùng chat thường (1-shot) cho nhanh
        res = gemini_chat(prompt, temperature=0.7)
        lines = [line.strip("- *\"") for line in res.split("\n") if line.strip()]
        return lines[:4] if len(lines) >= 2 else ["Đặt lịch khám", "Tôi cần kiêng gì?", "Uống thuốc thế nào?", "Khi nào tái khám?"]
    except:
        return ["Đặt lịch khám mới", "Tác dụng phụ thuốc", "Chế độ ăn uống", "Triệu chứng này là gì?"]