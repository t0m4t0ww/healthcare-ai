# backend/app/routes/chat_suggestions.py
"""
AI Suggestions Routes
Endpoint để lấy gợi ý câu hỏi từ AI
"""

from flask import Blueprint, request, g
import re

from app.utils.responses import ok
from app.middlewares.auth import auth_required
from app.services.ai_patient_advisor import get_patient_suggestions
from app.services.ai_doctor_advisor import get_doctor_suggestions

chat_suggestions_bp = Blueprint("chat_suggestions", __name__)


@chat_suggestions_bp.post("/chat/suggestions")
@auth_required()
def get_ai_suggestions():
    """
    Generate contextual AI suggestions based on user role
    POST /api/chat/suggestions
    
    Body: {
        "messages": [...],  // Recent messages for context (optional)
        "conversation_id": "..." // (optional)
    }
    
    Response: {
        "suggestions": ["...", "...", "...", "..."],
        "context_used": true/false,
        "role": "patient" | "doctor"
    }
    """
    user_claims = g.current_user
    user_role = user_claims.get("role", "").lower()
    
    try:
        b = request.get_json(silent=True) or {}
        conversation_messages = b.get("messages", [])
        
        # Build context from recent messages
        context_text = ""
        if conversation_messages and len(conversation_messages) > 0:
            context_lines = []
            for msg in conversation_messages[-3:]:  # Last 3 messages only
                role = msg.get("role", "")
                text = msg.get("text", "").strip()
                if text and len(text) > 5:  # Skip very short messages
                    role_label = "Bác sĩ" if role == "doctor" else "Bệnh nhân" if role == "patient" else "AI"
                    context_lines.append(f"{role_label}: {text}")
            context_text = "\n".join(context_lines) if context_lines else ""
        
        print(f"🎯 Getting suggestions for {user_role} | Context: {len(context_text)} chars")
        
        # Get suggestions based on role
        if user_role == "patient":
            suggestions = get_patient_suggestions(context_text)
        elif user_role == "doctor":
            suggestions = get_doctor_suggestions(context_text)
        else:
            # Default fallback
            suggestions = [
                "Tôi cần hỗ trợ",
                "Hướng dẫn sử dụng hệ thống",
                "Liên hệ bộ phận hỗ trợ",
                "Câu hỏi thường gặp"
            ]
        
        print(f"✅ Generated {len(suggestions)} suggestions")
        
        return ok({
            "suggestions": suggestions,
            "context_used": bool(context_text),
            "role": user_role
        })
        
    except Exception as e:
        print(f"❌ Error generating AI suggestions: {e}")
        import traceback
        traceback.print_exc()
        
        # Return fallback suggestions on error
        fallback = get_fallback_suggestions(user_role)
        return ok({
            "suggestions": fallback,
            "context_used": False,
            "error": "Used fallback suggestions"
        })


def get_fallback_suggestions(user_role: str) -> list:
    """
    High-quality fallback suggestions when AI fails
    
    Args:
        user_role: "patient" or "doctor"
        
    Returns:
        List of 4 fallback suggestions
    """
    if user_role == "patient":
        return [
            "Tôi cần đặt lịch khám bệnh",
            "Thuốc này có tác dụng phụ gì không",
            "Triệu chứng này có nghiêm trọng không",
            "Kết quả xét nghiệm của tôi như thế nào"
        ]
    elif user_role == "doctor":
        return [
            "Chẩn đoán phân biệt cho triệu chứng này",
            "Xét nghiệm nào cần chỉ định",
            "Phác đồ điều trị theo guideline",
            "Khi nào cần chuyển tuyến trên"
        ]
    else:
        return [
            "Tôi cần hỗ trợ",
            "Hướng dẫn sử dụng",
            "Liên hệ hỗ trợ",
            "Câu hỏi thường gặp"
        ]
