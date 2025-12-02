# backend/app/routes/chat_ai.py
"""
AI Chat Routes - RESTful Endpoints
- /chat/ai: Chat chính (dành cho Patient & General use).
- /chat/doctor-advisor: Chat chuyên sâu (dành cho Doctor Copilot).
"""

from flask import Blueprint, request, g, jsonify
from datetime import datetime
from bson import ObjectId

from app.extensions import mongo_db, socketio
from app.utils.responses import success, fail
from app.utils.rate_limiter import limiter, RATE_LIMITS
from app.middlewares.auth import auth_required
from app.services.gemini_service import clear_chat_session

# Import các services AI đã tối ưu
from app.services.ai_patient_advisor import advise_patient
from app.services.ai_doctor_advisor import advise_doctor, get_doctor_suggestions

chat_ai_bp = Blueprint("chat_ai", __name__)

# ==========================================
# HELPER: Resolve Patient ID
# ==========================================
def _resolve_patient_id(user_claims, conv):
    """
    Logic thông minh để tìm patient_id từ token hoặc conversation.
    Dùng để nạp hồ sơ bệnh án (EHR) cho AI.
    """
    # 1. Nếu user là Patient -> Lấy ID của chính họ
    if user_claims.get("role") == "patient":
        # Ưu tiên lấy từ claim (nếu login bằng patient account)
        if user_claims.get("patient_id"):
            return str(user_claims["patient_id"])
        
        # Nếu login bằng user account, query ngược lại patient profile
        uid = user_claims.get("user_id") or user_claims.get("sub")
        if uid:
            p = mongo_db.patients.find_one({"user_id": ObjectId(uid)})
            if p: return str(p["_id"])

    # 2. Nếu conversation đã gắn sẵn patient_id (Chat 1-1 cũ)
    if conv.get("patient_id"):
        return str(conv["patient_id"])
    
    return None

# ==========================================
# ROUTE 1: General AI Chat (Patient Focus)
# ==========================================
@chat_ai_bp.route("/chat/ai", methods=["POST"])
@auth_required()
@limiter.limit(RATE_LIMITS["ai_chat"]) # 10 req/min
def chat_with_ai():
    """
    Endpoint chat AI chính.
    - Patient: Tư vấn sức khỏe, giải thích hồ sơ.
    - Doctor: Chat chung (tuy nhiên nên dùng route advisor riêng).
    """
    try:
        user = g.current_user
        user_role = (user.get("role") or "").lower()
        uid = user.get("user_id")

        # 1. Parse Request
        data = request.get_json(silent=True) or {}
        conv_id = data.get("conv_id") or data.get("conversation_id")
        content = data.get("content") or data.get("message") or data.get("text")
        is_new_session = data.get("is_new_session", False)

        if not conv_id:
            return fail("Thiếu conversation_id", 400)
        if not content:
            return fail("Nội dung tin nhắn không được để trống", 400)

        # 2. Validate Conversation
        try:
            conv_oid = ObjectId(conv_id)
        except:
            return fail("conversation_id không hợp lệ", 400)

        conv = mongo_db.conversations.find_one({"_id": conv_oid})
        if not conv:
            return fail("Không tìm thấy cuộc trò chuyện", 404)
        
        # 3. Session Management (Reset context nếu cần)
        if is_new_session:
            clear_chat_session(conv_id)
            print(f"🧹 Cleared AI session for: {conv_id}")

        # 4. Xác định Context & Gọi AI
        ai_response_text = ""
        
        if user_role == "patient":
            # Tự động tìm patient_id để nạp EHR
            pid = _resolve_patient_id(user, conv)
            print(f"🤖 AI Patient Advisor | PID: {pid} | Msg: {content[:30]}...")
            
            ai_response_text = advise_patient(
                user_message=content,
                conversation_id=str(conv_oid),
                patient_id=pid
            )
        else:
            # Fallback cho các role khác (Doctor/Admin chat chơi)
            # Doctor nên dùng route /doctor-advisor để xịn hơn
            from app.services.gemini_service import gemini_chat_streaming
            ai_response_text = gemini_chat_streaming(str(conv_oid), content)

        # 5. Lưu tin nhắn vào DB (User + AI)
        now = datetime.utcnow()
        
        # Save User Message
        user_msg = {
            "conversation_id": conv_oid,
            "sender": user_role,
            "text": content.strip(),
            "created_at": now,
            "is_read": True
        }
        mongo_db.messages.insert_one(user_msg)

        # Save AI Response
        ai_msg = {
            "conversation_id": conv_oid,
            "sender": "ai",
            "text": ai_response_text,
            "created_at": now,
            "is_read": True
        }
        res_ins = mongo_db.messages.insert_one(ai_msg)

        # Update Conversation Metadata
        mongo_db.conversations.update_one(
            {"_id": conv_oid},
            {"$set": {"updated_at": now, "last_message": ai_response_text[:100]}}
        )

        # 6. Emit Socket.IO (Realtime update UI)
        room = f"room:{str(conv_oid)}"
        
        # Emit User msg (để UI sync nếu cần)
        socketio.emit("receive_message", {
            **user_msg, 
            "_id": str(user_msg.get("_id", "")), # Jsonify ObjectId
            "created_at": now.isoformat() + "Z",
            "conversation_id": str(conv_oid)
        }, room=room)
        
        # Emit AI msg
        ai_payload = {
            "message_id": str(res_ins.inserted_id),
            "conversation_id": str(conv_oid),
            "sender": "ai",
            "text": ai_response_text,
            "timestamp": now.isoformat() + "Z",
            "created_at": now.isoformat() + "Z"
        }
        socketio.emit("receive_message", ai_payload, room=room)

        return success(data=ai_payload, status_code=201)

    except Exception as e:
        print(f"❌ AI Chat Error: {e}")
        return fail(f"Lỗi xử lý AI: {str(e)}", 500)


# ==========================================
# ROUTE 2: Doctor Advisor (Specialized)
# ==========================================
@chat_ai_bp.route("/chat/doctor-advisor", methods=["POST"])
@auth_required(roles=["doctor"])
@limiter.limit(RATE_LIMITS["doctor_advisor"]) # 10 req/min
def doctor_advisor_chat():
    """
    Chat dành riêng cho Bác sĩ (Medical Copilot).
    Hỗ trợ nạp context lâm sàng (triệu chứng, sinh hiệu) để chẩn đoán.
    """
    try:
        # 1. Parse Request
        data = request.get_json(silent=True) or {}
        message = data.get("message") or data.get("content") or data.get("text")
        conv_id = data.get("conversation_id") or str(ObjectId()) # Optional, gen new if missing
        
        # Context lâm sàng từ Frontend gửi xuống
        # Mapping frontend keys -> backend expected keys
        raw_context = data.get("patient_context", {})
        clinical_context = {
            "symptoms": raw_context.get("symptoms"),
            "vitals": raw_context.get("vitals"),         # e.g. {bp: "120/80", ...}
            "history": raw_context.get("medical_history"),
            "current_meds": raw_context.get("medications")
        }

        if not message:
            return fail("Nội dung câu hỏi không được trống", 400)

        # 2. Gọi AI Doctor Advisor Service
        print(f"🩺 Doctor Advisor | Msg: {message[:30]}...")
        
        ai_response = advise_doctor(
            user_message=message,
            conversation_id=conv_id,
            clinical_context=clinical_context 
        )

        # 3. Generate Suggestions (Gợi ý câu hỏi tiếp theo)
        # Kết hợp câu hỏi cũ + trả lời mới để AI gợi ý thông minh
        full_context_for_suggestion = f"Q: {message}\nA: {ai_response}"
        suggestions = get_doctor_suggestions(full_context_for_suggestion)

        # 4. Return JSON (Không cần save DB conversation nếu chỉ là tool tra cứu nhanh)
        # Nếu muốn lưu lịch sử tra cứu, bạn có thể thêm logic insert DB ở đây giống route trên.
        
        return success(data={
            "conversation_id": conv_id,
            "response": ai_response,
            "suggestions": suggestions
        })

    except Exception as e:
        print(f"❌ Doctor Advisor Error: {e}")
        return fail(f"Lỗi trợ lý bác sĩ: {str(e)}", 500)